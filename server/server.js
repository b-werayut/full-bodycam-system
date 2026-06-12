require("dotenv").config({ quiet: true });

const { startServer } = require("./src/runtime/startServer");

startServer();
