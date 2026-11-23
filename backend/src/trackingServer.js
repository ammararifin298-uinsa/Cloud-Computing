import { createServiceApp, startGracefulServer } from "./createApp.js";
import { initPools } from "./infra/db.js";
import { createTrackingRouter } from "./routes/trackingRoutes.js";

const app = createServiceApp("tracking-service", {
  routers: [createTrackingRouter()],
  jsonLimit: "256kb",
  checkDb: true,
});

startGracefulServer(app, "tracking-service", async () => {
  initPools();
});
