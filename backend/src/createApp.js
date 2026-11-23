import cors from "cors";
import express from "express";
import helmet from "helmet";
import { ZodError } from "zod";
import { config } from "./core/config.js";
import { createObservabilityMiddleware, logJson, setShuttingDown } from "./core/logger.js";
import { DomainError } from "./domain/errors.js";
import { closePools } from "./infra/db.js";
import { createHealthRouter } from "./routes/healthRoutes.js";

export function createServiceApp(serviceName, { routers = [], jsonLimit = "256kb", checkDb = true, checkStorage = false } = {}) {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", true);

  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(
    cors({
      origin: config.corsOrigins,
      credentials: false,
      methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "Idempotency-Key", "X-Request-ID"],
    })
  );
  app.use(express.json({ limit: jsonLimit }));
  app.use(createObservabilityMiddleware(serviceName));

  app.use(createHealthRouter(serviceName, { checkDb, checkStorage }));
  for (const r of routers) {
    app.use(r);
  }

  // Centralized error handler (never leaks stack traces or raw password input)
  app.use((err, _req, res, _next) => {
    if (err instanceof ZodError) {
      const fields = err.issues.map((i) => ({
        field: i.path.join("."),
        message: i.message,
      }));
      return res.status(422).json({
        detail: fields.map((f) => `${f.field}: ${f.message}`).join("; "),
        errors: fields,
      });
    }
    if (err instanceof DomainError) {
      if (err.headers) {
        for (const [k, v] of Object.entries(err.headers)) res.setHeader(k, v);
      }
      return res.status(err.statusCode).json({ detail: err.message });
    }
    if (err?.code === "LIMIT_FILE_SIZE" || err?.type === "entity.too.large") {
      return res.status(413).json({ detail: "Ukuran payload melebihi batas maksimal yang diizinkan." });
    }

    logJson("ERROR", "unhandled_error", { service: serviceName, error: err?.message || String(err) });
    return res.status(500).json({ detail: "Terjadi kesalahan internal pada server." });
  });

  return app;
}

export function startGracefulServer(app, serviceName, onStartup = null) {
  const server = app.listen(config.port, "0.0.0.0", async () => {
    // Match keep-alive > Nginx upstream keepalive_timeout (55s) to prevent random 502s
    server.keepAliveTimeout = 65_000;
    server.headersTimeout = 66_000;
    logJson("INFO", "service_started", { service: serviceName, port: config.port, env: config.appEnv });
    if (onStartup) {
      try {
        await onStartup();
      } catch (err) {
        logJson("WARN", "startup_hook_warning", { service: serviceName, error: err?.message || String(err) });
      }
    }
  });

  const shutdown = (sig) => {
    logJson("INFO", "graceful_shutdown_started", { service: serviceName, signal: sig });
    setShuttingDown();
    server.close(async () => {
      await closePools();
      logJson("INFO", "graceful_shutdown_complete", { service: serviceName });
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 25_000).unref();
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
  return server;
}
