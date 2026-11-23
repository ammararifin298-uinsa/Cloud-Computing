import { createServiceApp, startGracefulServer } from "./createApp.js";
import { initPools } from "./infra/db.js";
import { getStorage } from "./infra/storage.js";
import { createMediaRouter } from "./routes/mediaRoutes.js";

const app = createServiceApp("media-service", {
  routers: [createMediaRouter()],
  jsonLimit: "8mb",
  checkDb: true,
  checkStorage: true,
});

startGracefulServer(app, "media-service", async () => {
  initPools();
  await getStorage().ensureReady();
});
