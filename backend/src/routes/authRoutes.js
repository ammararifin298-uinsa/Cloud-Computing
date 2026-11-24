import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { config } from "../core/config.js";
import { Permission, authenticate, requireRoles } from "../core/authMiddleware.js";
import { DomainError } from "../domain/errors.js";
import { AuthService } from "../services/authService.js";

const docUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxUploadBytes },
});

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
  hub_id: z.coerce.number().int().positive().optional().nullable(),
  city_id: z.coerce.number().int().positive().optional().nullable(),
  district_id: z.coerce.number().int().positive().optional().nullable(),
  village_id: z.coerce.number().int().positive().optional().nullable(),
  rt: z.string().trim().max(5).optional().nullable(),
  rw: z.string().trim().max(5).optional().nullable(),
  postal_code: z.string().trim().max(10).optional().nullable(),
  vehicle_type: z.string().trim().max(50).optional().nullable(),
  vehicle_model_id: z.coerce.number().int().positive().optional().nullable(),
  vehicle_year: z.coerce.number().int().min(1990).max(2027).optional().nullable(),
  plate_number: z.string().trim().max(20).optional().nullable(),
  sim_number: z.string().trim().max(30).optional().nullable(),
  doc_ktp_url: z.string().trim().max(240).optional().nullable(),
  doc_sim_url: z.string().trim().max(240).optional().nullable(),
  doc_stnk_url: z.string().trim().max(240).optional().nullable(),
  doc_selfie_url: z.string().trim().max(240).optional().nullable(),
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

const hrFieldsSchema = {
  department: z.string().trim().max(80).optional().nullable(),
  job_title: z.string().trim().max(80).optional().nullable(),
  employment_status: z.enum(["PKWTT", "PKWT", "MAGANG"]).optional(),
  join_date: z.string().trim().max(20).optional().nullable(),
  contract_end_date: z.string().trim().max(20).optional().nullable(),
  gender: z.enum(["L", "P"]).optional().nullable(),
  birth_place: z.string().trim().max(80).optional().nullable(),
  birth_date: z.string().trim().max(20).optional().nullable(),
  address_domicile: z.string().trim().max(250).optional().nullable(),
  education_last: z.string().trim().max(120).optional().nullable(),
  emergency_contact_name: z.string().trim().max(100).optional().nullable(),
  emergency_contact_relation: z.string().trim().max(60).optional().nullable(),
  emergency_contact_phone: z.string().trim().max(30).optional().nullable(),
  npwp: z.string().trim().max(30).optional().nullable(),
  bpjs_kes: z.string().trim().max(30).optional().nullable(),
  bpjs_tk: z.string().trim().max(30).optional().nullable(),
  bank_name: z.string().trim().max(40).optional().nullable(),
  bank_account: z.string().trim().max(40).optional().nullable(),
  bank_holder: z.string().trim().max(100).optional().nullable(),
  city_id: z.coerce.number().int().positive().optional().nullable(),
  district_id: z.coerce.number().int().positive().optional().nullable(),
  village_id: z.coerce.number().int().positive().optional().nullable(),
  rt: z.string().trim().max(5).optional().nullable(),
  rw: z.string().trim().max(5).optional().nullable(),
  postal_code: z.string().trim().max(10).optional().nullable(),
  vehicle_type: z.string().trim().max(50).optional().nullable(),
  vehicle_model_id: z.coerce.number().int().positive().optional().nullable(),
  vehicle_year: z.coerce.number().int().min(1990).max(2027).optional().nullable(),
  plate_number: z.string().trim().max(20).optional().nullable(),
  sim_number: z.string().trim().max(30).optional().nullable(),
  doc_ktp_url: z.string().trim().max(240).optional().nullable(),
  doc_sim_url: z.string().trim().max(240).optional().nullable(),
  doc_stnk_url: z.string().trim().max(240).optional().nullable(),
  doc_selfie_url: z.string().trim().max(240).optional().nullable(),
  doc_ijazah_url: z.string().trim().max(240).optional().nullable(),
  doc_skck_url: z.string().trim().max(240).optional().nullable(),
  doc_contract_url: z.string().trim().max(240).optional().nullable(),
};

