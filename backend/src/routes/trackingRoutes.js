import { Router } from "express";
import { z } from "zod";
import { Permission, optionalAuth, requireRoles } from "../core/authMiddleware.js";
import { ShipmentStatus } from "../domain/shipmentState.js";
import { OrderService } from "../services/orderService.js";
import { TrackingService } from "../services/trackingService.js";

const quoteSchema = z.object({
  origin_city_id: z.coerce.number().int().positive(),
  dest_city_id: z.coerce.number().int().positive(),
  service_code: z.string().trim().max(10).optional(),
  weight_kg: z.coerce.number().positive().max(500),
  length_cm: z.coerce.number().min(0).max(500).default(0),
  width_cm: z.coerce.number().min(0).max(500).default(0),
  height_cm: z.coerce.number().min(0).max(500).default(0),
  declared_value: z.coerce.number().int().min(0).default(0),
  use_insurance: z.boolean().default(false),
});

const orderSchema = z.object({
  sender_name: z.string().trim().min(2).max(100),
  sender_phone: z.string().regex(/^(\+62|62|0)8\d{7,12}$/, "Format nomor HP pengirim tidak valid"),
  sender_address: z.string().trim().min(5).max(250),
  origin_city_id: z.coerce.number().int().positive(),
  origin_hub_id: z.coerce.number().int().positive().optional().nullable(),

  receiver_name: z.string().trim().min(2).max(100),
  receiver_phone: z.string().regex(/^(\+62|62|0)8\d{7,12}$/, "Format nomor HP penerima tidak valid"),
  receiver_address: z.string().trim().min(5).max(250),
  dest_city_id: z.coerce.number().int().positive(),

  service_code: z.string().trim().min(2).max(10),
  weight_kg: z.coerce.number().positive().max(500),
  length_cm: z.coerce.number().min(0).max(500).default(0),
  width_cm: z.coerce.number().min(0).max(500).default(0),
  height_cm: z.coerce.number().min(0).max(500).default(0),
  declared_value: z.coerce.number().int().min(0).default(0),
  use_insurance: z.boolean().default(false),
  payment_status: z.enum(["UNPAID", "PAID", "COD"]).default("PAID"),
  channel: z.enum(["ONLINE", "LOKET", "API"]).default("LOKET"),
});

const eventSchema = z.object({
  shipment_code: z.string().trim().regex(/^[A-Za-z0-9_-]{3,50}$/, "Format kode resi tidak valid"),
  status: z.enum(Object.values(ShipmentStatus)),
  location: z.string().trim().min(2).max(120),
  hub_id: z.coerce.number().int().positive().optional().nullable(),
  expected_version: z.coerce.number().int().positive().optional(),
  notes: z.string().trim().max(300).optional().nullable(),
  proof_object_key: z.string().trim().max(160).optional().nullable(),
});

export function createTrackingRouter() {
  const router = Router();

  // Public reference data (cities, hubs, services) & tariff calculator
  router.get("/api/reference", async (_req, res, next) => {
    try {
      res.json(await OrderService.getReferenceData());
    } catch (err) {
      next(err);
    }
  });

  router.post("/api/tariffs/quote", async (req, res, next) => {
    try {
      const body = quoteSchema.parse(req.body);
      res.json(await OrderService.quoteTariff(body));
    } catch (err) {
      next(err);
    }
  });

  // Order intake (auth required, idempotent)
  router.post("/api/orders", ...requireRoles(Permission.WRITE_ORDER), async (req, res, next) => {
    try {
      const body = orderSchema.parse(req.body);
      const idemKey = req.headers["idempotency-key"] || null;
      const out = await OrderService.createOrder(body, req.user, idemKey);
      res.status(201).json(out);
    } catch (err) {
      next(err);
    }
  });

  // Checkpoint status update (auth required, state machine + row lock + idempotent)
  router.post("/api/events", ...requireRoles(Permission.WRITE_EVENT), async (req, res, next) => {
    try {
      const body = eventSchema.parse(req.body);
      const idemKey = req.headers["idempotency-key"] || null;
      const out = await TrackingService.addEvent(body, req.user, idemKey);
      res.status(201).json(out);
    } catch (err) {
      next(err);
    }
  });

  // Internal shipments list with keyset pagination (auth required — no public enumeration!)
  router.get("/api/shipments", ...requireRoles(Permission.VIEW_INTERNAL_LIST), async (req, res, next) => {
    try {
      const out = await TrackingService.listShipments({
        limit: req.query.limit,
        status: req.query.status || null,
        q: req.query.q || null,
        cursorUpdatedAt: req.query.cursor_updated_at || null,
        cursorCode: req.query.cursor_code || null,
      });
      res.setHeader("X-Total-Count", String(out.total_count));
      res.json(out);
    } catch (err) {
      next(err);
    }
  });

  // Public single-resi tracking (zero PII via public_tracking_view)
  router.get("/api/shipments/:code/events", optionalAuth, async (req, res, next) => {
    try {
      const code = String(req.params.code || "").trim().toUpperCase();
      res.json(await TrackingService.getPublicTracking(code, req.user));
    } catch (err) {
      next(err);
    }
  });

  // Soft delete shipment (admin / superadmin only)
  router.delete("/api/shipments/:code", ...requireRoles(Permission.DELETE_SHIPMENT), async (req, res, next) => {
    try {
      res.json(await TrackingService.softDeleteShipment(req.params.code, req.user));
    } catch (err) {
      next(err);
    }
  });

  // Dashboard aggregates (auth required, cached 3s on read replica)
  router.get("/api/dashboard", ...requireRoles(Permission.VIEW_INTERNAL_LIST), async (_req, res, next) => {
    try {
      res.json(await TrackingService.getDashboard());
    } catch (err) {
      next(err);
    }
  });

  return router;
}
