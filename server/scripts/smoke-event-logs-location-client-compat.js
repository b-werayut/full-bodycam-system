const assert = require("assert");
const path = require("path");

const serverRoot = path.resolve(__dirname, "..");
const prismaModulePath = path.join(serverRoot, "src", "lib", "prisma.js");

let locationLookupCount = 0;

const fakePrisma = {
  eventLog: {
    findMany: async (args) => {
      if (args.include?.Missions?.select?.Location) {
        throw new Error("Unknown field `Location` for select statement on model `Missions`.");
      }

      return [
        {
          LogId: 52,
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
          },
        },
      ];
    },
  },
  location: {
    findMany: async (args) => {
      locationLookupCount += 1;
      assert.deepStrictEqual(args, {
        where: {
          LocationCode: {
            in: ["LOC-STATION-001"],
          },
        },
        select: {
          LocationCode: true,
          LocationName: true,
          Latitude: true,
          Longitude: true,
        },
      });

      return [
        {
          LocationCode: "LOC-STATION-001",
          LocationName: "Station",
          Latitude: 13.75,
          Longitude: 100.5,
        },
      ];
    },
  },
  missions: {
    findFirst: async () => {
      throw new Error("fallback mission lookup should not be used when event log relation is present");
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
  const req = { query: {} };
  const res = {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };

  await getEventLogs(req, res);

  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.length, 1);
  assert.strictEqual(res.body[0].id, 52);
  assert.strictEqual(res.body[0].mission.reportId, "INT-001");
  assert.strictEqual(res.body[0].mission.locationCode, "LOC-STATION-001");
  assert.strictEqual(res.body[0].mission.locationName, "Station");
  assert.strictEqual(res.body[0].mission.latitude, 13.75);
  assert.strictEqual(res.body[0].mission.longitude, 100.5);
  assert.strictEqual(locationLookupCount, 1);

  console.log("smoke-event-logs-location-client-compat-ok");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
