const fs = require("fs");
const path = require("path");

const serverRoot = path.resolve(__dirname, "..");
const routeFiles = ["src/modules/dss/dss.routes.js"];

const violations = routeFiles.filter((routeFile) => {
  const routePath = path.join(serverRoot, routeFile);
  const source = fs.readFileSync(routePath, "utf8");

  return /Controllers\/Dss[-_]/.test(source);
});

if (violations.length > 0) {
  throw new Error(
    `Route files must use src/modules/dss instead of legacy DSS controllers: ${violations.join(", ")}`,
  );
}

process.env.LOGIN_API_URL = "https://dss.example.test/api/v1/auth/login";
process.env.USER_DSS = "admin";
process.env.PWD_DSS = "secret";

const fetchCalls = [];
global.fetch = async (url, options = {}) => {
  fetchCalls.push({ url: String(url), options });

  if (String(url).endsWith("/api/v1/auth/login")) {
    return {
      ok: true,
      json: async () => ({ access_token: "DSS-TOKEN" }),
    };
  }

  if (String(url).endsWith("/api/v1/location")) {
    return {
      ok: true,
      json: async () => ({
        code: 1000,
        data: {
          deviceCategory: "1",
          deviceCode: "CAM-001",
          deviceName: "Bodycam",
          deviceType: "5",
          gpsX: 100.521467,
          gpsY: 13.718384,
          orgCode: null,
          orgName: "Test Location",
          status: "1",
          updateTime: 1773248077,
        },
        desc: "Success",
      }),
    };
  }

  throw new Error(`Unexpected DSS URL: ${url}`);
};

const assert = require("assert");
const { fetchDeviceLocationFromDss } = require("../src/modules/dss/dss.service");

(async () => {
  const location = await fetchDeviceLocationFromDss("CAM-001");

  assert.strictEqual(fetchCalls[1].url, "https://dss.example.test/api/v1/location");
  assert.strictEqual(fetchCalls[1].options.method, "POST");
  assert.strictEqual(fetchCalls[1].options.headers["Content-Type"], "application/json");
  assert.strictEqual(fetchCalls[1].options.headers.Authorization, "Bearer DSS-TOKEN");
  assert.deepStrictEqual(JSON.parse(fetchCalls[1].options.body), { deviceCode: "CAM-001" });
  assert.deepStrictEqual(location, {
    DeviceCode: "CAM-001",
    LocationName: "Test Location",
    Latitude: 13.718384,
    Longitude: 100.521467,
  });

  console.log("smoke-dss-boundary-ok");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
