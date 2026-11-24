const TOKEN_KEY = "lacakin_token";
const USER_KEY = "lacakin_user";
const DEFAULT_TIMEOUT_MS = 10_000;

let onUnauthorizedHandler = null;
let onDegradedHandler = null;

export function registerApiHandlers({ onUnauthorized, onDegraded }) {
  onUnauthorizedHandler = onUnauthorized || null;
  onDegradedHandler = onDegraded || null;
}

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || "";
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Security hardening: persist ONLY minimal UI-display fields in storage.
 * Never store NIK, phone, email, or sensitive tokens beyond the bearer JWT.
 */
export function saveSession(token, user, remember = true) {
  const useLocal = remember === undefined ? Boolean(localStorage.getItem(TOKEN_KEY)) : Boolean(remember);
  const target = useLocal ? localStorage : sessionStorage;
  const other = useLocal ? sessionStorage : localStorage;

  if (token) {
    other.removeItem(TOKEN_KEY);
    other.removeItem(USER_KEY);
    target.setItem(TOKEN_KEY, token);
  }
  if (user) {
    const minimal = {
      id: user.id,
      role: user.role,
      full_name: user.full_name,
      employee_code: user.employee_code,
      avatar_url: user.avatar_url || null,
    };
    target.setItem(USER_KEY, JSON.stringify(minimal));
  }
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
}

export function generateIdempotencyKey() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `idem-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function apiFetch(path, options = {}, _retryCount = 0) {
  const {
    method = "GET",
    body = null,
    headers = {},
    idempotencyKey = null,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    isFormData = false,
  } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const reqHeaders = { ...headers };
  const token = getStoredToken();
  if (token) reqHeaders.Authorization = `Bearer ${token}`;
  if (idempotencyKey) reqHeaders["Idempotency-Key"] = idempotencyKey;
  if (!isFormData && body !== null && !reqHeaders["Content-Type"]) {
    reqHeaders["Content-Type"] = "application/json";
  }

  try {
    const res = await fetch(path, {
      method,
      headers: reqHeaders,
      body: body === null ? undefined : isFormData ? body : JSON.stringify(body),
      signal: controller.signal,
    });

    // Transparent retry on transient 502/503/504 during container failover
    if ((res.status === 502 || res.status === 503 || res.status === 504) && _retryCount < 2 && (method === "GET" || idempotencyKey)) {
      clearTimeout(timer);
      await new Promise((r) => setTimeout(r, 350 * (_retryCount + 1)));
      return apiFetch(path, options, _retryCount + 1);
    }

    let data = null;
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      data = await res.json().catch(() => null);
    } else {
      const txt = await res.text().catch(() => "");
      data = txt ? { detail: txt } : null;
    }

    if (res.status === 503) {
      const retryAfter = res.headers.get("Retry-After") || "10";
      if (onDegradedHandler) {
        onDegradedHandler(
          data?.detail || `Layanan sedang dalam mode pemulihan. Coba lagi dalam ${retryAfter} detik.`
        );
      }
    } else if (res.ok && onDegradedHandler) {
      onDegradedHandler(null);
    }

    if (res.status === 401 && token && !path.startsWith("/api/auth/login")) {
      clearSession();
      if (onUnauthorizedHandler) onUnauthorizedHandler();
    }

    if (!res.ok) {
      const msg = data?.detail || data?.error || `Permintaan gagal (HTTP ${res.status})`;
      const err = new Error(msg);
      err.status = res.status;
      err.data = data;
      throw err;
    }

    return data;
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error("Koneksi ke server melebihi batas waktu (10 detik). Periksa jaringan Anda.");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export const STATUS_LABEL = {
  BOOKED: "Pesanan Dibuat",
  DITERIMA: "Diterima di Loket",
  DISIMPAN: "Disimpan di Gudang",
  DALAM_PERJALANAN: "Dalam Perjalanan",
  DIKIRIM: "Sedang Dikirim Kurir",
  GAGAL_KIRIM: "Gagal Kirim",
  RETUR: "Retur ke Pengirim",
  BATAL: "Dibatalkan",
  SELESAI: "Selesai Diterima",
};

export const ALLOWED_TRANSITIONS = {
  BOOKED: ["DITERIMA", "BATAL"],
  DITERIMA: ["DISIMPAN", "DALAM_PERJALANAN", "BATAL"],
  DISIMPAN: ["DALAM_PERJALANAN", "DIKIRIM"],
  DALAM_PERJALANAN: ["DISIMPAN", "DIKIRIM"],
  DIKIRIM: ["SELESAI", "GAGAL_KIRIM"],
  GAGAL_KIRIM: ["DIKIRIM", "DISIMPAN", "RETUR"],
  SELESAI: [],
  RETUR: [],
  BATAL: [],
};

export const PROOF_REQUIRED_STATUSES = new Set(["SELESAI", "GAGAL_KIRIM", "RETUR"]);

export const ROLE_LABEL = {
  superadmin: "Superadmin",
  admin: "Admin",
  supervisor: "Supervisor",
  operator: "Operator",
  kurir: "Kurir",
};

export function hasRole(user, allowedRoles) {
  return Boolean(user && allowedRoles.includes(user.role));
}

export function formatRupiah(amount) {
  const n = Number(amount || 0);
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatDateTime(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}
