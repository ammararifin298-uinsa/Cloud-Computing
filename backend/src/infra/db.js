import pg from "pg";
import { config } from "../core/config.js";
import { hashPassword } from "../core/security.js";
import { ServiceUnavailableError } from "../domain/errors.js";

const { Pool } = pg;

let writePool = null;
let readPool = null;

function createPool(connectionString, max) {
  return new Pool({
    connectionString,
    max,
    connectionTimeoutMillis: 3000,
    idleTimeoutMillis: 30000,
    query_timeout: config.dbStatementTimeoutMs,
  });
}

export function initPools() {
  if (!writePool) writePool = createPool(config.writeDsn, config.poolMaxWrite);
  if (!readPool) readPool = createPool(config.readDsn, config.poolMaxRead);
}

export async function closePools() {
  const tasks = [];
  if (readPool) {
    tasks.push(readPool.end());
    readPool = null;
  }
  if (writePool) {
    tasks.push(writePool.end());
    writePool = null;
  }
  await Promise.allSettled(tasks);
}

function isDbUnavailable(err) {
  const code = err?.code || "";
  const msg = String(err?.message || "");
  return (
    code === "ECONNREFUSED" ||
    code === "ETIMEDOUT" ||
    code === "ENOTFOUND" ||
    code === "57P01" ||
    code === "57P03" ||
    code === "08006" ||
    msg.includes("timeout exceeded when trying to connect") ||
    msg.includes("Connection terminated unexpectedly")
  );
}

/**
 * Unit of Work helper on the Write Pool (transactional BEGIN / COMMIT / ROLLBACK).
 */
export async function withWriteTx(fn) {
  initPools();
  let client;
  try {
    client = await writePool.connect();
  } catch (err) {
    if (isDbUnavailable(err)) {
      throw new ServiceUnavailableError(
        "Database utama sementara sibuk atau tidak tersedia. Mode baca tetap aktif.",
        3
      );
    }
    throw err;
  }

  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* ignore rollback error */
    }
    if (isDbUnavailable(err)) {
      throw new ServiceUnavailableError(
        "Database utama terputus saat transaksi. Silakan coba kembali.",
        3
      );
    }
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Read helper on the Read Replica Pool (via PgBouncer RO -> HAProxy -> db-replica).
 */
export async function withReadClient(fn) {
  initPools();
  let client;
  try {
    client = await readPool.connect();
  } catch (err) {
    if (isDbUnavailable(err)) {
      throw new ServiceUnavailableError("Database baca sementara tidak tersedia.", 2);
    }
    throw err;
  }

  try {
    return await fn(client);
  } catch (err) {
    if (isDbUnavailable(err)) {
      throw new ServiceUnavailableError("Koneksi database baca terputus.", 2);
    }
    throw err;
  } finally {
    client.release();
  }
}

export async function checkWriteReady() {
  try {
    await withWriteTx(async (c) => c.query("SELECT 1"));
    return true;
  } catch {
    return false;
  }
}

export async function checkReadReady() {
  try {
    await withReadClient(async (c) => c.query("SELECT 1"));
    return true;
  } catch {
    return false;
  }
}

export async function isFeatureEnabled(client, key) {
  const res = await client.query("SELECT enabled FROM system_settings WHERE key = $1", [key]);
  return res.rows.length === 0 ? true : Boolean(res.rows[0].enabled);
}

/**
 * Seeds default dev accounts & settings ONLY when APP_ENV=dev, using PgBouncer-safe xact lock.
 */
export async function seedDevDefaults() {
  if (config.appEnv !== "dev") return;

  await withWriteTx(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(987654321)");
    const countRes = await client.query("SELECT count(*)::int AS c FROM users");
    if (countRes.rows[0].c === 0) {
      const defaults = [
        ["SUP-0001", "superadmin", "super123", "Superadmin Infrastruktur", "3578010101900001", "081100000001", "superadmin@lacakin.id", "DC Rungkut, Surabaya", "superadmin"],
        ["ADM-0001", "admin", "admin123", "Admin Operasional", "3578010101920002", "081100000002", "admin@lacakin.id", "DC Rungkut, Surabaya", "admin"],
        ["SPV-0001", "supervisor", "spv123", "Supervisor Monitoring", "3578010101930003", "081100000003", "supervisor@lacakin.id", "DC Rungkut, Surabaya", "supervisor"],
        ["OPR-0001", "operator", "op123", "Operator Loket", "3578010101940004", "081100000004", "operator@lacakin.id", "Loket Gubeng, Surabaya", "operator"],
        ["KUR-0001", "kurir", "kurir123", "Kurir Lapangan", "3578010101950005", "081100000005", "kurir@lacakin.id", "Hub Kurir Surabaya Selatan", "kurir"],
      ];
      for (const [empCode, uname, pwd, fname, nik, phone, email, station, role] of defaults) {
        await client.query(
          `INSERT INTO users (employee_code, username, password_hash, full_name, nik, phone, email, station, role)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (username) DO NOTHING`,
          [empCode, uname, hashPassword(pwd), fname, nik, phone, email, station, role]
        );
      }
    }

    for (const [roleName, seqName] of [
      ["kurir", "emp_seq_kur"],
      ["operator", "emp_seq_opr"],
      ["supervisor", "emp_seq_spv"],
    ]) {
      await client.query(`CREATE SEQUENCE IF NOT EXISTS ${seqName} START WITH 1`);
      const roleCount = await client.query("SELECT count(*)::int AS c FROM users WHERE role = $1", [roleName]);
      await client.query(
        `SELECT setval($1, GREATEST($2::bigint, (SELECT last_value FROM ${seqName})), true)`,
        [seqName, Math.max(roleCount.rows[0].c, 1)]
      );
    }

    const defaultSettings = [
      ["public_tracking", true, "Layanan Lacak Publik", "Mengizinkan pelanggan melacak nomor resi pada halaman /lacak tanpa login."],
      ["self_register", true, "Pendaftaran Pegawai Mandiri", "Mengizinkan pendaftaran akun kurir baru melalui halaman /register (menunggu persetujuan Admin)."],
      ["checkpoint_write", true, "Input Checkpoint Operasional", "Mengaktifkan pencatatan paket baru dan update checkpoint."],
    ];
    for (const [key, enabled, label, description] of defaultSettings) {
      await client.query(
        `INSERT INTO system_settings (key, enabled, label, description)
         VALUES ($1,$2,$3,$4) ON CONFLICT (key) DO NOTHING`,
        [key, enabled, label, description]
      );
    }
  });
}
