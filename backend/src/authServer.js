import { createServiceApp, startGracefulServer } from "./createApp.js";
import { initPools, seedDevDefaults } from "./infra/db.js";
import { createAuthRouter } from "./routes/authRoutes.js";

const app = createServiceApp("auth-service", {
  routers: [createAuthRouter()],
  jsonLimit: "8mb", // Allows profile avatar upload up to 5MB
  checkDb: true,
});

startGracefulServer(app, "auth-service", async () => {
  initPools();
  await seedDevDefaults();
});
