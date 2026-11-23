import os from "node:os";

const INSECURE_DEFAULTS = new Set([
  "",
  "change-me",
  "lacakin-prod-jwt-secret-2026-change-me",
  "logistikpro-dev-secret-change-in-prod",
]);

function loadConfig() {
  const appEnv = (process.env.APP_ENV || "dev").trim().toLowerCase();
  let jwtSecret = (process.env.JWT_SECRET || "").trim();

  if (appEnv !== "dev") {
    if (INSECURE_DEFAULTS.has(jwtSecret) || jwtSecret.length < 32) {
      throw new Error(
        "JWT_SECRET wajib diisi minimal 32 karakter dan tidak boleh default pada APP_ENV != dev"
      );
    }
  } else if (!jwtSecret) {
    jwtSecret = "dev-only-jwt-secret-do-not-use-in-production-32chars";
  }

  const writeDsn =
    process.env.WRITE_DATABASE_URL ||
    process.env.DATABASE_URL ||
    "postgresql://logistik:logistik_dr_pass@pgbouncer-rw:6432/logistik";
  const readDsn = process.env.READ_DATABASE_URL || writeDsn;

  const corsRaw =
    process.env.CORS_ORIGINS ||
    "http://localhost:8000,http://localhost:8001,http://localhost:8080,http://localhost:5173";

  return Object.freeze({
    appEnv,
    port: Number(process.env.PORT || 8000),
    nodeName: process.env.APP_NODE || os.hostname(),
    writeDsn,
    readDsn,
    jwtSecret,
    jwtTtlSeconds: Number(process.env.JWT_TTL_SECONDS || 3600),
    corsOrigins: corsRaw.split(",").map((s) => s.trim()).filter(Boolean),
    backupDir: process.env.BACKUP_DIR || "/backups",
    backupInterval: Number(process.env.BACKUP_INTERVAL || 900),
    storageBackend: (process.env.STORAGE_BACKEND || "minio").trim().toLowerCase(),
    uploadsDir: process.env.UPLOADS_DIR || "/cdn-uploads",
    minioEndpoint: (process.env.MINIO_ENDPOINT || "http://minio:9000").replace(/\/+$/, ""),
    minioAccessKey: process.env.MINIO_ACCESS_KEY || "lacakin_minio",
    minioSecretKey: process.env.MINIO_SECRET_KEY || "lacakin_minio_secret_2026",
    minioBucket: process.env.MINIO_BUCKET || "lacakin-media",
    cdnPublicUrl: (process.env.CDN_PUBLIC_URL || "http://localhost:8080").replace(/\/+$/, ""),
    maxUploadBytes: Number(process.env.MAX_UPLOAD_BYTES || 5 * 1024 * 1024),
    poolMaxWrite: Number(process.env.POOL_MAX_WRITE || 10),
    poolMaxRead: Number(process.env.POOL_MAX_READ || 15),
    dbStatementTimeoutMs: Number(process.env.DB_STATEMENT_TIMEOUT_MS || 8000),
  });
}

export const config = loadConfig();
