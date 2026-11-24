import { NotFoundError } from "../domain/errors.js";
import { auditBus } from "../domain/eventBus.js";
import { ResiGenerator } from "../domain/resiGenerator.js";
import { TariffCalculator } from "../domain/tariffCalculator.js";
import { withReadClient, withWriteTx } from "../infra/db.js";
import { IdempotencyService } from "./idempotencyService.js";

const calculator = new TariffCalculator();
let refCache = { data: null, expiresAt: 0 };

export class OrderService {
  static async getReferenceData() {
    const now = Date.now();
    if (refCache.data && now < refCache.expiresAt) return refCache.data;

    const data = await withReadClient(async (client) => {
      const [cities, hubs, services] = await Promise.all([
        client.query(
          `SELECT c.id, c.code, c.name, c.type, c.zone_id, z.code AS zone_code, z.name AS zone_name
           FROM cities c JOIN zones z ON z.id = c.zone_id
           ORDER BY c.type DESC, c.name ASC`
        ),
        client.query(
          `SELECT h.id, h.code, h.name, h.kind, h.city_id, c.name AS city_name
           FROM hubs h JOIN cities c ON c.id = h.city_id
           WHERE h.is_active = TRUE
           ORDER BY h.kind ASC, h.name ASC`
        ),
        client.query(
          `SELECT code, name, volumetric_divisor, insurance_rate, max_weight_kg
           FROM services ORDER BY code ASC`
        ),
      ]);
      return {
        cities: cities.rows,
        hubs: hubs.rows,
        services: services.rows,
      };
    });

    refCache = { data, expiresAt: now + 60_000 };
    return data;
  }

  static async getDistricts(cityId) {
    return withReadClient(async (client) => {
      const res = await client.query(
        `SELECT id, city_id, code, name
         FROM districts
         WHERE city_id = $1
         ORDER BY name ASC`,
        [cityId]
      );
      return res.rows;
    });
  }

  static async getVillages(districtId) {
    return withReadClient(async (client) => {
      const res = await client.query(
        `SELECT id, district_id, code, name, type, postal_code
         FROM villages
         WHERE district_id = $1
         ORDER BY name ASC`,
        [districtId]
      );
      return res.rows;
    });
  }

  static async getVehicleModels(vehicleType = null) {
    return withReadClient(async (client) => {
      if (vehicleType) {
        const res = await client.query(
          `SELECT id, vehicle_type, brand, model, min_year
           FROM vehicle_models
           WHERE is_active = TRUE AND vehicle_type = $1
           ORDER BY brand ASC, model ASC`,
          [vehicleType]
        );
        return res.rows;
      }
      const res = await client.query(
        `SELECT id, vehicle_type, brand, model, min_year
         FROM vehicle_models
         WHERE is_active = TRUE
         ORDER BY vehicle_type ASC, brand ASC, model ASC`
      );
      return res.rows;
    });
  }

  static async quoteTariff(input) {
    const rows = await withReadClient(async (client) => {
      const params = [input.origin_city_id, input.dest_city_id];
      let filterSql = "";
      if (input.service_code) {
        params.push(input.service_code.toUpperCase());
        filterSql = "AND t.service_code = $3";
      }
      const res = await client.query(
        `SELECT t.service_code, s.name AS service_name, s.volumetric_divisor,
                s.insurance_rate, s.max_weight_kg, t.base_price, t.per_kg,
                t.eta_min_days, t.eta_max_days,
                o.name AS origin_city, d.name AS dest_city
         FROM tariffs t
         JOIN services s ON s.code = t.service_code
         JOIN cities o   ON o.zone_id = t.origin_zone_id AND o.id = $1
         JOIN cities d   ON d.zone_id = t.dest_zone_id   AND d.id = $2
         WHERE 1=1 ${filterSql}
         ORDER BY t.base_price ASC`,
        params
      );
      return res.rows;
    });

    if (!rows.length) {
      throw new NotFoundError("Rute atau layanan pengiriman tidak tersedia untuk kota asal dan tujuan tersebut.");
    }

    const quotes = rows.map((r) => calculator.quote(r, input));
    return {
      origin_city: rows[0].origin_city,
      dest_city: rows[0].dest_city,
      quotes,
    };
  }

