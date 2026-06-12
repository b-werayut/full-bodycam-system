const assert = require("assert");
const path = require("path");

process.env.LOGIN_API_URL = "https://dss.example.test/api/v1/auth/login";
process.env.LOCATION_API_URL = "https://dss.example.test/api/v1/location";
process.env.USER_DSS = "admin";
process.env.PWD_DSS = "secret";

const serverRoot = path.resolve(__dirname, "..");
const prismaModulePath = path.join(serverRoot, "src", "lib", "prisma.js");

const now = new Date();
const mismatchStartedAt = new Date(now.getTime() - 20 * 60 * 1000);

let createdMissionData = null;
let createdEventLogData = null;
let dssLocationRequestBody = null;

global.fetch = async (url, options = {}) => {
  if (String(url).endsWith("/api/v1/auth/login")) {
    return {
      ok: true,
      json: async () => ({ access_token: "DSS-TOKEN" }),
    };
  }

  if (String(url).endsWith("/api/v1/location")) {
    dssLocationRequestBody = JSON.parse(options.body);
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
          orgName: "DSS Location",
          status: "1",
          updateTime: 1773248077,
        },
        desc: "Success",
      }),
    };
  }

  throw new Error(`Unexpected DSS URL: ${url}`);
};

const fakePrisma = {
  devices: {
    findUnique: async () => ({
      DeviceCode: "CAM-001",
      DeviceName: "BodyCam 001",
      DeviceType: "bodycam",
      SerialNo: "SN001",
      Status: true,
      Active: false,
      StatusUpdatedAt: mismatchStartedAt,
      ActiveUpdatedAt: null,
      Users: null,
      Location: {
        LocationCode: "LOC-CAM-001",
        LocationName: "Test Location",
        Latitude: null,
        Longitude: null,
      },
    }),
  },
  eventLog: {
    findFirst: async () => null,
    create: async ({ data }) => {
      createdEventLogData = data;
      return { LogId: 1, ...data };
    },
  },
  officers: {
    findFirst: async () => ({ OfficerId: 99, OfficerName: "Emergency-System" }),
    create: async () => ({ OfficerId: 99, OfficerName: "Emergency-System" }),
  },
  missions: {
    findFirst: async () => null,
    create: async ({ data }) => {
      createdMissionData = data;
      return { MissionId: 123, ...data };
    },
  },
};

require.cache[prismaModulePath] = {
  id: prismaModulePath,
  filename: prismaModulePath,
  loaded: true,
  exports: { prisma: fakePrisma },
};

const { checkDeviceOnlineStatus } = require("../src/modules/devices/deviceStatus.service");

(async () => {
  const beforeCreate = new Date();
  const result = await checkDeviceOnlineStatus("CAM-001");
  const afterCreate = new Date();

  assert.strictEqual(result.logged, true);
  assert.ok(createdMissionData, "emergency mission should be created");
  assert.deepStrictEqual(dssLocationRequestBody, { deviceCode: "CAM-001" });
  assert.strictEqual(createdMissionData.LocationCode, "LOC-CAM-001");
  assert.strictEqual(Object.hasOwn(createdMissionData, "LocationId"), false);
  assert.strictEqual(createdMissionData.Latitude, 13.718384);
  assert.strictEqual(createdMissionData.Longitude, 100.521467);
  assert.ok(
    createdMissionData.MissionName.includes("Test Location"),
    "MissionName should still use device location name",
  );
  assert.ok(createdMissionData.StartTime >= beforeCreate, "StartTime should use current creation time");
  assert.ok(createdMissionData.StartTime <= afterCreate, "StartTime should not be in the future");
  assert.notStrictEqual(
    createdMissionData.StartTime.getTime(),
    mismatchStartedAt.getTime(),
    "StartTime should not use stale device mismatch time",
  );
  assert.strictEqual(
    createdMissionData.EndTime.getTime(),
    createdMissionData.StartTime.getTime() + 60 * 1000,
    "EndTime should be one minute after StartTime",
  );
  assert.ok(createdEventLogData, "event log should be created");
  assert.strictEqual(createdEventLogData.DeviceCode, "CAM-001");
  assert.strictEqual(createdEventLogData.MissionId, 123);

  console.log("smoke-emergency-mission-time-ok");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
