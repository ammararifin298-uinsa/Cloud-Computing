import { Router } from "express";
import { z } from "zod";
import { Permission, authenticate, requireRoles } from "../core/authMiddleware.js";
import { AuthService } from "../services/authService.js";

const loginSchema = z.object({
  identifier: z.string().trim().min(1).max(50),
  password: z.string().min(1).max(100),
});

const registerSchema = z.object({
  role: z.literal("kurir").default("kurir"),
  full_name: z.string().trim().min(3).max(80),
  nik: z.string().regex(/^\d{16}$/, "NIK harus tepat 16 digit angka"),
  phone: z.string().regex(/^(\+62|62|0)8\d{7,12}$/, "Format nomor HP tidak valid"),
  email: z.string().email("Format email tidak valid").max(100),
  station: z.string().trim().min(2).max(100),
  hub_id: z.number().int().positive().optional().nullable(),
  username: z.string().regex(/^[a-zA-Z0-9_.-]{3,40}$/, "Username minimal 3 karakter alfanumerik"),
  password: z.string().min(6, "Kata sandi minimal 6 karakter").max(100),
});

const selfProfileSchema = z.object({
  full_name: z.string().trim().min(3).max(80).optional(),
  username: z.string().regex(/^[a-zA-Z0-9_.-]{3,40}$/).optional(),
  phone: z.string().regex(/^(\+62|62|0)8\d{7,12}$/).optional(),
  email: z.string().email().max(100).optional(),
  current_password: z.string().optional(),
  new_password: z.string().min(6).max(100).optional(),
  avatar_base64: z.string().optional(),
  avatar_content_type: z.string().max(60).optional(),
  remove_avatar: z.boolean().optional(),
});

const userUpdateSchema = z.object({
  is_active: z.boolean().optional(),
  role: z.enum(["superadmin", "admin", "supervisor", "operator", "kurir"]).optional(),
  station: z.string().trim().min(2).max(100).optional(),
  hub_id: z.number().int().positive().nullable().optional(),
});

const settingUpdateSchema = z.object({
  enabled: z.boolean(),
});

export function createAuthRouter() {
  const router = Router();

  router.post("/api/auth/login", async (req, res, next) => {
    try {
      const body = loginSchema.parse(req.body);
      const out = await AuthService.login(body.identifier, body.password);
      res.json(out);
    } catch (err) {
      next(err);
    }
  });

  router.post("/api/auth/register", async (req, res, next) => {
    try {
      const body = registerSchema.parse(req.body);
      const out = await AuthService.register(body);
      res.status(201).json(out);
    } catch (err) {
      next(err);
    }
  });

  router.get("/api/auth/me", authenticate, async (req, res, next) => {
    try {
      res.json(await AuthService.getMe(req.user.id));
    } catch (err) {
      next(err);
    }
  });

  router.patch("/api/auth/me", authenticate, async (req, res, next) => {
    try {
      const body = selfProfileSchema.parse(req.body);
      res.json(await AuthService.updateMe(req.user.id, body));
    } catch (err) {
      next(err);
    }
  });

  router.get("/api/users", ...requireRoles(Permission.MANAGE_USERS), async (req, res, next) => {
    try {
      res.json(await AuthService.listUsers(req.user.role));
    } catch (err) {
      next(err);
    }
  });

  router.patch("/api/users/:id", ...requireRoles(Permission.MANAGE_USERS), async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const body = userUpdateSchema.parse(req.body);
      res.json(await AuthService.updateUser(id, body, req.user));
    } catch (err) {
      next(err);
    }
  });

  router.get("/api/settings/public", async (_req, res, next) => {
    try {
      res.json(await AuthService.getPublicSettings());
    } catch (err) {
      next(err);
    }
  });

  router.get("/api/settings", ...requireRoles(Permission.MANAGE_SETTINGS), async (_req, res, next) => {
    try {
      res.json(await AuthService.listSettings());
    } catch (err) {
      next(err);
    }
  });

  router.patch("/api/settings/:key", ...requireRoles(Permission.MANAGE_SETTINGS), async (req, res, next) => {
    try {
      const body = settingUpdateSchema.parse(req.body);
      res.json(await AuthService.updateSetting(req.params.key, body.enabled, req.user));
    } catch (err) {
      next(err);
    }
  });

  router.get("/api/backups", ...requireRoles(Permission.VIEW_BACKUPS), async (_req, res, next) => {
    try {
      res.json(await AuthService.listBackups());
    } catch (err) {
      next(err);
    }
  });

  return router;
}
