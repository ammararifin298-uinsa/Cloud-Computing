import crypto from "node:crypto";
import { ConflictError } from "../domain/errors.js";

/**
 * Idempotency helper (Audit #11 & 2.4): prevents duplicate writes on double-click or network retry.
 */
export class IdempotencyService {
  static hashBody(body) {
    return crypto.createHash("sha256").update(JSON.stringify(body ?? {})).digest("hex");
  }

  static async findExisting(client, key, endpoint, requestHash) {
    if (!key) return null;
    const res = await client.query(
      `SELECT endpoint, request_hash, status_code, response_json
       FROM idempotency_keys
       WHERE key = $1 AND expires_at > clock_timestamp()`,
      [key]
    );
    if (!res.rows.length) return null;
    const row = res.rows[0];
    if (row.endpoint !== endpoint || row.request_hash !== requestHash) {
      throw new ConflictError("Idempotency-Key sudah digunakan untuk payload yang berbeda.");
    }
    return { statusCode: Number(row.status_code), body: row.response_json };
  }

  static async save(client, key, userId, endpoint, requestHash, statusCode, responseBody) {
    if (!key) return;
    await client.query(
      `INSERT INTO idempotency_keys (key, user_id, endpoint, request_hash, status_code, response_json)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)
       ON CONFLICT (key) DO NOTHING`,
      [key, userId ?? null, endpoint, requestHash, statusCode, JSON.stringify(responseBody)]
    );
  }
}
