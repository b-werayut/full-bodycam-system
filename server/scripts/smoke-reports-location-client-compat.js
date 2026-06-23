const assert = require("assert");
const path = require("path");

const serverRoot = path.resolve(__dirname, "..");
const prismaModulePath = path.join(serverRoot, "src", "lib", "prisma.js");

let reportLocationLookupArgs = null;

const fakePrisma = {
  missions: {
    findMany: async (args) => {
      if (args.select?.Location) {
        throw new Error("Unknown field `Location` for select statement on model `Missions`.");
      }

      return [
        {
          ReportId: "INT-001",
          MissionId: 10,
          MissionName: "Patrol",
          StartTime: new Date("2026-06-01T08:00:00.000Z"),
          EndTime: new Date("2026-06-01T09:00:00.000Z"),
          Description: "Daily patrol",
          OfficerId: 7,
          LocationCode: "LOC-STATION-001",
          DeviceCode: "CAM-001",
          MissionStatus: "1",
          Priority: "medium",
          Duration: 60,
          Note: "ok",
          Latitude: null,
          Longitude: null,
          Officers: {
            OfficerName: "Officer A",
          },
          Devices: {
            DeviceName: "BodyCam 001",
            DeviceType: "bodycam",
            SerialNo: "SN001",
            Active: false,
          },
        },
      ];
    },
  },
  location: {
    findMany: async (args) => {
      reportLocationLookupArgs = args;

      return [
        {
          LocationId: 3,
          LocationCode: "LOC-STATION-001",
          LocationName: "Station",
          Latitude: 13.75,
          Longitude: 100.5,
        },
      ];
    },
  },
};

require.cache[prismaModulePath] = {
  id: prismaModulePath,
  filename: prismaModulePath,
  loaded: true,
  exports: { prisma: fakePrisma },
};

const { getReport } = require("../src/modules/internal-api/reports.controller");

(async () => {
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

  await getReport({ user: { roleId: 1 } }, res);

  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body[0].reportId, "INT-001");
  assert.strictEqual(res.body[0].locationId, 3);
  assert.strictEqual(res.body[0].locationCode, "LOC-STATION-001");
  assert.strictEqual(res.body[0].locationName, "Station");
  assert.strictEqual(res.body[0].latitude, 13.75);
  assert.strictEqual(res.body[0].longitude, 100.5);
  assert.deepStrictEqual(reportLocationLookupArgs, {
    where: {
      LocationCode: {
        in: ["LOC-STATION-001"],
      },
    },
    select: {
      LocationId: true,
      LocationCode: true,
      LocationName: true,
      Latitude: true,
      Longitude: true,
    },
  });

  console.log("smoke-reports-location-client-compat-ok");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
