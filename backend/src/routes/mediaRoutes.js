import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { config } from "../core/config.js";
import { Permission, requireRoles } from "../core/authMiddleware.js";
import { DomainError } from "../domain/errors.js";
import { MediaService } from "../services/mediaService.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxUploadBytes },
});

const base64UploadSchema = z.object({
  shipment_code: z.string().trim().regex(/^[A-Za-z0-9_-]{3,64}$/),
  content_base64: z.string().min(4),
  event_id: z.coerce.number().int().positive().optional().nullable(),
});

export function createMediaRouter() {
  const router = Router();

  // Supports both multipart/form-data (preferred, low RAM) and JSON base64 (capped at 5MB)
  router.post(
    "/api/uploads",
    ...requireRoles(Permission.UPLOAD_PROOF),
    upload.single("file"),
    async (req, res, next) => {
      try {
        let shipmentCode;
        let buffer;
        let eventId = null;

        if (req.file) {
          shipmentCode = String(req.body?.shipment_code || "").trim();
          if (!/^[A-Za-z0-9_-]{3,64}$/.test(shipmentCode)) {
            throw new DomainError("shipment_code tidak valid", 422);
          }
          buffer = req.file.buffer;
          eventId = req.body?.event_id ? Number(req.body.event_id) : null;
        } else {
          const parsed = base64UploadSchema.parse(req.body);
          shipmentCode = parsed.shipment_code;
          buffer = Buffer.from(parsed.content_base64, "base64");
          eventId = parsed.event_id ?? null;
        }

        const out = await MediaService.uploadProof({
          shipmentCode,
          buffer,
          eventId,
          actor: req.user,
        });
        res.status(201).json(out);
      } catch (err) {
        next(err);
      }
    }
  );

  router.get("/api/uploads", ...requireRoles(Permission.VIEW_INTERNAL_LIST), async (req, res, next) => {
    try {
      res.json(await MediaService.listProofs(req.query.shipment_code || null));
    } catch (err) {
      next(err);
    }
  });

  router.delete("/api/uploads/:key", ...requireRoles(Permission.DELETE_PROOF), async (req, res, next) => {
    try {
      res.json(await MediaService.deleteProof(req.params.key, req.user));
    } catch (err) {
      next(err);
    }
  });

  return router;
}
