require("dotenv").config({ quiet: true });

const { createApp } = require("../src/app");
const { routeModules } = require("../src/routes");

const app = createApp();

if (!app || typeof app.use !== "function") {
  throw new Error("createApp() did not return an Express app");
}

if (!Array.isArray(routeModules) || routeModules.length !== 3) {
  throw new Error("Route registry does not expose the expected route modules");
}

console.log("smoke-app-ok");
process.exit(0);
