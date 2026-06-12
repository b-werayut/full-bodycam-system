const assert = require("assert");
const path = require("path");

const serverRoot = path.resolve(__dirname, "..");
const prismaModulePath = path.join(serverRoot, "src", "lib", "prisma.js");
const dssServiceModulePath = path.join(serverRoot, "src", "modules", "dss", "dss.service.js");

const staleStartedAt = new Date("2026-05-18T07:43:00.000Z");
let updatedMissionData = null;
let createdEventLogData = null;
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
    findFirst: async () => ({
      MissionId: 456,
      ReportId: "EMER-OLD001",
      MissionName: "Emergency: BodyCam 001",
      MissionStatus: "5",
      StartTime: staleStartedAt,
      EndTime: new Date(staleStartedAt.getTime() + 60 * 1000),
    }),
    updateMany: async ({ data }) => {
      updatedMissionData = data;
      return { count: 1 };
    },
    create: async () => {
      throw new Error("should reuse existing emergency mission");
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
        LocationCode: "DSS-LOC-SHOULD-NOT-BE-USED",
        Latitude: 13.7563,
        Longitude: 100.5018,
      };
    },
  },
};

const { checkDeviceOnlineStatus } = require("../src/modules/devices/deviceStatus.service");

(async () => {
  const beforeCheck = new Date();
  const result = await checkDeviceOnlineStatus("CAM-001");
  const afterCheck = new Date();

  assert.strictEqual(result.logged, true);
  assert.strictEqual(dssLocationLookupDeviceCode, "CAM-001");
  assert.ok(updatedMissionData, "stale emergency mission should be refreshed");
  assert.strictEqual(updatedMissionData.LocationCode, "LOC-CAM-001");
  assert.strictEqual(updatedMissionData.Latitude, 13.7563);
  assert.strictEqual(updatedMissionData.Longitude, 100.5018);
  assert.ok(updatedMissionData.StartTime >= beforeCheck, "StartTime should use current reuse time");
  assert.ok(updatedMissionData.StartTime <= afterCheck, "StartTime should not be in the future");
  assert.strictEqual(
    updatedMissionData.EndTime.getTime(),
    updatedMissionData.StartTime.getTime() + 60 * 1000,
    "EndTime should be one minute after refreshed StartTime",
  );
  assert.strictEqual(result.mission.ReportId, "EMER-OLD001");
  assert.strictEqual(result.mission.StartTime.getTime(), updatedMissionData.StartTime.getTime());
  assert.ok(createdEventLogData, "event log should be created");
  assert.strictEqual(createdEventLogData.DeviceCode, "CAM-001");
  assert.strictEqual(createdEventLogData.MissionId, 456);

  console.log("smoke-stale-emergency-mission-time-ok");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