  static async createOrder(input, actor, idempotencyKey = null) {
    const endpoint = "POST /api/orders";
    const reqHash = IdempotencyService.hashBody(input);

    return withWriteTx(async (client) => {
      const existing = await IdempotencyService.findExisting(client, idempotencyKey, endpoint, reqHash);
      if (existing) return existing.body;

      // 1. Recompute tariff authoritatively on server
      const tariffRes = await client.query(
        `SELECT t.service_code, s.name AS service_name, s.volumetric_divisor,
                s.insurance_rate, s.max_weight_kg, t.base_price, t.per_kg,
                t.eta_min_days, t.eta_max_days,
                o.name AS origin_city, d.name AS dest_city,
                oh.hub_id AS default_origin_hub_id, dh.hub_id AS dest_hub_id
         FROM tariffs t
         JOIN services s ON s.code = t.service_code
         JOIN cities o   ON o.zone_id = t.origin_zone_id AND o.id = $1
         JOIN cities d   ON d.zone_id = t.dest_zone_id   AND d.id = $2
         LEFT JOIN hub_coverage oh ON oh.city_id = o.id
         LEFT JOIN hub_coverage dh ON dh.city_id = d.id
         WHERE t.service_code = $3`,
        [input.origin_city_id, input.dest_city_id, input.service_code.toUpperCase()]
      );
      if (!tariffRes.rows.length) {
        throw new NotFoundError("Layanan tidak tersedia untuk rute kota asal dan tujuan ini.");
      }
      const rule = tariffRes.rows[0];
      const quote = calculator.quote(rule, input);

      // 2. Resolve origin hub & generate atomic sequential resi with Luhn check digit
      const originHubId = input.origin_hub_id || actor?.hub_id || rule.default_origin_hub_id;
      const hubRes = await client.query("SELECT id, code, name FROM hubs WHERE id = $1", [originHubId]);
      const hub = hubRes.rows[0] || { id: null, code: "GLOBAL", name: rule.origin_city };

      const today = new Date();
      const dateStr = today.toISOString().slice(0, 10);
      const cntRes = await client.query(
        `INSERT INTO resi_counters (hub_code, resi_date, last_seq)
         VALUES ($1, $2::date, 1)
         ON CONFLICT (hub_code, resi_date)
         DO UPDATE SET last_seq = resi_counters.last_seq + 1
         RETURNING last_seq`,
        ["GLOBAL", dateStr]
      );
      const resiCode = ResiGenerator.formatResi(today, cntRes.rows[0].last_seq, quote.service_code);
      const initialStatus = input.channel === "ONLINE" ? "BOOKED" : "DITERIMA";
      const initialLocation = hub.name;
      const packageType = input.package_type || "Umum";

      // 3. Insert shipment + initial tracking_event + audit log in 1 transaction
      const shipRes = await client.query(
        `INSERT INTO shipments (
           code, current_status, current_location, updated_at,
           sender_name, sender_phone, sender_address, origin_city_id, origin_hub_id,
           origin_district_id, origin_village_id, origin_rt, origin_rw, origin_postal_code,
           receiver_name, receiver_phone, receiver_address, dest_city_id, dest_hub_id,
           dest_district_id, dest_village_id, dest_rt, dest_rw, dest_postal_code,
           service_code, package_type, weight_kg, length_cm, width_cm, height_cm, chargeable_weight_kg,
           declared_value, shipping_cost, insurance_cost, total_cost,
           payment_status, channel, created_by, version
         ) VALUES (
           $1, $2, $3, clock_timestamp(),
           $4, $5, $6, $7, $8,
           $9, $10, $11, $12, $13,
           $14, $15, $16, $17, $18,
           $19, $20, $21, $22, $23,
           $24, $25, $26, $27, $28, $29, $30,
           $31, $32, $33, $34,
           $35, $36, $37, 1
         )
         RETURNING code, current_status, current_location, service_code, package_type,
                   chargeable_weight_kg, shipping_cost, insurance_cost, total_cost,
                   payment_status, channel, version, updated_at`,
        [
          resiCode,
          initialStatus,
          initialLocation,
          input.sender_name.trim(),
          input.sender_phone.trim(),
          input.sender_address.trim(),
          input.origin_city_id,
          hub.id,
          input.origin_district_id ?? null,
          input.origin_village_id ?? null,
          input.origin_rt?.trim() || null,
          input.origin_rw?.trim() || null,
          input.origin_postal_code?.trim() || null,
          input.receiver_name.trim(),
          input.receiver_phone.trim(),
          input.receiver_address.trim(),
          input.dest_city_id,
          rule.dest_hub_id ?? null,
          input.dest_district_id ?? null,
          input.dest_village_id ?? null,
          input.dest_rt?.trim() || null,
          input.dest_rw?.trim() || null,
          input.dest_postal_code?.trim() || null,
          quote.service_code,
          packageType,
          quote.actual_weight_kg,
          input.length_cm || 0,
          input.width_cm || 0,
          input.height_cm || 0,
          quote.chargeable_weight_kg,
          input.declared_value || 0,
          quote.shipping_cost,
          quote.insurance_cost,
          quote.total_cost,
          input.payment_status,
          input.channel,
          actor?.id ?? null,
        ]
      );

      await client.query(
        `INSERT INTO tracking_events (shipment_code, status, location, actor_id, hub_id, notes)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          resiCode,
          initialStatus,
          initialLocation,
          actor?.id ?? null,
          hub.id,
          `Order dibuat (${input.channel}) - ${quote.service_name} ${quote.chargeable_weight_kg} kg`,
        ]
      );

      await auditBus.publish(client, {
        actorId: actor?.id ?? null,
        action: "ORDER_CREATED",
        targetType: "shipment",
        targetId: resiCode,
        afterData: { status: initialStatus, total_cost: quote.total_cost, service: quote.service_code },
      });

      const responseBody = {
        shipment: shipRes.rows[0],
        quote,
        origin_city: rule.origin_city,
        dest_city: rule.dest_city,
      };
      await IdempotencyService.save(client, idempotencyKey, actor?.id, endpoint, reqHash, 201, responseBody);
      return responseBody;
    });
  }
}
