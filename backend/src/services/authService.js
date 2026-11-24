import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { config } from "../core/config.js";
import { ROLE_PREFIX, ROLE_SEQUENCE } from "../core/authMiddleware.js";
import {
  DUMMY_PASSWORD_HASH,
  createJwt,
  hashPassword,
  maskNik,
  validateMediaMagicBytes,
  verifyPassword,
} from "../core/security.js";
import { ConflictError, DomainError, ForbiddenError, NotFoundError } from "../domain/errors.js";
import { auditBus } from "../domain/eventBus.js";
import { isFeatureEnabled, withReadClient, withWriteTx } from "../infra/db.js";
import { getStorage } from "../infra/storage.js";

function toSafeUser(row, includeFullNik = false) {
  return {
    id: row.id,
    employee_code: row.employee_code,
    username: row.username,
    full_name: row.full_name,
    nik_masked: includeFullNik ? row.nik : maskNik(row.nik),
    phone: row.phone,
    email: row.email,
    station: row.station,
    hub_id: row.hub_id ?? null,
    hub_code: row.hub_code || null,
    hub_name: row.hub_name || null,
    city_name: row.city_name || null,
    district_name: row.district_name || null,
    village_name: row.village_name || null,
    rt: row.rt || null,
    rw: row.rw || null,
    postal_code: row.postal_code || null,
    vehicle_type: row.vehicle_type || null,
    vehicle_brand: row.vehicle_brand || null,
    vehicle_model: row.vehicle_model || null,
    vehicle_year: row.vehicle_year ?? null,
    license_plate: row.license_plate || null,
    sim_number: row.sim_number || null,
    doc_ktp_url: row.doc_ktp_url || null,
    doc_sim_url: row.doc_sim_url || null,
    doc_stnk_url: row.doc_stnk_url || null,
    doc_selfie_url: row.doc_selfie_url || null,
    doc_ijazah_url: row.doc_ijazah_url || null,
    doc_skck_url: row.doc_skck_url || null,
    doc_contract_url: row.doc_contract_url || null,
    birth_place: row.birth_place || null,
    birth_date: row.birth_date || null,
    gender: row.gender || null,
    address_domicile: row.address_domicile || null,
    department: row.department || null,
    job_title: row.job_title || null,
    employment_status: row.employment_status || "PKWTT",
    join_date: row.join_date || null,
    contract_end_date: row.contract_end_date || null,
    education_last: row.education_last || null,
    emergency_contact_name: row.emergency_contact_name || null,
    emergency_contact_relation: row.emergency_contact_relation || null,
    emergency_contact_phone: row.emergency_contact_phone || null,
    npwp_masked: includeFullNik ? row.npwp || null : maskNik(row.npwp),
    bpjs_kes: row.bpjs_kes || null,
    bpjs_tk: row.bpjs_tk || null,
    bank_name: row.bank_name || null,
    bank_account_masked: includeFullNik ? row.bank_account || null : maskNik(row.bank_account),
    bank_holder: row.bank_holder || null,
    review_status: row.review_status || (row.is_active ? "approved" : "pending"),
    review_note: row.review_note || null,
    reviewed_by_name: row.reviewed_by_name || null,
    reviewed_at: row.reviewed_at || null,
    active_shipments: row.active_shipments !== undefined ? Number(row.active_shipments) : 0,
    role: row.role,
    is_active: Boolean(row.is_active),
    avatar_url: row.avatar_url || null,
    created_at: row.created_at || null,
  };
}

