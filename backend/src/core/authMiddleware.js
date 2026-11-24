import { decodeJwt } from "./security.js";
import { DomainError, ForbiddenError } from "../domain/errors.js";
import { withReadClient } from "../infra/db.js";

export const Role = Object.freeze({
  SUPERADMIN: "superadmin",
  ADMIN: "admin",
  SUPERVISOR: "supervisor",
  OPERATOR: "operator",
  KURIR: "kurir",
});

export const ROLE_PREFIX = Object.freeze({
  superadmin: "SUP",
  admin: "ADM",
  supervisor: "SPV",
  operator: "OPR",
  kurir: "KUR",
});

export const ROLE_SEQUENCE = Object.freeze({
  kurir: "emp_seq_kur",
  operator: "emp_seq_opr",
  supervisor: "emp_seq_spv",
});

export const Permission = Object.freeze({
  WRITE_ORDER: [Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN],
  WRITE_EVENT: [Role.KURIR, Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN],
  UPLOAD_PROOF: [Role.KURIR, Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN],
  DELETE_SHIPMENT: [Role.ADMIN, Role.SUPERADMIN],
  DELETE_PROOF: [Role.ADMIN, Role.SUPERADMIN],
  MANAGE_USERS: [Role.ADMIN, Role.SUPERADMIN],
  REVIEW_COURIERS: [Role.SUPERVISOR, Role.ADMIN, Role.SUPERADMIN],
  MANAGE_SETTINGS: [Role.SUPERADMIN],
  VIEW_BACKUPS: [Role.SUPERADMIN],
  ASSIGN_SHIPMENT: [Role.OPERATOR, Role.SUPERVISOR, Role.ADMIN, Role.SUPERADMIN],
  VIEW_INTERNAL_LIST: [Role.KURIR, Role.OPERATOR, Role.SUPERVISOR, Role.ADMIN, Role.SUPERADMIN],
});

async function loadActiveUser(payload) {
  const uid = Number(payload.sub);
  const tokenVer = Number(payload.tv ?? 1);
  const row = await withReadClient(async (client) => {
    const res = await client.query(
      `SELECT id, employee_code, username, full_name, role, station, hub_id, is_active, token_version
       FROM users WHERE id = $1`,
      [uid]
    );
    return res.rows[0] || null;
  });

  if (!row) throw new DomainError("Akun pegawai tidak ditemukan", 401);
  if (!row.is_active) {
    throw new ForbiddenError("Akun Anda sedang dinonaktifkan atau belum disetujui Admin.");
  }
  if (Number(row.token_version ?? 1) !== tokenVer) {
    throw new DomainError("Sesi telah dicabut. Silakan login kembali.", 401);
  }
  return {
    ...payload,
    id: row.id,
    employee_code: row.employee_code,
    username: row.username,
    full_name: row.full_name,
    role: row.role,
    station: row.station || "",
    hub_id: row.hub_id ?? null,
  };
}

export async function authenticate(req, _res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new DomainError("Autentikasi diperlukan", 401);
    }
    const payload = decodeJwt(authHeader.slice(7).trim());
    req.user = await loadActiveUser(payload);
    next();
  } catch (err) {
    next(err);
  }
}

export async function optionalAuth(req, _res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      req.user = null;
      return next();
    }
    if (!authHeader.startsWith("Bearer ")) {
      throw new DomainError("Format header Authorization tidak valid", 401);
    }
    const payload = decodeJwt(authHeader.slice(7).trim());
    req.user = await loadActiveUser(payload);
    next();
  } catch (err) {
    next(err);
  }
}

export function requireRoles(...allowedRoles) {
  const allowed = new Set(allowedRoles.flat());
  return [
    authenticate,
    (req, _res, next) => {
      if (!req.user || !allowed.has(req.user.role)) {
        return next(
          new ForbiddenError(`Akses ditolak: fitur ini khusus role ${[...allowed].sort().join(", ")}`)
        );
      }
      next();
    },
  ];
}
