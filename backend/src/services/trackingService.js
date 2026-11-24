import { ConflictError, ForbiddenError, NotFoundError, ServiceUnavailableError, ValidationError } from "../domain/errors.js";
import { auditBus } from "../domain/eventBus.js";
import { ShipmentStateMachine } from "../domain/shipmentState.js";
import { isFeatureEnabled, withReadClient, withWriteTx } from "../infra/db.js";
import { IdempotencyService } from "./idempotencyService.js";

const dashboardCache = new Map();

function applyActorScope(where, params, actor, scope = null) {
  if (!actor) return;
  if (actor.role === "kurir") {
    params.push(actor.id);
    const idx = params.length;
    if (scope === "mine") {
      where.push(`sa.courier_id = $${idx}`);
    } else {
      where.push(`(sa.courier_id = $${idx} OR (s.current_status = 'BOOKED' AND sa.id IS NULL))`);
    }
    return;
  }
  if ((actor.role === "operator" || actor.role === "supervisor") && actor.hub_id) {
    params.push(actor.hub_id);
    const idx = params.length;
    where.push(
      `(s.origin_hub_id = $${idx} OR s.dest_hub_id = $${idx} OR sa.hub_id = $${idx} OR EXISTS (SELECT 1 FROM tracking_events te WHERE te.shipment_code = s.code AND te.hub_id = $${idx}))`
    );
  }
}

export class TrackingService {
  static async addEvent(input, actor, idempotencyKey = null) {
    const endpoint = "POST /api/events";
    const reqHash = IdempotencyService.hashBody(input);

    return withWriteTx(async (client) => {
      const existing = await IdempotencyService.findExisting(client, idempotencyKey, endpoint, reqHash);
      if (existing) return existing.body;

      if (!(await isFeatureEnabled(client, "checkpoint_write"))) {
        throw new ServiceUnavailableError(
          "Input checkpoint sedang dinonaktifkan sementara (Mode Pemeliharaan).",
          30
        );
      }

      // Row-level lock across all API nodes (prevents race condition & status regression)
      const shipRes = await client.query(
        `SELECT code, current_status, current_location, origin_hub_id, version
         FROM shipments
         WHERE code = $1 AND deleted_at IS NULL
         FOR UPDATE`,
        [input.shipment_code]
      );
      if (!shipRes.rows.length) {
        throw new NotFoundError(`Resi '${input.shipment_code}' tidak ditemukan. Buat pesanan terlebih dahulu.`);
      }
      const ship = shipRes.rows[0];

      if (input.expected_version !== undefined && Number(input.expected_version) !== Number(ship.version)) {
        throw new ConflictError(
          `Versi paket sudah berubah (diharapkan ${input.expected_version}, saat ini ${ship.version}). Muat ulang data.`
        );
      }

      const assignRes = await client.query(
        `SELECT sa.id, sa.courier_id, u.full_name AS courier_name, u.employee_code AS courier_code
         FROM shipment_assignments sa
         LEFT JOIN users u ON u.id = sa.courier_id
         WHERE sa.shipment_code = $1 AND sa.is_active = TRUE
         LIMIT 1`,
        [ship.code]
      );
      const activeAssign = assignRes.rows[0] || null;

      if (actor.role === "kurir") {
        if (activeAssign && Number(activeAssign.courier_id) !== Number(actor.id)) {
          throw new ForbiddenError(
            `Resi ${ship.code} sedang ditugaskan kepada kurir lain (${activeAssign.courier_name || activeAssign.courier_code || "Kurir"}).`
          );
        }
        if (!activeAssign && ship.current_status === "BOOKED" && input.status === "DITERIMA") {
          const claimHubId = input.hub_id ?? actor.hub_id ?? ship.origin_hub_id ?? null;
          await client.query(
            `INSERT INTO shipment_assignments (shipment_code, courier_id, hub_id, assigned_by, is_active)
             VALUES ($1, $2, $3, $2, TRUE)`,
            [ship.code, actor.id, claimHubId]
          );
          await auditBus.publish(client, {
            actorId: actor.id,
            action: "SHIPMENT_COURIER_AUTO_CLAIMED",
            targetType: "shipment",
            targetId: ship.code,
            beforeData: null,
            afterData: { courier_id: actor.id, courier_code: actor.employee_code, hub_id: claimHubId },
          });
        }
      }

      const requiresProof = ShipmentStateMachine.validate(ship.current_status, input.status, actor.role);

      let proofStatus = "NONE";
      if (input.proof_object_key) {
        proofStatus = "VERIFIED";
      } else if (requiresProof) {
        proofStatus = "PENDING";
      }

      const updRes = await client.query(
        `UPDATE shipments
         SET current_status = $1, current_location = $2, version = version + 1, updated_at = clock_timestamp()
         WHERE code = $3
         RETURNING version, updated_at`,
        [input.status, input.location.trim(), ship.code]
      );

      const evRes = await client.query(
        `INSERT INTO tracking_events (shipment_code, status, location, actor_id, hub_id, proof_status, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, shipment_code, status, location, proof_status, recorded_at`,
        [
          ship.code,
          input.status,
          input.location.trim(),
          actor.id,
          input.hub_id ?? actor.hub_id ?? null,
          proofStatus,
          input.notes || null,
        ]
      );
      const ev = evRes.rows[0];

      if (input.proof_object_key) {
        await client.query(
          "UPDATE proofs SET event_id = $1 WHERE object_key = $2 AND shipment_code = $3",
          [ev.id, input.proof_object_key, ship.code]
        );
      }

      await auditBus.publish(client, {
        actorId: actor.id,
        action: "SHIPMENT_STATUS_UPDATED",
        targetType: "shipment",
        targetId: ship.code,
        beforeData: { status: ship.current_status, location: ship.current_location, version: ship.version },
        afterData: { status: input.status, location: input.location.trim(), version: updRes.rows[0].version },
      });

      const responseBody = {
        ...ev,
        version: updRes.rows[0].version,
      };
      await IdempotencyService.save(client, idempotencyKey, actor.id, endpoint, reqHash, 201, responseBody);
      dashboardCache.clear();
      return responseBody;
    });
  }