export class AuthService {
  static async login(identifier, password) {
    const ident = String(identifier || "").trim();
    const user = await withReadClient(async (client) => {
      const res = await client.query(
        `SELECT id, employee_code, username, password_hash, full_name, nik, phone, email,
                station, hub_id, role, is_active, avatar_url, token_version,
                failed_attempts, locked_until, created_at
         FROM users
         WHERE id IN (
           SELECT id FROM users WHERE nik = $1
           UNION ALL
           SELECT id FROM users WHERE upper(employee_code) = $2
           UNION ALL
           SELECT id FROM users WHERE lower(username) = $3
         )
         LIMIT 1`,
        [ident, ident.toUpperCase(), ident.toLowerCase()]
      );
      return res.rows[0] || null;
    });

    if (!user) {
      // Constant-time timing shield without looping all users (prevents oracle & CPU DoS)
      verifyPassword(password, DUMMY_PASSWORD_HASH);
      throw new DomainError("Identitas atau kata sandi salah.", 401);
    }

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      throw new DomainError(
        "Akun sementara dikunci karena terlalu banyak percobaan gagal. Coba lagi beberapa menit.",
        429
      );
    }

    const ok = verifyPassword(password, user.password_hash);
    if (!ok) {
      await withWriteTx(async (client) => {
        const nextFail = Number(user.failed_attempts || 0) + 1;
        const lockSql = nextFail >= 5 ? "clock_timestamp() + interval '5 minutes'" : "NULL";
        await client.query(
          `UPDATE users SET failed_attempts = $1, locked_until = ${lockSql} WHERE id = $2`,
          [nextFail, user.id]
        );
      });
      throw new DomainError("Identitas atau kata sandi salah.", 401);
    }

    if (!user.is_active) {
      throw new ForbiddenError("Akun pegawai Anda belum aktif atau dinonaktifkan. Hubungi Admin.");
    }

    if (Number(user.failed_attempts || 0) > 0 || user.locked_until) {
      await withWriteTx(async (client) => {
        await client.query(
          "UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = $1",
          [user.id]
        );
      });
    }

