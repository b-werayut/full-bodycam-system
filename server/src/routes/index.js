const authRoutes = require("../modules/auth/auth.routes");
const usersRoutes = require("../modules/users/users.routes");
const internalApiRoutes = require("../modules/internal-api/internal-api.routes");
const dssRoutes = require("../modules/dss/dss.routes");
const videoRoutes = require("../modules/video/video.routes");

// For backward compatibility with smoke tests
const routeModules = [
  "../modules/auth/auth.routes.js",
  "../modules/users/users.routes.js",
  "../modules/internal-api/internal-api.routes.js",
];

function registerRoutes(app, options = {}) {
  const apiPrefix = options.apiPrefix || "/api_internal";

  app.use(apiPrefix, authRoutes);
  app.use(apiPrefix, usersRoutes);
  app.use(apiPrefix, internalApiRoutes);
  app.use(apiPrefix, dssRoutes);
  app.use(apiPrefix, videoRoutes);
}

module.exports = {
  registerRoutes,
  routeModules,
};
