const assert = require("assert");
const path = require("path");

const serverRoot = path.resolve(__dirname, "..");
const prismaModulePath = path.join(serverRoot, "src", "lib", "prisma.js");
const dssServiceModulePath = path.join(serverRoot, "src", "modules", "dss", "dss.service.js");

let updatedMissionData = null;
let createdEventLogCalled = false;
let dssLocationLookupDeviceCode = null;

const fakePrisma = {
  devices: {
    findUnique: async () => ({
      DeviceCode: "CAM-001",
      DeviceName: "BodyCam 001",
      DeviceType: "bodycam",
      SerialNo: "SN001",
      Status: true,
      Active: false,
      StatusUpdatedAt: new Date(Date.now() - 20 * 60 * 1000),
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
    findFirst: async () => ({ LogId: 99 }),
    create: async () => {
      createdEventLogCalled = true;
      throw new Error("should not create a duplicate event log");
    },
  },
  missions: {
    findFirst: async () => ({
      MissionId: 456,
      ReportId: "EMER-OLD001",
      MissionName: "Emergency: BodyCam 001",
      MissionStatus: "5",
      StartTime: new Date("2026-05-18T07:43:00.000Z"),
      EndTime: new Date("2026-05-18T07:44:00.000Z"),
      Latitude: null,
      Longitude: null,
    }),
    updateMany: async ({ data }) => {
      updatedMissionData = data;
      return { count: 1 };
    },
  },
};

require.cache[prismaModulePath] = {
  id: prismaModulePath,
  filename: prismaModulePath,
  loaded: true,
  exports: { prisma: fakePrisma },
};

require.cache[dssServiceModulePath] = {
  id: dssServiceModulePath,
  filename: dssServiceModulePath,
  loaded: true,
  exports: {
    fetchDeviceLocationFromDss: async (deviceCode) => {
      dssLocationLookupDeviceCode = deviceCode;
      return {
        Latitude: 13.718384,
        Longitude: 100.521467,
      };
    },
  },
};

const { checkDeviceOnlineStatus } = require("../src/modules/devices/deviceStatus.service");

(async () => {
  const result = await checkDeviceOnlineStatus("CAM-001");

  assert.strictEqual(result.logged, false);
  assert.strictEqual(result.reason, "Already logged in database");
  assert.strictEqual(createdEventLogCalled, false);
  assert.strictEqual(dssLocationLookupDeviceCode, "CAM-001");
  assert.ok(updatedMissionData, "recent emergency mission should still receive DSS location");
  assert.deepStrictEqual(updatedMissionData, {
    LocationCode: "LOC-CAM-001",
    Latitude: 13.718384,
    Longitude: 100.521467,
  });

  console.log("smoke-recent-emergency-mission-location-refresh-ok");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
