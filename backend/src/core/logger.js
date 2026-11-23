import crypto from "node:crypto";
import { AsyncLocalStorage } from "node:async_hooks";
import { config } from "./config.js";

export const requestContext = new AsyncLocalStorage();

let shuttingDown = false;
export function isShuttingDown() {
  return shuttingDown;
}
export function setShuttingDown() {
  shuttingDown = true;
}

export function getRequestId() {
  return requestContext.getStore()?.requestId || "-";
}

export function logJson(level, msg, extra = {}) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    node: config.nodeName,
    rid: getRequestId(),
    msg,
    ...extra,
  };
  process.stdout.write(`${JSON.stringify(entry)}\n`);
}

export function createObservabilityMiddleware(serviceName) {
  return (req, res, next) => {
    const requestId = req.headers["x-request-id"] || crypto.randomUUID().replace(/-/g, "");
    const start = process.hrtime.bigint();

    res.setHeader("X-Request-ID", requestId);
    res.setHeader("X-App-Node", config.nodeName);
    res.setHeader("X-Service-Name", serviceName);

    requestContext.run({ requestId, ip: req.ip || req.socket?.remoteAddress || null }, () => {
      res.on("finish", () => {
        const ms = Number(process.hrtime.bigint() - start) / 1e6;
        logJson("INFO", "http_request", {
          service: serviceName,
          method: req.method,
          path: req.originalUrl || req.url,
          status: res.statusCode,
          ms: Number(ms.toFixed(1)),
        });
      });
      next();
    });
  };
}
