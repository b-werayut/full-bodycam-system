const assert = require("assert");
const path = require("path");

const serverRoot = path.resolve(__dirname, "..");
const prismaModulePath = path.join(serverRoot, "src", "lib", "prisma.js");

const fakePrisma = {
  eventLog: {
    findMany: async () => [
      {
        LogId: 50,
        TypeKey: "DEVICE_STATUS",
        OfficerName: "System",
        EventTime: new Date("2026-06-01T10:00:00.000Z"),
        Severity: "WARNING",
        LocationName: "Station",
        Details: "Structured event without report id in text",
        IsRead: false,
        DeviceCode: "CAM-001",
        MissionId: 10,
        Devices: {
          DeviceCode: "CAM-001",
          DeviceName: "BodyCam 001",
        },
        Missions: {
          MissionId: 10,
          ReportId: "INT-001",
          MissionName: "Patrol",
          MissionStatus: "2",
          DeviceCode: "CAM-001",
          LocationCode: "LOC-STATION-001",
          Latitude: null,
          Longitude: null,
          StartTime: new Date("2026-06-01T09:00:00.000Z"),
          EndTime: new Date("2026-06-01T11:00:00.000Z"),
          Location: {
            LocationName: "Station",
            Latitude: 13.75,
            Longitude: 100.5,
          },
        },
      },
    ],
  },
  missions: {
    findFirst: async () => {
      throw new Error("fallback mission lookup should not be used when relations are present");
    },
  },
};

require.cache[prismaModulePath] = {
  id: prismaModulePath,
  filename: prismaModulePath,
  loaded: true,
  exports: { prisma: fakePrisma },
};

const { getEventLogs } = require("../src/modules/internal-api/eventLogs.controller");

(async () => {
  let statusCode = null;
  let body = null;
  const req = { query: {}, user: { roleId: 1 } };
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(payload) {
      body = payload;
      return this;
    },
  };

  await getEventLogs(req, res);

  assert.strictEqual(statusCode, 200);
  assert.strictEqual(body[0].id, 50);
  assert.strictEqual(body[0].deviceCode, "CAM-001");
  assert.strictEqual(body[0].deviceName, "BodyCam 001");
  assert.strictEqual(body[0].mission.reportId, "INT-001");
  assert.strictEqual(body[0].mission.missionStatus, "2");
  assert.strictEqual(body[0].mission.locationCode, "LOC-STATION-001");
  assert.strictEqual(body[0].mission.locationName, "Station");
  assert.strictEqual(body[0].mission.latitude, 13.75);
  assert.strictEqual(body[0].mission.longitude, 100.5);

  console.log("smoke-event-log-production-relations-ok");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
