import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { config } from "./config.js";
import { DomainError } from "../domain/errors.js";

const PBKDF2_ITERATIONS = 260_000;

export function hashPassword(password, iterations = PBKDF2_ITERATIONS) {
  const salt = crypto.randomBytes(16).toString("hex");
  const dk = crypto.pbkdf2Sync(password, salt, iterations, 32, "sha256").toString("hex");
  return `pbkdf2_sha256$${iterations}$${salt}$${dk}`;
}

export const DUMMY_PASSWORD_HASH = hashPassword("dummy-timing-shield-never-matches", 120_000);

export function verifyPassword(password, storedHash) {
  try {
    const parts = String(storedHash).split("$");
    if (parts.length !== 4 || parts[0] !== "pbkdf2_sha256") return false;
    const iterations = Number(parts[1]);
    const salt = parts[2];
    const digestHex = parts[3];
    const dk = crypto.pbkdf2Sync(password, salt, iterations, 32, "sha256");
    const expected = Buffer.from(digestHex, "hex");
    if (dk.length !== expected.length) return false;
    return crypto.timingSafeEqual(dk, expected);
  } catch {
    return false;
  }
}

export function createJwt(user) {
  const nowSec = Math.floor(Date.now() / 1000);
  const payload = {
    sub: String(user.id),
    iss: "lacakin-auth",
    iat: nowSec,
    exp: nowSec + config.jwtTtlSeconds,
    jti: crypto.randomUUID(),
    tv: Number(user.token_version ?? 1),
    employee_code: user.employee_code,
    username: user.username,
    full_name: user.full_name,
    role: user.role,
    station: user.station || "",
    hub_id: user.hub_id ?? null,
  };
  return jwt.sign(payload, config.jwtSecret, { algorithm: "HS256" });
}

export function decodeJwt(token) {
  try {
    const payload = jwt.verify(token, config.jwtSecret, {
      algorithms: ["HS256"],
      issuer: "lacakin-auth",
    });
    if (!payload?.sub || !payload?.jti) {
      throw new Error("Missing required claims");
    }
    return payload;
  } catch {
    throw new DomainError("Sesi tidak valid atau sudah kedaluwarsa", 401);
  }
}

export function maskNik(nik) {
  if (!nik) return null;
  const s = String(nik).trim();
  if (s.length <= 8) return "*".repeat(s.length);
  return `${s.slice(0, 4)}${"*".repeat(s.length - 8)}${s.slice(-4)}`;
}

export function maskPhone(phone) {
  if (!phone) return null;
  const s = String(phone).trim();
  if (s.length <= 6) return "*".repeat(s.length);
  return `${s.slice(0, 4)}${"*".repeat(s.length - 7)}${s.slice(-3)}`;
}

export function validateMediaMagicBytes(buf, allowPdf = false) {
  if (!Buffer.isBuffer(buf) || buf.length < 8) {
    throw new DomainError("File kosong atau terlalu kecil", 400);
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return { ext: ".png", mime: "image/png" };
  }
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { ext: ".jpg", mime: "image/jpeg" };
  }
  // WebP: RIFF....WEBP
  if (
    buf.length >= 12 &&
    buf.subarray(0, 4).toString("ascii") === "RIFF" &&
    buf.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return { ext: ".webp", mime: "image/webp" };
  }
  // PDF: %PDF-
  if (allowPdf && buf.subarray(0, 5).toString("ascii") === "%PDF-") {
    return { ext: ".pdf", mime: "application/pdf" };
  }
  throw new DomainError(
    "Format file tidak diizinkan. Hanya PNG, JPEG, atau WebP asli yang diterima (SVG/HTML ditolak).",
    400
  );
}

export function sha256Hex(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}