const userUpdateSchema = z.object({
  is_active: z.boolean().optional(),
  role: z.enum(["superadmin", "admin", "supervisor", "operator", "kurir"]).optional(),
  station: z.string().trim().min(2).max(100).optional(),
  hub_id: z.number().int().positive().nullable().optional(),
  ...hrFieldsSchema,
});

const adminCreateUserSchema = z.object({
  role: z.enum(["admin", "supervisor", "operator", "kurir"]),
  full_name: z.string().trim().min(3).max(80),
  nik: z.string().regex(/^\d{16}$/, "NIK harus tepat 16 digit angka"),
  phone: z.string().regex(/^(\+62|62|0)8\d{7,12}$/, "Format nomor HP tidak valid"),
  email: z.string().email("Format email tidak valid").max(100),
  station: z.string().trim().min(2).max(100),
  hub_id: z.number().int().positive().optional().nullable(),
  username: z.string().regex(/^[a-zA-Z0-9_.-]{3,40}$/, "Username minimal 3 karakter alfanumerik"),
  password: z.string().min(6, "Kata sandi minimal 6 karakter").max(100),
  is_active: z.boolean().default(true),
  ...hrFieldsSchema,
});

const settingUpdateSchema = z.object({
  enabled: z.boolean(),
});

const forgotPasswordSchema = z.object({
  identifier: z.string().trim().min(2).max(100),
  verification: z.string().trim().min(4).max(120),
  new_password: z.string().min(6).max(128),
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

  router.post("/api/auth/forgot-password", async (req, res, next) => {
    try {
      const body = forgotPasswordSchema.parse(req.body);
      const out = await AuthService.forgotPassword(body);
      res.json(out);
    } catch (err) {
      next(err);
    }
  });

  router.post("/api/auth/register-doc", docUpload.single("file"), async (req, res, next) => {
    try {
      if (!req.file?.buffer) {
        throw new DomainError("File dokumen wajib dilampirkan", 422);
      }
      const docType = req.body?.doc_type || "ktp";
      const out = await AuthService.uploadRegistrationDoc(req.file.buffer, docType);
      res.status(201).json(out);
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

  router.get("/api/couriers/applications", ...requireRoles(Permission.REVIEW_COURIERS), async (req, res, next) => {
    try {
      res.json(await AuthService.listCourierApplications(req.user.role));
    } catch (err) {
      next(err);
    }
  });

  router.patch("/api/couriers/applications/:id", ...requireRoles(Permission.REVIEW_COURIERS), async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const schema = z.object({
        review_status: z.enum(["pending", "approved", "revision", "rejected"]),
        review_note: z.string().trim().max(400).optional().nullable(),
      });
      const body = schema.parse(req.body);
      res.json(await AuthService.reviewCourierApplication(id, body, req.user));
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

  router.post("/api/users", ...requireRoles(Permission.MANAGE_USERS), async (req, res, next) => {
    try {
      const body = adminCreateUserSchema.parse(req.body);
      const out = await AuthService.createUserByAdmin(body, req.user);
      res.status(201).json(out);
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

  router.post(
    "/api/users/upload-doc",
    ...requireRoles(Permission.MANAGE_USERS),
    docUpload.single("file"),
    async (req, res, next) => {
      try {
        if (!req.file?.buffer) {
          throw new DomainError("File dokumen wajib dilampirkan", 422);
        }
        const docType = req.body?.doc_type || "ktp";
        res.status(201).json(await AuthService.uploadRegistrationDoc(req.file.buffer, docType));
      } catch (err) {
        next(err);
      }
    }
  );

  router.post(
    "/api/users/:id/docs",
    ...requireRoles(Permission.MANAGE_USERS),
    docUpload.single("file"),
    async (req, res, next) => {
      try {
        const id = Number(req.params.id);
        if (!req.file?.buffer) {
          throw new DomainError("File dokumen wajib dilampirkan", 422);
        }
        const docType = req.body?.doc_type || "ktp";
        res.status(201).json(await AuthService.uploadEmployeeDoc(id, req.file.buffer, docType, req.user));
      } catch (err) {
        next(err);
      }
    }
  );

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
