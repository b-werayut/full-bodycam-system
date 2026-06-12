const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const { config } = require("./config");
const { registerRoutes } = require("./routes");
const { notFound, errorHandler } = require("./middleware/errorHandler");
const { securityHeaders } = require("./middleware/security");
const { rateLimit } = require("./middleware/rateLimit");

function createApp(options = {}) {
  const app = express();
  const appConfig = options.config || config;

  app.use(securityHeaders);
  app.use(morgan("dev"));
  app.use(cors(appConfig.cors));
  app.use(express.json({ limit: appConfig.request.jsonLimit }));
  app.use(cookieParser());
  app.use(rateLimit(appConfig.rateLimit.maxRequests, appConfig.rateLimit.windowMs));

  registerRoutes(app, {
    apiPrefix: "/api_internal",
    routesDir: options.routesDir,
  });

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