  static async listShipments(
    {
      limit = 50,
      status = null,
      q = null,
      courierId = null,
      hubId = null,
      scope = null,
      cursorUpdatedAt = null,
      cursorCode = null,
    },
    actor = null
  ) {
    const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);

    return withReadClient(async (client) => {
      const where = ["s.deleted_at IS NULL"];
      const params = [];

      applyActorScope(where, params, actor, scope);

      if (status) {
        params.push(status);
        where.push(`s.current_status = $${params.length}`);
      }
      if (q) {
        params.push(`%${q.trim()}%`);
        where.push(
          `(s.code ILIKE $${params.length} OR s.current_location ILIKE $${params.length} OR COALESCE(cu.full_name, '') ILIKE $${params.length} OR COALESCE(cu.employee_code, '') ILIKE $${params.length})`
        );
      }
      if (courierId === "unassigned") {
        where.push("sa.id IS NULL");
      } else if (courierId && Number.isInteger(Number(courierId)) && Number(courierId) > 0) {
        params.push(Number(courierId));
        where.push(`sa.courier_id = $${params.length}`);
      }
      if (hubId && Number.isInteger(Number(hubId)) && Number(hubId) > 0) {
        params.push(Number(hubId));
        const idx = params.length;
        where.push(`(s.origin_hub_id = $${idx} OR s.dest_hub_id = $${idx} OR sa.hub_id = $${idx})`);
      }

      const baseJoins = `
        FROM shipments s
        LEFT JOIN hubs oh ON oh.id = s.origin_hub_id
        LEFT JOIN hubs dh ON dh.id = s.dest_hub_id
        LEFT JOIN shipment_assignments sa ON sa.shipment_code = s.code AND sa.is_active = TRUE
        LEFT JOIN users cu ON cu.id = sa.courier_id
        LEFT JOIN hubs sah ON sah.id = sa.hub_id
      `;

      const countRes = await client.query(
        `SELECT count(*)::int AS total ${baseJoins} WHERE ${where.join(" AND ")}`,
        params
      );

      if (cursorUpdatedAt && cursorCode) {
        params.push(cursorUpdatedAt, cursorCode);
        where.push(`(s.updated_at, s.code) < ($${params.length - 1}::timestamptz, $${params.length})`);
      }

      params.push(safeLimit);
      const rowsRes = await client.query(
        `SELECT s.code, s.current_status, s.current_location, s.service_code, s.package_type,
                s.total_cost, s.payment_status, s.channel, s.version, s.updated_at,
                s.origin_hub_id, oh.code AS origin_hub_code, oh.name AS origin_hub_name,
                s.dest_hub_id, dh.code AS dest_hub_code, dh.name AS dest_hub_name,
                sa.courier_id AS assigned_courier_id,
                cu.employee_code AS assigned_courier_code,
                cu.full_name AS assigned_courier_name,
                sa.assigned_at,
                sah.code AS assigned_hub_code,
                sah.name AS assigned_hub_name,
                le.actor_id AS last_actor_id,
                le.actor_name AS last_actor_name,
                le.actor_code AS last_actor_code,
                le.actor_role AS last_actor_role,
                le.hub_code AS last_hub_code,
                le.hub_name AS last_hub_name,
                (SELECT count(*)::int FROM tracking_events t WHERE t.shipment_code = s.code) AS total_events
         ${baseJoins}
         LEFT JOIN LATERAL (
           SELECT te.actor_id, te.hub_id, u.full_name AS actor_name, u.employee_code AS actor_code,
                  u.role AS actor_role, h.code AS hub_code, h.name AS hub_name
           FROM tracking_events te
           LEFT JOIN users u ON u.id = te.actor_id
           LEFT JOIN hubs h ON h.id = te.hub_id
           WHERE te.shipment_code = s.code
           ORDER BY te.id DESC
           LIMIT 1
         ) le ON TRUE
         WHERE ${where.join(" AND ")}
         ORDER BY s.updated_at DESC, s.code DESC
         LIMIT $${params.length}`,
        params
      );

      const items = rowsRes.rows;
      const last = items[items.length - 1];
      return {
        total_count: countRes.rows[0].total,
        limit: safeLimit,
        next_cursor:
          items.length === safeLimit && last
            ? { updated_at: last.updated_at, code: last.code }
            : null,
        items,
      };
    });
  }

  static async listCouriers(actor = null) {
    return withReadClient(async (client) => {
      const res = await client.query(
        `SELECT u.id, u.employee_code, u.full_name, u.phone, u.station, u.hub_id,
                h.code AS hub_code, h.name AS hub_name,
                (SELECT count(*)::int
                 FROM shipment_assignments sa
                 JOIN shipments s ON s.code = sa.shipment_code
                 WHERE sa.courier_id = u.id
                   AND sa.is_active = TRUE
                   AND s.deleted_at IS NULL
                   AND s.current_status NOT IN ('SELESAI', 'BATAL', 'RETUR')
                ) AS active_shipments
         FROM users u
         LEFT JOIN hubs h ON h.id = u.hub_id
         WHERE u.role = 'kurir' AND u.is_active = TRUE
         ORDER BY (CASE WHEN $1::int IS NOT NULL AND u.hub_id = $1::int THEN 0 ELSE 1 END),
                  u.full_name ASC`,
        [actor?.hub_id ?? null]
      );
      return res.rows;
    });
  }

  static async assignCourier(code, { courier_id = null, hub_id = null }, actor) {
    const cleanCode = String(code || "").trim().toUpperCase();
    return withWriteTx(async (client) => {
      const shipRes = await client.query(
        `SELECT code, current_status, origin_hub_id
         FROM shipments
         WHERE code = $1 AND deleted_at IS NULL
         FOR UPDATE`,
        [cleanCode]
      );
      if (!shipRes.rows.length) {
        throw new NotFoundError(`Resi '${cleanCode}' tidak ditemukan.`);
      }
      const ship = shipRes.rows[0];

      const prevRes = await client.query(
        `SELECT courier_id FROM shipment_assignments WHERE shipment_code = $1 AND is_active = TRUE LIMIT 1`,
        [cleanCode]
      );
      const prevCourierId = prevRes.rows[0]?.courier_id ?? null;

      let courier = null;
      if (courier_id !== null && courier_id !== undefined && courier_id !== "") {
        const cid = Number(courier_id);
        if (!Number.isInteger(cid) || cid <= 0) {
          throw new ValidationError("ID kurir tidak valid.");
        }
        const cRes = await client.query(
          `SELECT id, employee_code, full_name, role, hub_id, is_active
           FROM users WHERE id = $1`,
          [cid]
        );
        if (!cRes.rows.length || cRes.rows[0].role !== "kurir" || !cRes.rows[0].is_active) {
          throw new ValidationError("Kurir tidak ditemukan atau tidak aktif.");
        }
        courier = cRes.rows[0];
      }

      await client.query(
        `UPDATE shipment_assignments
         SET is_active = FALSE, unassigned_at = clock_timestamp()
         WHERE shipment_code = $1 AND is_active = TRUE`,
        [cleanCode]
      );

      let assigned = null;
      if (courier) {
        const resolvedHubId = hub_id ? Number(hub_id) : courier.hub_id ?? actor.hub_id ?? ship.origin_hub_id ?? null;
        const ins = await client.query(
          `INSERT INTO shipment_assignments (shipment_code, courier_id, hub_id, assigned_by, is_active)
           VALUES ($1, $2, $3, $4, TRUE)
           RETURNING id, shipment_code, courier_id, hub_id, assigned_by, assigned_at`,
          [cleanCode, courier.id, resolvedHubId, actor.id]
        );
        assigned = {
          ...ins.rows[0],
          courier_code: courier.employee_code,
          courier_name: courier.full_name,
        };
      }

      await auditBus.publish(client, {
        actorId: actor.id,
        action: courier ? "SHIPMENT_COURIER_ASSIGNED" : "SHIPMENT_COURIER_UNASSIGNED",
        targetType: "shipment",
        targetId: cleanCode,
        beforeData: { courier_id: prevCourierId },
        afterData: {
          courier_id: courier ? courier.id : null,
          courier_code: courier ? courier.employee_code : null,
        },
      });

      dashboardCache.clear();
      return {
        shipment_code: cleanCode,
        assigned,
      };
    });
  }

  static async getPublicTracking(code, user = null) {
    return withReadClient(async (client) => {
      if (!user) {
        if (!(await isFeatureEnabled(client, "public_tracking"))) {
          throw new ServiceUnavailableError("Layanan pelacakan publik sedang dinonaktifkan sementara.", 30);
        }
      }

      const shipRes = await client.query(
        "SELECT * FROM public_tracking_view WHERE code = $1",
        [code]
      );
      if (!shipRes.rows.length) {
        throw new NotFoundError("Nomor resi tidak ditemukan");
      }

      let shipment = shipRes.rows[0];

      if (user) {
        const metaRes = await client.query(
          `SELECT s.origin_hub_id, oh.code AS origin_hub_code, oh.name AS origin_hub_name,
                  s.dest_hub_id, dh.code AS dest_hub_code, dh.name AS dest_hub_name,
                  sa.courier_id AS assigned_courier_id,
                  cu.employee_code AS assigned_courier_code,
                  cu.full_name AS assigned_courier_name,
                  sa.assigned_at
           FROM shipments s
           LEFT JOIN hubs oh ON oh.id = s.origin_hub_id
           LEFT JOIN hubs dh ON dh.id = s.dest_hub_id
           LEFT JOIN shipment_assignments sa ON sa.shipment_code = s.code AND sa.is_active = TRUE
           LEFT JOIN users cu ON cu.id = sa.courier_id
           WHERE s.code = $1`,
          [code]
        );
        if (metaRes.rows.length) {
          shipment = { ...shipment, ...metaRes.rows[0] };
        }
      }

      const eventsQuery = user
        ? `SELECT te.id, te.status, te.location, te.proof_status, te.notes, te.recorded_at,
                  u.full_name AS actor_name, u.employee_code AS actor_code, u.role AS actor_role,
                  h.code AS hub_code, h.name AS hub_name
           FROM tracking_events te
           LEFT JOIN users u ON u.id = te.actor_id
           LEFT JOIN hubs h ON h.id = te.hub_id
           WHERE te.shipment_code = $1
           ORDER BY te.id DESC
           LIMIT 100`
        : `SELECT id, status, location, proof_status, notes, recorded_at
           FROM tracking_events
           WHERE shipment_code = $1
           ORDER BY id DESC
           LIMIT 100`;

      const [eventsRes, proofsRes] = await Promise.all([
        client.query(eventsQuery, [code]),
        client.query(
          `SELECT id, event_id, object_key, mime_type, size_bytes, taken_at
           FROM proofs
           WHERE shipment_code = $1 AND deleted_at IS NULL
           ORDER BY created_at DESC`,
          [code]
        ),
      ]);

      return {
        shipment,
        events: eventsRes.rows,
        proofs: proofsRes.rows.map((p) => ({
          ...p,
          url: `/uploads/${p.object_key}`,
        })),
      };
    });
  }

  static async softDeleteShipment(code, actor) {
    return withWriteTx(async (client) => {
      const res = await client.query(
        `UPDATE shipments
         SET deleted_at = clock_timestamp(), deleted_by = $1, updated_at = clock_timestamp()
         WHERE code = $2 AND deleted_at IS NULL
         RETURNING code, current_status`,
        [actor.id, code]
      );
      if (!res.rows.length) throw new NotFoundError("Shipment tidak ditemukan");

      await auditBus.publish(client, {
        actorId: actor.id,
        action: "SHIPMENT_SOFT_DELETED",
        targetType: "shipment",
        targetId: code,
        beforeData: res.rows[0],
        afterData: { deleted: true },
      });
      dashboardCache.clear();
      return { deleted: code, soft_delete: true };
    });
  }

  static async getDashboard(actor = null) {
    const cacheKey =
      actor?.role === "kurir"
        ? `courier:${actor.id}`
        : (actor?.role === "operator" || actor?.role === "supervisor") && actor.hub_id
          ? `hub:${actor.hub_id}`
          : "global";

    const now = Date.now();
    const cached = dashboardCache.get(cacheKey);
    if (cached && now < cached.expiresAt) {
      return cached.data;
    }

    const data = await withReadClient(async (client) => {
      const where = ["s.deleted_at IS NULL"];
      const params = [];
      applyActorScope(where, params, actor);
      const scopeWhere = where.join(" AND ");

      const [byStatus, totals, latest, trendRes] = await Promise.all([
        client.query(
          `SELECT s.current_status AS status, count(*)::int AS total
           FROM shipments s
           LEFT JOIN shipment_assignments sa ON sa.shipment_code = s.code AND sa.is_active = TRUE
           WHERE ${scopeWhere}
           GROUP BY 1 ORDER BY 2 DESC`,
          params
        ),
        client.query(
          `SELECT count(*)::int AS total_events,
                  count(*) FILTER (WHERE te.recorded_at > clock_timestamp() - interval '1 hour')::int AS events_last_hour
           FROM tracking_events te
           JOIN shipments s ON s.code = te.shipment_code
           LEFT JOIN shipment_assignments sa ON sa.shipment_code = s.code AND sa.is_active = TRUE
           WHERE ${scopeWhere}`,
          params
        ),
        client.query(
          `SELECT te.shipment_code, te.status, te.location, te.recorded_at,
                  u.full_name AS actor_name, u.employee_code AS actor_code,
                  h.code AS hub_code, h.name AS hub_name
           FROM tracking_events te
           JOIN shipments s ON s.code = te.shipment_code
           LEFT JOIN shipment_assignments sa ON sa.shipment_code = s.code AND sa.is_active = TRUE
           LEFT JOIN users u ON u.id = te.actor_id
           LEFT JOIN hubs h ON h.id = te.hub_id
           WHERE ${scopeWhere}
           ORDER BY te.id DESC LIMIT 10`,
          params
        ),
        client.query(
          `WITH days AS (
             SELECT generate_series(
               (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta')::date - interval '6 days',
               (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta')::date,
               interval '1 day'
             )::date AS day_date
           ),
           counts AS (
             SELECT (COALESCE(s.created_at, s.updated_at) AT TIME ZONE 'Asia/Jakarta')::date AS day_date,
                    count(*)::int AS total
             FROM shipments s
             LEFT JOIN shipment_assignments sa ON sa.shipment_code = s.code AND sa.is_active = TRUE
             WHERE ${scopeWhere}
               AND (COALESCE(s.created_at, s.updated_at) AT TIME ZONE 'Asia/Jakarta')::date >= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta')::date - interval '6 days'
             GROUP BY 1
           )
           SELECT to_char(d.day_date, 'YYYY-MM-DD') AS date,
                  COALESCE(c.total, 0)::int AS total
           FROM days d
           LEFT JOIN counts c ON c.day_date = d.day_date
           ORDER BY d.day_date ASC`,
          params
        ),
      ]);
      return {
        scope: cacheKey,
        by_status: byStatus.rows,
        ...totals.rows[0],
        latest: latest.rows,
        trend_7d: trendRes.rows,
      };
    });

    dashboardCache.set(cacheKey, { data, expiresAt: now + 3000 });
    return data;
  }

  static async getRoleReport(actor, { date_from = null, date_to = null } = {}) {
    return withReadClient(async (client) => {
      const where = ["s.deleted_at IS NULL"];
      const params = [];
      applyActorScope(where, params, actor, actor.role === "kurir" ? "mine" : null);

      if (date_from && /^\d{4}-\d{2}-\d{2}$/.test(date_from)) {
        params.push(date_from);
        where.push(`(COALESCE(s.created_at, s.updated_at) AT TIME ZONE 'Asia/Jakarta')::date >= $${params.length}::date`);
      }
      if (date_to && /^\d{4}-\d{2}-\d{2}$/.test(date_to)) {
        params.push(date_to);
        where.push(`(COALESCE(s.created_at, s.updated_at) AT TIME ZONE 'Asia/Jakarta')::date <= $${params.length}::date`);
      }

      const scopeSql = where.join(" AND ");
      const fromJoin = `
        FROM shipments s
        LEFT JOIN shipment_assignments sa ON sa.shipment_code = s.code AND sa.is_active = TRUE
      `;

      const [summaryRes, byServiceRes, byPackageRes] = await Promise.all([
        client.query(
          `SELECT
             COUNT(*)::int AS total_shipments,
             COUNT(*) FILTER (WHERE s.current_status = 'SELESAI')::int AS delivered_count,
             COUNT(*) FILTER (WHERE s.current_status IN ('BOOKED','DITERIMA','DISIMPAN','DALAM_PERJALANAN','DIKIRIM'))::int AS in_progress_count,
             COUNT(*) FILTER (WHERE s.current_status IN ('GAGAL_KIRIM','RETUR','BATAL'))::int AS failed_or_return_count,
             COALESCE(SUM(s.chargeable_weight_kg), 0)::int AS total_weight_kg,
             COALESCE(SUM(s.shipping_cost), 0)::bigint AS shipping_revenue,
             COALESCE(SUM(s.insurance_cost), 0)::bigint AS insurance_revenue,
             COALESCE(SUM(s.total_cost), 0)::bigint AS total_revenue,
             COALESCE(SUM(s.total_cost) FILTER (WHERE s.payment_status = 'COD'), 0)::bigint AS cod_total,
             COALESCE(SUM(s.total_cost) FILTER (WHERE s.payment_status = 'COD' AND s.current_status = 'SELESAI'), 0)::bigint AS cod_collected,
             COALESCE(SUM(s.total_cost) FILTER (WHERE s.payment_status = 'COD' AND s.current_status <> 'SELESAI'), 0)::bigint AS cod_pending,
             COALESCE(SUM(s.total_cost) FILTER (WHERE s.payment_status = 'PAID'), 0)::bigint AS paid_total,
             COALESCE(SUM(s.total_cost) FILTER (WHERE s.payment_status = 'UNPAID'), 0)::bigint AS unpaid_total,
             COUNT(*) FILTER (WHERE s.channel = 'LOKET')::int AS loket_count,
             COUNT(*) FILTER (WHERE s.channel = 'ONLINE')::int AS online_count
           ${fromJoin}
           WHERE ${scopeSql}`,
          params
        ),
        client.query(
          `SELECT
             COALESCE(s.service_code, 'REG') AS service_code,
             COUNT(*)::int AS total,
             COUNT(*) FILTER (WHERE s.current_status = 'SELESAI')::int AS delivered,
             COALESCE(SUM(s.chargeable_weight_kg), 0)::int AS weight_kg,
             COALESCE(SUM(s.total_cost), 0)::bigint AS total_revenue
           ${fromJoin}
           WHERE ${scopeSql}
           GROUP BY COALESCE(s.service_code, 'REG')
           ORDER BY total DESC`,
          params
        ),
        client.query(
          `SELECT
             COALESCE(s.package_type, 'Umum') AS package_type,
             COUNT(*)::int AS total,
             COALESCE(SUM(s.total_cost), 0)::bigint AS total_revenue
           ${fromJoin}
           WHERE ${scopeSql}
           GROUP BY COALESCE(s.package_type, 'Umum')
           ORDER BY total DESC`,
          params
        ),
      ]);

      const summary = summaryRes.rows[0] || {};
      let roleDetail = {};

      if (actor.role === "kurir") {
        const [codList, recentList] = await Promise.all([
          client.query(
            `SELECT s.code, s.receiver_name, c.name AS dest_city, s.current_status, s.total_cost, s.updated_at
             ${fromJoin}
             LEFT JOIN cities c ON c.id = s.dest_city_id
             WHERE ${scopeSql} AND s.payment_status = 'COD'
             ORDER BY (CASE WHEN s.current_status = 'SELESAI' THEN 0 ELSE 1 END), s.updated_at DESC
             LIMIT 30`,
            params
          ),
          client.query(
            `SELECT s.code, s.service_code, s.package_type, s.receiver_name, c.name AS dest_city,
                    s.current_status, s.payment_status, s.total_cost, s.updated_at
             ${fromJoin}
             LEFT JOIN cities c ON c.id = s.dest_city_id
             WHERE ${scopeSql}
             ORDER BY s.updated_at DESC
             LIMIT 10`,
            params
          ),
        ]);
        const incentivePerPkg = 3500;
        roleDetail = {
          incentive_per_delivery: incentivePerPkg,
          estimated_incentive: Number(summary.delivered_count || 0) * incentivePerPkg,
          cod_items: codList.rows,
          recent_deliveries: recentList.rows,
        };
      } else if (actor.role === "operator") {
        const payRes = await client.query(
          `SELECT s.payment_status, COUNT(*)::int AS total, COALESCE(SUM(s.total_cost), 0)::bigint AS amount
           ${fromJoin}
           WHERE ${scopeSql}
           GROUP BY s.payment_status
           ORDER BY amount DESC`,
          params
        );
        roleDetail = { by_payment: payRes.rows };
      } else if (actor.role === "supervisor") {
        const courierRes = await client.query(
          `SELECT
             u.id, u.employee_code, u.full_name, COALESCE(u.vehicle_type, 'Sepeda Motor') AS vehicle_type,
             COUNT(s.code)::int AS total_assigned,
             COUNT(s.code) FILTER (WHERE s.current_status = 'SELESAI')::int AS delivered,
             COUNT(s.code) FILTER (WHERE s.current_status IN ('GAGAL_KIRIM','RETUR','BATAL'))::int AS failed,
             COUNT(s.code) FILTER (WHERE s.current_status IN ('BOOKED','DITERIMA','DISIMPAN','DALAM_PERJALANAN','DIKIRIM'))::int AS in_progress,
             COALESCE(SUM(s.total_cost) FILTER (WHERE s.payment_status = 'COD' AND s.current_status = 'SELESAI'), 0)::bigint AS cod_collected
           ${fromJoin}
           JOIN users u ON u.id = sa.courier_id
           WHERE ${scopeSql}
           GROUP BY u.id, u.employee_code, u.full_name, u.vehicle_type
           ORDER BY total_assigned DESC, delivered DESC`,
          params
        );
        roleDetail = { courier_performance: courierRes.rows };
      } else {
        const hubRes = await client.query(
          `SELECT
             COALESCE(h.code, 'PUSAT') AS hub_code,
             COALESCE(h.name, 'Pusat Jawa Timur') AS hub_name,
             COUNT(*)::int AS total_shipments,
             COUNT(*) FILTER (WHERE s.current_status = 'SELESAI')::int AS delivered,
             COUNT(*) FILTER (WHERE s.current_status IN ('GAGAL_KIRIM','RETUR','BATAL'))::int AS failed,
             COALESCE(SUM(s.shipping_cost), 0)::bigint AS shipping_revenue,
             COALESCE(SUM(s.insurance_cost), 0)::bigint AS insurance_revenue,
             COALESCE(SUM(s.total_cost), 0)::bigint AS total_revenue
           ${fromJoin}
           LEFT JOIN hubs h ON h.id = COALESCE(s.origin_hub_id, s.dest_hub_id)
           WHERE ${scopeSql}
           GROUP BY COALESCE(h.code, 'PUSAT'), COALESCE(h.name, 'Pusat Jawa Timur')
           ORDER BY total_revenue DESC`,
          params
        );
        roleDetail = { by_hub: hubRes.rows };
      }

      return {
        role: actor.role,
        hub_id: actor.hub_id || null,
        date_from: date_from || null,
        date_to: date_to || null,
        summary,
        by_service: byServiceRes.rows,
        by_package_type: byPackageRes.rows,
        ...roleDetail,
      };
    });
  }
}
