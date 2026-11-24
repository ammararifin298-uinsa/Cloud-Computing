import { Router } from "express";
import { z } from "zod";
import { Permission, optionalAuth, requireRoles } from "../core/authMiddleware.js";
import { ShipmentStatus } from "../domain/shipmentState.js";
import { OrderService } from "../services/orderService.js";
import { ReportExportService } from "../services/reportExportService.js";
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
  origin_district_id: z.coerce.number().int().positive().optional().nullable(),
  origin_village_id: z.coerce.number().int().positive().optional().nullable(),
  origin_rt: z.string().trim().max(5).optional().nullable(),
  origin_rw: z.string().trim().max(5).optional().nullable(),
  origin_postal_code: z.string().trim().max(10).optional().nullable(),

  receiver_name: z.string().trim().min(2).max(100),
  receiver_phone: z.string().regex(/^(\+62|62|0)8\d{7,12}$/, "Format nomor HP penerima tidak valid"),
  receiver_address: z.string().trim().min(5).max(250),
  dest_city_id: z.coerce.number().int().positive(),
  dest_district_id: z.coerce.number().int().positive().optional().nullable(),
  dest_village_id: z.coerce.number().int().positive().optional().nullable(),
  dest_rt: z.string().trim().max(5).optional().nullable(),
  dest_rw: z.string().trim().max(5).optional().nullable(),
  dest_postal_code: z.string().trim().max(10).optional().nullable(),

  service_code: z.string().trim().min(2).max(10),
  package_type: z.enum(["Umum", "Dokumen", "Elektronik", "Pakaian", "Makanan", "Pecah Belah"]).default("Umum"),
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
  proof_object_key: z.string({ required_error: "Foto bukti checkpoint wajib dilampirkan" }).trim().min(3, "Foto bukti checkpoint wajib dilampirkan").max(160),
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

  router.get("/api/reference/districts", async (req, res, next) => {
    try {
      const cityId = Number(req.query.city_id);
      if (!Number.isInteger(cityId) || cityId <= 0) {
        return res.status(400).json({ message: "Parameter city_id tidak valid" });
      }
      res.json(await OrderService.getDistricts(cityId));
    } catch (err) {
      next(err);
    }
  });

  router.get("/api/reference/villages", async (req, res, next) => {
    try {
      const districtId = Number(req.query.district_id);
      if (!Number.isInteger(districtId) || districtId <= 0) {
        return res.status(400).json({ message: "Parameter district_id tidak valid" });
      }
      res.json(await OrderService.getVillages(districtId));
    } catch (err) {
      next(err);
    }
  });

  router.get("/api/reference/vehicles", async (req, res, next) => {
    try {
      const type = req.query.type ? String(req.query.type).trim() : null;
      res.json(await OrderService.getVehicleModels(type));
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

  // Public online order booking (no auth required, strictly ONLINE + UNPAID/COD -> status BOOKED)
  router.post("/api/orders/public", async (req, res, next) => {
    try {
      const body = orderSchema.parse({
        ...req.body,
        channel: "ONLINE",
        payment_status: req.body?.payment_status === "COD" ? "COD" : "UNPAID",
      });
      const idemKey = req.headers["idempotency-key"] || null;
      const out = await OrderService.createOrder(body, null, idemKey);
      res.status(201).json(out);
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
      const out = await TrackingService.listShipments(
        {
          limit: req.query.limit,
          status: req.query.status || null,
          q: req.query.q || null,
          courierId: req.query.courier_id || null,
          hubId: req.query.hub_id || null,
          scope: req.query.scope || null,
          cursorUpdatedAt: req.query.cursor_updated_at || null,
          cursorCode: req.query.cursor_code || null,
        },
        req.user
      );
      res.setHeader("X-Total-Count", String(out.total_count));
      res.json(out);
    } catch (err) {
      next(err);
    }
  });

  // Production server-side CSV export (all matching rows, RBAC + actor scope)
  router.get("/api/shipments/export.csv", ...requireRoles(Permission.VIEW_INTERNAL_LIST), async (req, res, next) => {
    try {
      const csv = await ReportExportService.exportShipmentsCsv(
        {
          status: req.query.status || null,
          serviceCode: req.query.service_code || null,
          q: req.query.q || null,
          courierId: req.query.courier_id || null,
          hubId: req.query.hub_id || null,
          scope: req.query.scope || null,
        },
        req.user
      );
      const stamp = new Date().toISOString().slice(0, 10);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="lacakin-daftar-pengiriman-${stamp}.csv"`);
      res.send(csv);
    } catch (err) {
      next(err);
    }
  });

  // Active couriers list for assignment modal & filters
  router.get("/api/couriers", ...requireRoles(Permission.ASSIGN_SHIPMENT), async (req, res, next) => {
    try {
      res.json(await TrackingService.listCouriers(req.user));
    } catch (err) {
      next(err);
    }
  });

  // Assign / unassign courier to shipment
  router.post("/api/shipments/:code/assign", ...requireRoles(Permission.ASSIGN_SHIPMENT), async (req, res, next) => {
    try {
      const schema = z.object({
        courier_id: z.coerce.number().int().positive().nullable().optional(),
        hub_id: z.coerce.number().int().positive().nullable().optional(),
      });
      const body = schema.parse(req.body || {});
      res.json(await TrackingService.assignCourier(req.params.code, body, req.user));
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

  // Dashboard aggregates (auth required, cached 3s per role/hub/courier scope on read replica)
  router.get("/api/dashboard", ...requireRoles(Permission.VIEW_INTERNAL_LIST), async (req, res, next) => {
    try {
      res.json(await TrackingService.getDashboard(req.user));
    } catch (err) {
      next(err);
    }
  });

  // Role-aware aggregate reports
  router.get("/api/reports/summary", ...requireRoles(Permission.VIEW_INTERNAL_LIST), async (req, res, next) => {
    try {
      const { date_from, date_to } = req.query;
      res.json(await TrackingService.getRoleReport(req.user, { date_from, date_to }));
    } catch (err) {
      next(err);
    }
  });

  // Production server-side PDF report via pdfkit (lightweight, role-aware)
  router.get("/api/reports/export.pdf", ...requireRoles(Permission.VIEW_INTERNAL_LIST), async (req, res, next) => {
    try {
      const { date_from, date_to } = req.query;
      const reportData = await TrackingService.getRoleReport(req.user, { date_from, date_to });
      const pdfBuf = await ReportExportService.buildRoleReportPdfBuffer(reportData, req.user);
      const stamp = new Date().toISOString().slice(0, 10);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="laporan-${req.user.role}-lacakin-${stamp}.pdf"`);
      res.send(pdfBuf);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
