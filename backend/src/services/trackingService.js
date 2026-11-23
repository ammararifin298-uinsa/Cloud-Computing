import { ConflictError, NotFoundError, ServiceUnavailableError } from "../domain/errors.js";
import { auditBus } from "../domain/eventBus.js";
import { ShipmentStateMachine } from "../domain/shipmentState.js";
import { isFeatureEnabled, withReadClient, withWriteTx } from "../infra/db.js";
import { IdempotencyService } from "./idempotencyService.js";

let dashboardCache = { data: null, expiresAt: 0 };

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
        `SELECT code, current_status, current_location, version
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
      dashboardCache.expiresAt = 0; // Invalidate dashboard cache
      return responseBody;
    });
  }

  static async listShipments({ limit = 50, status = null, q = null, cursorUpdatedAt = null, cursorCode = null }) {
    const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);

    return withReadClient(async (client) => {
      const where = ["s.deleted_at IS NULL"];
      const params = [];

      if (status) {
        params.push(status);
        where.push(`s.current_status = $${params.length}`);
      }
      if (q) {
        params.push(`%${q.trim()}%`);
        where.push(`(s.code ILIKE $${params.length} OR s.current_location ILIKE $${params.length})`);
      }

      const countRes = await client.query(
        `SELECT count(*)::int AS total FROM shipments s WHERE ${where.join(" AND ")}`,
        params
      );

      if (cursorUpdatedAt && cursorCode) {
        params.push(cursorUpdatedAt, cursorCode);
        where.push(`(s.updated_at, s.code) < ($${params.length - 1}::timestamptz, $${params.length})`);
      }

      params.push(safeLimit);
      const rowsRes = await client.query(
        `SELECT s.code, s.current_status, s.current_location, s.service_code,
                s.total_cost, s.payment_status, s.version, s.updated_at,
                (SELECT count(*)::int FROM tracking_events t WHERE t.shipment_code = s.code) AS total_events
         FROM shipments s
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

      const [eventsRes, proofsRes] = await Promise.all([
        client.query(
          `SELECT id, status, location, proof_status, notes, recorded_at
           FROM tracking_events
           WHERE shipment_code = $1
           ORDER BY id DESC
           LIMIT 100`,
          [code]
        ),
        client.query(
          `SELECT id, event_id, object_key, mime_type, size_bytes, taken_at
           FROM proofs
           WHERE shipment_code = $1 AND deleted_at IS NULL
           ORDER BY created_at DESC`,
          [code]
        ),
      ]);

      return {
        shipment: shipRes.rows[0],
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
      dashboardCache.expiresAt = 0;
      return { deleted: code, soft_delete: true };
    });
  }

  static async getDashboard() {
    const now = Date.now();
    if (dashboardCache.data && now < dashboardCache.expiresAt) {
      return dashboardCache.data;
    }

    const data = await withReadClient(async (client) => {
      const [byStatus, totals, latest] = await Promise.all([
        client.query(
          `SELECT current_status AS status, count(*)::int AS total
           FROM shipments WHERE deleted_at IS NULL
           GROUP BY 1 ORDER BY 2 DESC`
        ),
        client.query(
          `SELECT count(*)::int AS total_events,
                  count(*) FILTER (WHERE recorded_at > clock_timestamp() - interval '1 hour')::int AS events_last_hour
           FROM tracking_events`
        ),
        client.query(
          `SELECT shipment_code, status, location, recorded_at
           FROM tracking_events ORDER BY id DESC LIMIT 10`
        ),
      ]);
      return {
        by_status: byStatus.rows,
        ...totals.rows[0],
        latest: latest.rows,
      };
    });

    dashboardCache = { data, expiresAt: now + 3000 };
    return data;
  }
}
