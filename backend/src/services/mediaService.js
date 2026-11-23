import crypto from "node:crypto";
import { config } from "../core/config.js";
import { sha256Hex, validateMediaMagicBytes } from "../core/security.js";
import { DomainError, NotFoundError } from "../domain/errors.js";
import { auditBus } from "../domain/eventBus.js";
import { withReadClient, withWriteTx } from "../infra/db.js";
import { getStorage } from "../infra/storage.js";

export class MediaService {
  static async uploadProof({ shipmentCode, buffer, eventId = null, actor }) {
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
      throw new DomainError("File bukti pengiriman wajib diunggah", 400);
    }
    if (buffer.length > config.maxUploadBytes) {
      throw new DomainError("Ukuran file bukti maksimal 5 MB", 413);
    }

    const { ext, mime } = validateMediaMagicBytes(buffer, true);
    const hash = sha256Hex(buffer);
    const objectKey = `${crypto.randomUUID().replace(/-/g, "")}${ext}`;

    // Upload to MinIO (or configured StorageBackend)
    const storage = getStorage();
    await storage.put(objectKey, buffer, mime);

    // Record proof metadata atomically in PostgreSQL
    const proof = await withWriteTx(async (client) => {
      const ship = await client.query(
        "SELECT code FROM shipments WHERE code = $1 AND deleted_at IS NULL",
        [shipmentCode]
      );
      if (!ship.rows.length) {
        await storage.delete(objectKey).catch(() => {});
        throw new NotFoundError(`Resi '${shipmentCode}' tidak ditemukan`);
      }

      const ins = await client.query(
        `INSERT INTO proofs (shipment_code, event_id, object_key, sha256, mime_type, size_bytes, uploaded_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, shipment_code, event_id, object_key, sha256, mime_type, size_bytes, taken_at`,
        [shipmentCode, eventId ?? null, objectKey, hash, mime, buffer.length, actor.id]
      );

      if (eventId) {
        await client.query(
          "UPDATE tracking_events SET proof_status = 'VERIFIED' WHERE id = $1 AND shipment_code = $2",
          [eventId, shipmentCode]
        );
      }

      await auditBus.publish(client, {
        actorId: actor.id,
        action: "PROOF_UPLOADED",
        targetType: "proof",
        targetId: objectKey,
        afterData: { shipment_code: shipmentCode, mime, size_bytes: buffer.length, sha256: hash },
      });

      return ins.rows[0];
    });

    return {
      status: "uploaded",
      id: proof.id,
      key: objectKey,
      object_key: objectKey,
      shipment_code: shipmentCode,
      size_bytes: buffer.length,
      content_type: mime,
      sha256: hash,
      url: `/uploads/${objectKey}`,
      cdn_url: `${config.cdnPublicUrl}/uploads/${objectKey}`,
      lb_url: `/uploads/${objectKey}`,
      storage_backend: storage.name,
    };
  }

  static async listProofs(shipmentCode = null) {
    const rows = await withReadClient(async (client) => {
      if (shipmentCode) {
        const res = await client.query(
          `SELECT id, shipment_code, event_id, object_key, sha256, mime_type, size_bytes, taken_at
           FROM proofs WHERE shipment_code = $1 AND deleted_at IS NULL
           ORDER BY created_at DESC`,
          [shipmentCode]
        );
        return res.rows;
      }
      const res = await client.query(
        `SELECT id, shipment_code, event_id, object_key, sha256, mime_type, size_bytes, taken_at
         FROM proofs WHERE deleted_at IS NULL
         ORDER BY created_at DESC LIMIT 200`
      );
      return res.rows;
    });

    return {
      cdn_base: config.cdnPublicUrl,
      storage_backend: getStorage().name,
      count: rows.length,
      items: rows.map((r) => ({
        ...r,
        key: r.object_key,
        cdn_url: `${config.cdnPublicUrl}/uploads/${r.object_key}`,
        lb_url: `/uploads/${r.object_key}`,
      })),
    };
  }

  static async deleteProof(objectKey, actor) {
    const safeKey = String(objectKey || "").replace(/[^a-zA-Z0-9._-]/g, "");
    await withWriteTx(async (client) => {
      const res = await client.query(
        `UPDATE proofs SET deleted_at = clock_timestamp()
         WHERE object_key = $1 AND deleted_at IS NULL
         RETURNING id, shipment_code, object_key`,
        [safeKey]
      );
      if (!res.rows.length) throw new NotFoundError("File bukti tidak ditemukan");

      await auditBus.publish(client, {
        actorId: actor.id,
        action: "PROOF_SOFT_DELETED",
        targetType: "proof",
        targetId: safeKey,
        beforeData: res.rows[0],
      });
    });
    return { status: "deleted", key: safeKey, soft_delete: true };
  }
}
