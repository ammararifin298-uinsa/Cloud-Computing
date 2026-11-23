import { Router } from "express";
import client from "prom-client";
import { isShuttingDown } from "../core/logger.js";
import { checkReadReady, checkWriteReady } from "../infra/db.js";
import { getStorage } from "../infra/storage.js";

const register = new client.Registry();
client.collectDefaultMetrics({ register });

export function createHealthRouter(serviceName, { checkDb = true, checkStorage = false } = {}) {
  const router = Router();

  // Liveness probe: process is alive (never checks DB, prevents cascading restart on DB hiccup)
  router.get("/livez", (_req, res) => {
    res.json({ status: "alive", service: serviceName });
  });

  // Readiness probe: returns 503 immediately on SIGTERM or if dependencies are unreachable
  router.get("/readyz", async (_req, res) => {
    if (isShuttingDown()) {
      return res.status(503).json({ status: "draining", service: serviceName });
    }
    const deps = {};
    let ok = true;

    if (checkDb) {
      const [readOk, writeOk] = await Promise.all([checkReadReady(), checkWriteReady()]);
      deps.db_read = readOk ? "up" : "down";
      deps.db_write = writeOk ? "up" : "down";
      if (!readOk) ok = false; // Degraded mode: stay ready for reads if read replica is up
    }
    if (checkStorage) {
      try {
        await getStorage().ensureReady();
        deps.storage = "up";
      } catch {
        deps.storage = "down";
        ok = false;
      }
    }

    return res.status(ok ? 200 : 503).json({
      status: ok ? "ok" : "degraded",
      service: serviceName,
      ...deps,
    });
  });

  // Backward-compatible /health alias
  router.get("/health", (req, res, next) => {
    req.url = "/readyz";
    router.handle(req, res, next);
  });

  // Prometheus metrics endpoint
  router.get("/metrics", async (_req, res, next) => {
    try {
      res.setHeader("Content-Type", register.contentType);
      res.end(await register.metrics());
    } catch (err) {
      next(err);
    }
  });

  return router;
}
