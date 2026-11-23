import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";

const TOKEN_KEY = "lacakin_token";

export const apiClient = axios.create({
  baseURL: "/",
  timeout: 10_000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor: attach JWT Bearer token automatically
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: transparent retry on 502/503/504 failover & clean error normalization
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ detail?: string; error?: string }>) => {
    const cfg = error.config as (InternalAxiosRequestConfig & { _retryCount?: number }) | undefined;
    const status = error.response?.status;

    if (
      cfg &&
      (status === 502 || status === 503 || status === 504) &&
      (cfg._retryCount || 0) < 2 &&
      cfg.method?.toLowerCase() === "get"
    ) {
      cfg._retryCount = (cfg._retryCount || 0) + 1;
      await new Promise((r) => setTimeout(r, 350 * cfg._retryCount!));
      return apiClient(cfg);
    }

    if (status === 401 && localStorage.getItem(TOKEN_KEY) && !cfg?.url?.includes("/api/auth/login")) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem("lacakin_user");
    }

    const message =
      error.response?.data?.detail ||
      error.response?.data?.error ||
      (error.code === "ECONNABORTED"
        ? "Koneksi ke server melebihi batas waktu (10 detik)."
        : "Permintaan gagal diproses oleh server.");

    return Promise.reject(new Error(message));
  }
);