    const token = createJwt(user);
    return {
      access_token: token,
      token_type: "bearer",
      user: toSafeUser(user, false),
    };
  }

  static async forgotPassword({ identifier, verification, new_password }) {
    const cleanIdent = String(identifier || "").trim();
    const cleanVerif = String(verification || "").trim();
    const row = await withReadClient(async (client) => {
      const res = await client.query(
        `SELECT id, employee_code, username, full_name, nik, email, is_active,
                failed_attempts, locked_until
         FROM users
         WHERE LOWER(username) = LOWER($1) OR UPPER(employee_code) = UPPER($1)
         LIMIT 1`,
        [cleanIdent]
      );
      return res.rows[0] || null;
    });

    if (!row) {
      throw new DomainError("Identitas akun atau verifikasi NIK/email tidak sesuai.", 401);
    }
    if (!row.is_active) {
      throw new ForbiddenError("Akun pegawai tidak aktif atau dibekukan. Hubungi Administrator Hub.");
    }
    if (row.locked_until && new Date(row.locked_until).getTime() > Date.now()) {
      throw new DomainError(
        "Akun dikunci sementara karena terlalu banyak percobaan gagal. Coba lagi dalam 15 menit.",
        429
      );
    }

    const matchNik = row.nik && cleanVerif === String(row.nik).trim();
    const matchEmail = row.email && cleanVerif.toLowerCase() === String(row.email).trim().toLowerCase();
    if (!matchNik && !matchEmail) {
      const nextAttempts = Number(row.failed_attempts || 0) + 1;
      const shouldLock = nextAttempts >= 5;
      await withWriteTx(async (client) => {
        await client.query(
          `UPDATE users
           SET failed_attempts = $1,
               locked_until = CASE WHEN $2 THEN NOW() + INTERVAL '15 minutes' ELSE locked_until END
           WHERE id = $3`,
          [nextAttempts, shouldLock, row.id]
        );
        await auditBus.publish(client, {
          actorId: row.id,
          action: "PASSWORD_RESET_FAILED",
          targetType: "user",
          targetId: row.employee_code || String(row.id),
          afterData: { attempts: nextAttempts, locked: shouldLock },
        });
      });
      throw new DomainError("Identitas akun atau verifikasi NIK/email tidak sesuai.", 401);
    }

    const newHash = hashPassword(new_password);
    await withWriteTx(async (client) => {
      await client.query(
        `UPDATE users
         SET password_hash = $1,
             token_version = token_version + 1,
             failed_attempts = 0,
             locked_until = NULL
         WHERE id = $2`,
        [newHash, row.id]
      );
      await auditBus.publish(client, {
        actorId: row.id,
        action: "PASSWORD_RESET_SELF",
        targetType: "user",
        targetId: row.employee_code || String(row.id),
        afterData: { username: row.username },
      });
    });

    return {
      ok: true,
      message: "Kata sandi berhasil diperbarui. Silakan login menggunakan kata sandi baru.",
    };
  }

  static async uploadRegistrationDoc(buffer, docType = "ktp") {
    const allowed = new Set(["ktp", "sim", "stnk", "selfie", "ijazah", "skck", "contract"]);
    const cleanType = allowed.has(String(docType || "").toLowerCase())
      ? String(docType).toLowerCase()
      : "ktp";
    const { ext, mime } = validateMediaMagicBytes(buffer, false);
    const objectKey = `courier-docs/${cleanType}-${crypto.randomUUID()}${ext}`;
    const storage = getStorage();
    await storage.putObject({ objectKey, buffer, contentType: mime });
    return {
      object_key: objectKey,
      url: `/uploads/${objectKey}`,
    };
  }

  static async register(input) {
    const uname = input.username.trim().toLowerCase();
    const email = input.email.trim().toLowerCase();
    const role = "kurir"; // Public self-register strictly restricted to kurir (pending approval)
    const seqName = ROLE_SEQUENCE[role];
    const prefix = ROLE_PREFIX[role];

    try {
      const row = await withWriteTx(async (client) => {
        if (!(await isFeatureEnabled(client, "self_register"))) {
          throw new ForbiddenError("Pendaftaran pegawai mandiri sedang dinonaktifkan oleh Superadmin.");
        }
        const seqRes = await client.query(`SELECT nextval('${seqName}') AS n`);
        const empCode = `${prefix}-${String(seqRes.rows[0].n).padStart(4, "0")}`;

        const ins = await client.query(
          `INSERT INTO users (
             employee_code, username, password_hash, full_name, nik, phone, email,
             station, hub_id, role, is_active,
             city_id, district_id, village_id, rt, rw, postal_code,
             vehicle_type, vehicle_model_id, vehicle_year, plate_number, sim_number,
             doc_ktp_url, doc_sim_url, doc_stnk_url, doc_selfie_url, review_status
           )
           VALUES (
             $1,$2,$3,$4,$5,$6,$7,
             $8,$9,$10,FALSE,
             $11,$12,$13,$14,$15,$16,
             $17,$18,$19,$20,$21,
             $22,$23,$24,$25,'pending'
           )
           RETURNING id, employee_code, username, full_name, nik, phone, email, station, hub_id,
                     role, is_active, avatar_url, doc_ktp_url, doc_sim_url, doc_stnk_url, doc_selfie_url,
                     review_status, created_at`,
          [
            empCode,
            uname,
            hashPassword(input.password),
            input.full_name.trim(),
            input.nik,
            input.phone.trim(),
            email,
            input.station.trim(),
            input.hub_id ?? null,
            role,
            input.city_id ?? null,
            input.district_id ?? null,
            input.village_id ?? null,
            input.rt ?? null,
            input.rw ?? null,
            input.postal_code ?? null,
            input.vehicle_type ?? null,
            input.vehicle_model_id ?? null,
            input.vehicle_year ?? null,
            input.plate_number ?? null,
            input.sim_number ?? null,
            input.doc_ktp_url ?? null,
            input.doc_sim_url ?? null,
            input.doc_stnk_url ?? null,
            input.doc_selfie_url ?? null,
          ]
        );
        const created = ins.rows[0];
        await auditBus.publish(client, {
          actorId: created.id,
          action: "USER_SELF_REGISTER_PENDING",
          targetType: "user",
          targetId: created.employee_code,
          afterData: { role: created.role, is_active: false, review_status: "pending" },
        });
        return created;
      });

      return {
        status: "pending_approval",
        message: "Pendaftaran berhasil. Dokumen Anda akan ditinjau oleh Admin atau Supervisor sebelum akun aktif.",
        user: toSafeUser(row, false),
      };
    } catch (err) {
      if (err?.code === "23505") {
        throw new ConflictError("Username, NIK, atau Email sudah terdaftar.");
      }
      throw err;
    }
  }

  static async createUserByAdmin(input, actor) {
    if (actor.role === "admin" && ["admin", "superadmin"].includes(input.role)) {
      throw new ForbiddenError("Admin hanya boleh membuat akun di bawah jabatan Admin (Supervisor, Operator, Kurir).");
    }

    const uname = input.username.trim().toLowerCase();
    const email = input.email.trim().toLowerCase();
    const prefix = ROLE_PREFIX[input.role] || "PGW";
    const seqName = ROLE_SEQUENCE[input.role] || "emp_seq_adm";

    try {
      const row = await withWriteTx(async (client) => {
        if (seqName === "emp_seq_adm") {
          await client.query("CREATE SEQUENCE IF NOT EXISTS emp_seq_adm START 10");
        }
        const seqRes = await client.query(`SELECT nextval('${seqName}') AS n`);
        const empCode = `${prefix}-${String(seqRes.rows[0].n).padStart(4, "0")}`;

        const ins = await client.query(
          `INSERT INTO users (
             employee_code, username, password_hash, full_name, nik, phone, email,
             station, hub_id, role, is_active, review_status,
             department, job_title, employment_status, join_date,
             gender, birth_place, birth_date, address_domicile, education_last,
             emergency_contact_name, emergency_contact_relation, emergency_contact_phone,
             npwp, bpjs_kes, bpjs_tk, bank_name, bank_account, bank_holder,
             city_id, district_id, village_id, rt, rw, postal_code,
             vehicle_type, vehicle_model_id, vehicle_year, plate_number, sim_number,
             doc_ktp_url, doc_sim_url, doc_stnk_url, doc_selfie_url,
             doc_ijazah_url, doc_skck_url, doc_contract_url
           )
           VALUES (
             $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'approved',
             $12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,
             $30,$31,$32,$33,$34,$35,$36,$37,$38,$39,$40,$41,$42,$43,$44,$45,$46,$47
           )
           RETURNING *`,
          [
            empCode,
            uname,
            hashPassword(input.password),
            input.full_name.trim(),
            input.nik,
            input.phone.trim(),
            email,
            input.station.trim(),
            input.hub_id ?? null,
            input.role,
            input.is_active !== false,
            input.department?.trim() || null,
            input.job_title?.trim() || null,
            input.employment_status || "PKWTT",
            input.join_date || null,
            input.gender || null,
            input.birth_place?.trim() || null,
            input.birth_date || null,
            input.address_domicile?.trim() || null,
            input.education_last?.trim() || null,
            input.emergency_contact_name?.trim() || null,
            input.emergency_contact_relation?.trim() || null,
            input.emergency_contact_phone?.trim() || null,
            input.npwp?.trim() || null,
            input.bpjs_kes?.trim() || null,
            input.bpjs_tk?.trim() || null,
            input.bank_name?.trim() || null,
            input.bank_account?.trim() || null,
            input.bank_holder?.trim() || null,
            input.city_id ?? null,
            input.district_id ?? null,
            input.village_id ?? null,
            input.rt?.trim() || null,
            input.rw?.trim() || null,
            input.postal_code?.trim() || null,
            input.vehicle_type || null,
            input.vehicle_model_id ?? null,
            input.vehicle_year ?? null,
            input.plate_number?.trim() || null,
            input.sim_number?.trim() || null,
            input.doc_ktp_url || null,
            input.doc_sim_url || null,
            input.doc_stnk_url || null,
            input.doc_selfie_url || null,
            input.doc_ijazah_url || null,
            input.doc_skck_url || null,
            input.doc_contract_url || null,
          ]
        );
        const created = ins.rows[0];
        await auditBus.publish(client, {
          actorId: actor.id,
          action: "USER_CREATED_BY_ADMIN",
          targetType: "user",
          targetId: created.employee_code,
          afterData: { role: created.role, is_active: created.is_active, station: created.station },
        });
        return created;
      });

      return {
        message: `Akun ${row.full_name} (${row.employee_code}) berhasil dibuat dan diaktifkan.`,
        user: toSafeUser(row, actor.role === "superadmin"),
      };
    } catch (err) {
      if (err?.code === "23505") {
        throw new ConflictError("Username, NIK, atau Email sudah terdaftar.");
      }
      throw err;
    }
  }

  static async getMe(userId) {
    const row = await withReadClient(async (client) => {
      const res = await client.query(
        `SELECT id, employee_code, username, full_name, nik, phone, email, station, hub_id, role, is_active, avatar_url, created_at
         FROM users WHERE id = $1`,
        [userId]
      );
      return res.rows[0] || null;
    });
    if (!row) throw new NotFoundError("Akun pengguna tidak ditemukan");
    return toSafeUser(row, false);
  }

  static async updateMe(userId, body) {
    try {
      const updated = await withWriteTx(async (client) => {
        const curRes = await client.query(
          `SELECT id, employee_code, username, password_hash, full_name, nik, phone, email,
                  station, hub_id, role, is_active, avatar_url, token_version, created_at
           FROM users WHERE id = $1 FOR UPDATE`,
          [userId]
        );
        const cur = curRes.rows[0];
        if (!cur) throw new NotFoundError("Akun tidak ditemukan");

        const newUname = body.username ? body.username.trim().toLowerCase() : cur.username;
        const newEmail = body.email ? body.email.trim().toLowerCase() : cur.email;
        const newFname = body.full_name ? body.full_name.trim() : cur.full_name;
        const newPhone = body.phone ? body.phone.trim() : cur.phone;
        let newHash = cur.password_hash;
        let newTokenVersion = Number(cur.token_version ?? 1);
        let newAvatar = cur.avatar_url;

        if (body.new_password) {
          if (!body.current_password || !verifyPassword(body.current_password, cur.password_hash)) {
            throw new DomainError("Kata sandi saat ini tidak sesuai", 400);
          }
          newHash = hashPassword(body.new_password);
          newTokenVersion += 1; // Revoke old sessions
        }

        if (body.remove_avatar) {
          newAvatar = null;
        } else if (body.avatar_base64) {
          const raw = Buffer.from(body.avatar_base64, "base64");
          if (raw.length > config.maxUploadBytes) {
            throw new DomainError("Ukuran foto profil maksimal 5 MB", 413);
          }
          const { ext, mime } = validateMediaMagicBytes(raw, false);
          const key = `avatar_${crypto.randomUUID().replace(/-/g, "")}${ext}`;
          await getStorage().put(key, raw, mime);
          newAvatar = `/uploads/${key}`;
        }

        const upd = await client.query(
          `UPDATE users
           SET full_name = $1, username = $2, phone = $3, email = $4,
               password_hash = $5, avatar_url = $6, token_version = $7
           WHERE id = $8
           RETURNING id, employee_code, username, full_name, nik, phone, email, station, hub_id, role, is_active, avatar_url, token_version, created_at`,
          [newFname, newUname, newPhone, newEmail, newHash, newAvatar, newTokenVersion, userId]
        );
        return upd.rows[0];
      });

      const token = createJwt(updated);
      return { access_token: token, token_type: "bearer", user: toSafeUser(updated, false) };
    } catch (err) {
      if (err?.code === "23505") {
        throw new ConflictError("Username atau Email sudah digunakan oleh pegawai lain.");
      }
      throw err;
    }
  }

  static async listUsers(actorRole) {
    const rows = await withReadClient(async (client) => {
      const res = await client.query(
        `SELECT u.id, u.employee_code, u.username, u.full_name, u.nik, u.phone, u.email,
                u.station, u.hub_id, h.code AS hub_code, h.name AS hub_name,
                c.name AS city_name, d.name AS district_name, v.name AS village_name,
                u.rt, u.rw, u.postal_code,
                u.vehicle_type, vm.brand AS vehicle_brand, vm.model AS vehicle_model,
                u.vehicle_year, u.plate_number AS license_plate, u.sim_number,
                u.doc_ktp_url, u.doc_sim_url, u.doc_stnk_url, u.doc_selfie_url,
                u.doc_ijazah_url, u.doc_skck_url, u.doc_contract_url,
                u.birth_place, u.birth_date, u.gender, u.address_domicile,
                u.department, u.job_title, u.employment_status, u.join_date, u.contract_end_date, u.education_last,
                u.emergency_contact_name, u.emergency_contact_relation, u.emergency_contact_phone,
                u.npwp, u.bpjs_kes, u.bpjs_tk, u.bank_name, u.bank_account, u.bank_holder,
                u.review_status, u.review_note, u.reviewed_at,
                rb.full_name AS reviewed_by_name,
                u.role, u.is_active, u.avatar_url, u.created_at,
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
         LEFT JOIN cities c ON c.id = u.city_id
         LEFT JOIN districts d ON d.id = u.district_id
         LEFT JOIN villages v ON v.id = u.village_id
         LEFT JOIN vehicle_models vm ON vm.id = u.vehicle_model_id
         LEFT JOIN users rb ON rb.id = u.reviewed_by
         ORDER BY u.id ASC`
      );
      return res.rows;
    });
    return rows.map((r) => toSafeUser(r, ["superadmin", "admin"].includes(actorRole)));
  }

  static async listCourierApplications(actorRole) {
    const all = await AuthService.listUsers(actorRole);
    return all.filter((u) => u.role === "kurir");
  }

  static async reviewCourierApplication(targetId, { review_status, review_note = null }, actor) {
    const updated = await withWriteTx(async (client) => {
      const tRes = await client.query(
        `SELECT id, employee_code, role, is_active, review_status, review_note, token_version
         FROM users WHERE id = $1 FOR UPDATE`,
        [targetId]
      );
      const target = tRes.rows[0];
      if (!target) throw new NotFoundError("Data kurir tidak ditemukan");
      if (target.role !== "kurir") {
        throw new ForbiddenError("Review dokumen hanya berlaku untuk akun kurir.");
      }

      const nextActive = review_status === "approved";
      const shouldRevoke = !nextActive;
      const upd = await client.query(
        `UPDATE users
         SET review_status = $1,
             review_note = $2,
             reviewed_by = $3,
             reviewed_at = clock_timestamp(),
             is_active = $4,
             token_version = CASE WHEN $5 THEN token_version + 1 ELSE token_version END
         WHERE id = $6
         RETURNING id, employee_code, username, full_name, nik, phone, email, station, hub_id,
                   role, is_active, avatar_url, doc_ktp_url, doc_sim_url, doc_stnk_url, doc_selfie_url,
                   review_status, review_note, reviewed_at, created_at`,
        [
          review_status,
          review_note ? String(review_note).trim() : null,
          actor.id,
          nextActive,
          shouldRevoke,
          target.id,
        ]
      );

      await auditBus.publish(client, {
        actorId: actor.id,
        action: `COURIER_APPLICATION_${review_status.toUpperCase()}`,
        targetType: "user",
        targetId: target.employee_code,
        beforeData: { is_active: target.is_active, review_status: target.review_status },
        afterData: { is_active: nextActive, review_status, review_note },
      });

      return upd.rows[0];
    });
    return toSafeUser(updated, ["superadmin", "admin"].includes(actor.role));
  }

  static async updateUser(targetId, body, actor) {
    const updated = await withWriteTx(async (client) => {
      const tRes = await client.query(
        "SELECT id, employee_code, role, is_active, station, hub_id, token_version FROM users WHERE id = $1 FOR UPDATE",
        [targetId]
      );
      const target = tRes.rows[0];
      if (!target) throw new NotFoundError("Pegawai tidak ditemukan");

      if (target.id === actor.id && body.is_active === false) {
        throw new DomainError("Anda tidak dapat menonaktifkan akun Anda sendiri", 400);
      }
      if (target.id === actor.id && body.role && body.role !== target.role) {
        throw new DomainError("Anda tidak dapat mengubah jabatan akun Anda sendiri", 400);
      }

      if (actor.role === "admin") {
        if (target.role === "superadmin" || target.role === "admin") {
          throw new ForbiddenError("Admin hanya boleh mengelola role di bawah Admin.");
        }
        if (body.role === "superadmin" || body.role === "admin") {
          throw new ForbiddenError("Admin tidak dapat menaikkan jabatan menjadi Admin atau Superadmin.");
        }
      }

      const newActive = body.is_active === undefined ? target.is_active : body.is_active;
      const newRole = body.role === undefined ? target.role : body.role;
      const newStation = body.station === undefined ? target.station : body.station.trim();
      const newHubId = body.hub_id === undefined ? target.hub_id : body.hub_id;

      // Guarantee at least one active superadmin always remains
      if (target.role === "superadmin" && (!newActive || newRole !== "superadmin")) {
        const saRes = await client.query(
          "SELECT id FROM users WHERE role = 'superadmin' AND is_active = TRUE FOR UPDATE"
        );
        if (saRes.rows.length <= 1) {
          throw new DomainError("Sistem harus memiliki minimal satu Superadmin aktif.", 400);
        }
      }

      const shouldRevoke = newActive !== target.is_active || newRole !== target.role;
      const nextTv = Number(target.token_version ?? 1) + (shouldRevoke ? 1 : 0);

      const upd = await client.query(
        `UPDATE users
         SET is_active = $1, role = $2, station = $3, hub_id = $4, token_version = $5,
             department = COALESCE($6, department),
             job_title = COALESCE($7, job_title),
             employment_status = COALESCE($8, employment_status),
             join_date = COALESCE($9, join_date),
             contract_end_date = COALESCE($10, contract_end_date),
             address_domicile = COALESCE($11, address_domicile),
             education_last = COALESCE($12, education_last),
             emergency_contact_name = COALESCE($13, emergency_contact_name),
             emergency_contact_relation = COALESCE($14, emergency_contact_relation),
             emergency_contact_phone = COALESCE($15, emergency_contact_phone),
             npwp = COALESCE($16, npwp),
             bpjs_kes = COALESCE($17, bpjs_kes),
             bpjs_tk = COALESCE($18, bpjs_tk),
             bank_name = COALESCE($19, bank_name),
             bank_account = COALESCE($20, bank_account),
             bank_holder = COALESCE($21, bank_holder)
         WHERE id = $22
         RETURNING *`,
        [
          newActive,
          newRole,
          newStation,
          newHubId,
          nextTv,
          body.department ?? null,
          body.job_title ?? null,
          body.employment_status ?? null,
          body.join_date ?? null,
          body.contract_end_date ?? null,
          body.address_domicile ?? null,
          body.education_last ?? null,
          body.emergency_contact_name ?? null,
          body.emergency_contact_relation ?? null,
          body.emergency_contact_phone ?? null,
          body.npwp ?? null,
          body.bpjs_kes ?? null,
          body.bpjs_tk ?? null,
          body.bank_name ?? null,
          body.bank_account ?? null,
          body.bank_holder ?? null,
          targetId,
        ]
      );

      await auditBus.publish(client, {
        actorId: actor.id,
        action: "USER_UPDATED",
        targetType: "user",
        targetId: target.employee_code,
        beforeData: { is_active: target.is_active, role: target.role, station: target.station, hub_id: target.hub_id },
        afterData: { is_active: newActive, role: newRole, station: newStation, hub_id: newHubId },
      });

      return upd.rows[0];
    });
    return toSafeUser(updated, ["superadmin", "admin"].includes(actor.role));
  }

  static async uploadEmployeeDoc(targetId, buffer, docType, actor) {
    const colMap = {
      ktp: "doc_ktp_url",
      ijazah: "doc_ijazah_url",
      skck: "doc_skck_url",
      contract: "doc_contract_url",
    };
    const col = colMap[String(docType || "").toLowerCase()];
    if (!col) throw new DomainError("Jenis dokumen pegawai tidak valid.", 422);

    const { ext, mime } = validateMediaMagicBytes(buffer, false);
    const objectKey = `employee-docs/${targetId}-${docType}-${crypto.randomUUID()}${ext}`;
    const storage = getStorage();
    await storage.putObject({ objectKey, buffer, contentType: mime });
    const url = `/uploads/${objectKey}`;

    const updated = await withWriteTx(async (client) => {
      const res = await client.query(
        `UPDATE users SET ${col} = $1 WHERE id = $2 RETURNING *`,
        [url, targetId]
      );
      if (!res.rows.length) throw new NotFoundError("Pegawai tidak ditemukan");
      await auditBus.publish(client, {
        actorId: actor.id,
        action: "EMPLOYEE_DOC_UPLOADED",
        targetType: "user",
        targetId: res.rows[0].employee_code,
        afterData: { doc_type: docType, url },
      });
      return res.rows[0];
    });
    return toSafeUser(updated, ["superadmin", "admin"].includes(actor.role));
  }

  static async getPublicSettings() {
    const rows = await withReadClient(async (client) => {
      const res = await client.query("SELECT key, enabled FROM system_settings");
      return res.rows;
    });
    return Object.fromEntries(rows.map((r) => [r.key, r.enabled]));
  }

  static async listSettings() {
    return withReadClient(async (client) => {
      const res = await client.query(
        "SELECT key, enabled, label, description, updated_at FROM system_settings ORDER BY key ASC"
      );
      return res.rows;
    });
  }

  static async updateSetting(key, enabled, actor) {
    return withWriteTx(async (client) => {
      const beforeRes = await client.query("SELECT key, enabled FROM system_settings WHERE key = $1 FOR UPDATE", [key]);
      if (!beforeRes.rows.length) throw new NotFoundError("Pengaturan fitur tidak ditemukan");
      const res = await client.query(
        `UPDATE system_settings SET enabled = $1, updated_at = clock_timestamp()
         WHERE key = $2
         RETURNING key, enabled, label, description, updated_at`,
        [enabled, key]
      );
      await auditBus.publish(client, {
        actorId: actor.id,
        action: "SETTING_UPDATED",
        targetType: "system_setting",
        targetId: key,
        beforeData: beforeRes.rows[0],
        afterData: { key, enabled },
      });
      return res.rows[0];
    });
  }

  static async listBackups() {
    const files = [];
    try {
      const names = await fs.readdir(config.backupDir);
      for (const name of names) {
        if (!name.startsWith("logistik_") || !name.endsWith(".dump")) continue;
        const full = path.join(config.backupDir, name);
        const st = await fs.stat(full);
        let sha256 = "";
        try {
          const rawSha = await fs.readFile(`${full}.sha256`, "utf8");
          sha256 = rawSha.trim().split(/\s+/)[0] || "";
        } catch {
          /* sha file optional */
        }
        files.push({
          name,
          size_bytes: st.size,
          sha256,
          created_at: st.mtime.toISOString(),
        });
      }
      files.sort((a, b) => b.created_at.localeCompare(a.created_at));
    } catch {
      /* backup dir may not exist locally */
    }

    let dbCluster = { role: "Primary + Multi Read Replica", standby_count: 0 };
    try {
      dbCluster = await withWriteTx(async (client) => {
        const rec = await client.query("SELECT pg_is_in_recovery() AS r");
        const rep = await client.query("SELECT count(*)::int AS c FROM pg_stat_replication");
        return {
          role: rec.rows[0].r ? "Standby" : "Primary (Read-Write)",
          standby_count: rep.rows[0].c,
        };
      });
    } catch {
      /* degraded */
    }

    return {
      app_node: config.nodeName,
      interval_seconds: config.backupInterval,
      retention_hours: 24,
      storage: "Dedicated DR Backup Volume (/backups, terpisah dari MinIO media)",
      db_cluster: dbCluster,
      files,
    };
  }
}
