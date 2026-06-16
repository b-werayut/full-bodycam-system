const http = require("http");
const WebSocket = require("ws");

const { createApp } = require("../app");
const { config } = require("../config");
const setupSocket = require("../utils/socketHandler");
const {
  startDeviceStatusScheduler,
  stopDeviceStatusScheduler,
} = require("../utils/deviceStatusScheduler");
const {
  startEventLogCleanupScheduler,
  stopEventLogCleanupScheduler,
} = require("../utils/eventLogCleanupScheduler");
const {
  startMissionAlertScheduler,
  stopMissionAlertScheduler,
} = require("../utils/missionAlertScheduler");
const {
  startDeviceTokenCleanupScheduler,
  stopDeviceTokenCleanupScheduler,
} = require("../utils/deviceTokenCleanupScheduler");
const { prisma } = require("../lib/prisma");

function startServer(options = {}) {
  const appConfig = options.config || config;
  const app = options.app || createApp({ config: appConfig });
  const server = http.createServer(app);
  const wss = new WebSocket.Server({ server });

  setupSocket(wss);

  server.listen(appConfig.server.port, () => {
    console.log(`Server is running on port ${appConfig.server.port}`);
    startDeviceStatusScheduler();
    startEventLogCleanupScheduler();
    startMissionAlertScheduler();
    startDeviceTokenCleanupScheduler();
  });

  const shutdown = async (signal) => {
    console.log(`[Server] Received ${signal}. Shutting down...`);

    stopDeviceStatusScheduler();
    stopEventLogCleanupScheduler();
    stopMissionAlertScheduler();
    stopDeviceTokenCleanupScheduler();
    wss.close();

    server.close(async () => {
      try {
        if (prisma && typeof prisma.$disconnect === "function") {
          await prisma.$disconnect();
        }
      } catch (error) {
        console.error("[Server] Error disconnecting Prisma:", error);
      } finally {
        process.exit(0);
      }
    });
  };

  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));

  return {
    app,
    server,
    wss,
    shutdown,
  };
}

module.exports = { startServer };
