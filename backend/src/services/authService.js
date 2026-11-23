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
          `INSERT INTO users (employee_code, username, password_hash, full_name, nik, phone, email, station, hub_id, role, is_active)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,FALSE)
           RETURNING id, employee_code, username, full_name, nik, phone, email, station, hub_id, role, is_active, avatar_url, created_at`,
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
          ]
        );
        const created = ins.rows[0];
        await auditBus.publish(client, {
          actorId: created.id,
          action: "USER_SELF_REGISTER_PENDING",
          targetType: "user",
          targetId: created.employee_code,
          afterData: { role: created.role, is_active: false },
        });
        return created;
      });

      return {
        status: "pending_approval",
        message: "Pendaftaran berhasil. Akun menunggu persetujuan Admin sebelum dapat digunakan login.",
        user: toSafeUser(row, false),
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
        `SELECT id, employee_code, username, full_name, nik, phone, email, station, hub_id, role, is_active, avatar_url, created_at
         FROM users ORDER BY id ASC`
      );
      return res.rows;
    });
    return rows.map((r) => toSafeUser(r, actorRole === "superadmin"));
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
         SET is_active = $1, role = $2, station = $3, hub_id = $4, token_version = $5
         WHERE id = $6
         RETURNING id, employee_code, username, full_name, nik, phone, email, station, hub_id, role, is_active, avatar_url, created_at`,
        [newActive, newRole, newStation, newHubId, nextTv, targetId]
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
    return toSafeUser(updated, actor.role === "superadmin");
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
