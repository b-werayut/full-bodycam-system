const assert = require("assert");
const path = require("path");

const serverRoot = path.resolve(__dirname, "..");
const prismaModulePath = path.join(serverRoot, "src", "lib", "prisma.js");

let reportFindManyArgs = null;
let locationFindManyArgs = null;
let onlineDeviceFindManyArgs = null;
let allDeviceFindManyArgs = null;

const fakePrisma = {
  devices: {
    findMany: async (args) => {
      if (args?.include?.Locations) {
        throw new Error("Unknown field `Locations` for include statement on model `Devices`");
      }

      const data = [
        {
          DeviceId: 1,
          DeviceCode: "CAM-001",
          DeviceName: "BodyCam 001",
          DeviceType: "bodycam",
          SerialNo: "SN001",
          Status: true,
          Active: true,
          RegisteredAt: new Date("2026-06-01T07:00:00.000Z"),
          ActiveUpdatedAt: new Date("2026-06-01T07:30:00.000Z"),
          StatusUpdatedAt: new Date("2026-06-01T07:45:00.000Z"),
          LocationCode: "LOC-STATION-001",
          Location: {
            LocationId: 3,
            LocationCode: "LOC-STATION-001",
            Latitude: 13.75,
            Longitude: 100.5,
            LocationName: "Station",
            CreatedAt: new Date("2026-06-01T08:00:00.000Z"),
          },
        },
      ];

      if (args?.where?.Active === true) {
        onlineDeviceFindManyArgs = args;
        return data;
      }

      allDeviceFindManyArgs = args;
      return data;
    },
  },
  missions: {
    findMany: async (args) => {
      reportFindManyArgs = args;
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
        Location: {
          LocationId: 3,
          LocationCode: "LOC-STATION-001",
          LocationName: "Station",
          Latitude: 13.75,
          Longitude: 100.5,
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
  officers: {
    findMany: async () => [
      {
        OfficerId: 7,
        OfficerName: "Officer A",
        CreatedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ],
  },
  location: {
    findMany: async (args) => {
      locationFindManyArgs = args;
      return [
        {
          LocationId: 3,
          LocationCode: "LOC-STATION-001",
          Latitude: 13.75,
          Longitude: 100.5,
          LocationName: "Station",
          CreatedAt: new Date("2026-06-01T08:00:00.000Z"),
          Devices: [
            {
              DeviceCode: "CAM-001",
              DeviceName: "BodyCam 001",
              DeviceType: "bodycam",
              SerialNo: "SN001",
              Active: false,
            },
            {
              DeviceCode: "CAM-002",
              DeviceName: "BodyCam 002",
              DeviceType: "bodycam",
              SerialNo: "SN002",
              Active: true,
            },
          ],
        },
        {
          LocationId: 4,
          LocationCode: "LOC-NO-DEVICE",
          Latitude: 14.25,
          Longitude: 101.5,
          LocationName: "No Device",
          CreatedAt: new Date("2026-06-02T08:00:00.000Z"),
          Devices: [],
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

const { getOnlineDevices, getAllDevices } = require("../src/modules/internal-api/devices.controller");
const { getReport, getLocation, getOfficerData } = require("../src/modules/internal-api/reports.controller");

function createResponse() {
  return {
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
}

(async () => {
  const reportRes = createResponse();
  await getReport({ user: { roleId: 1 } }, reportRes);

  assert.strictEqual(reportRes.statusCode, 200);
  assert.strictEqual(reportFindManyArgs.select.LocationCode, true);
  assert.strictEqual(Object.hasOwn(reportFindManyArgs.select, "LocationId"), false);
  assert.strictEqual(reportRes.body[0].reportId, "INT-001");
  assert.strictEqual(reportRes.body[0].deviceCode, "CAM-001");
  assert.strictEqual(reportRes.body[0].deviceName, "BodyCam 001");
  assert.strictEqual(reportRes.body[0].locationCode, "LOC-STATION-001");
  assert.strictEqual(reportRes.body[0].latitude, 13.75);
  assert.strictEqual(reportRes.body[0].longitude, 100.5);
  assert.strictEqual(reportRes.body[0].officerName, "Officer A");

  const locationRes = createResponse();
  await getLocation({ user: { roleId: 1 } }, locationRes);

  assert.strictEqual(locationRes.statusCode, 200);
  assert.strictEqual(locationRes.body.length, 2);
  assert.strictEqual(Object.hasOwn(locationFindManyArgs.select.Devices, "take"), false);
  assert.strictEqual(locationRes.body[0].locationId, 3);
  assert.strictEqual(locationRes.body[0].locationCode, "LOC-STATION-001");
  assert.strictEqual(locationRes.body[0].recordedAt.toISOString(), "2026-06-01T08:00:00.000Z");
  assert.deepStrictEqual(locationRes.body[0].devices, [
    {
      deviceCode: "CAM-001",
      deviceName: "BodyCam 001",
      deviceType: "bodycam",
      active: false,
      serialNo: "SN001",
    },
    {
      deviceCode: "CAM-002",
      deviceName: "BodyCam 002",
      deviceType: "bodycam",
      active: true,
      serialNo: "SN002",
    },
  ]);
  assert.strictEqual(locationRes.body[1].locationId, 4);
  assert.strictEqual(locationRes.body[1].locationCode, "LOC-NO-DEVICE");
  assert.deepStrictEqual(locationRes.body[1].devices, []);
  assert.deepStrictEqual(locationFindManyArgs.select.Devices, {
    select: {
      DeviceCode: true,
      DeviceName: true,
      DeviceType: true,
      SerialNo: true,
      Active: true,
    },
    orderBy: {
      DeviceCode: "asc",
    },
  });

  const onlineDevicesRes = createResponse();
  await getOnlineDevices({ user: { roleId: 1 } }, onlineDevicesRes);

  assert.strictEqual(onlineDevicesRes.statusCode, 200);
  assert.deepStrictEqual(onlineDeviceFindManyArgs.include, {
    Location: {
      select: {
        LocationId: true,
        LocationCode: true,
        Latitude: true,
        Longitude: true,
        LocationName: true,
        CreatedAt: true,
      },
    },
  });
  assert.strictEqual(onlineDevicesRes.body[0].deviceCode, "CAM-001");
  assert.strictEqual(onlineDevicesRes.body[0].locationCode, "LOC-STATION-001");
  assert.strictEqual(onlineDevicesRes.body[0].latitude, 13.75);
  assert.strictEqual(onlineDevicesRes.body[0].longitude, 100.5);
  assert.strictEqual(onlineDevicesRes.body[0].recordedAt.toISOString(), "2026-06-01T08:00:00.000Z");

  const allDevicesRes = createResponse();
  await getAllDevices({ user: { roleId: 1 } }, allDevicesRes);

  assert.strictEqual(allDevicesRes.statusCode, 200);
  assert.deepStrictEqual(allDeviceFindManyArgs.include, onlineDeviceFindManyArgs.include);
  assert.strictEqual(allDevicesRes.body[0].DeviceCode, "CAM-001");
  assert.strictEqual(allDevicesRes.body[0].Location, undefined);
  assert.strictEqual(allDevicesRes.body[0].Locations[0].LocationCode, "LOC-STATION-001");
  assert.strictEqual(allDevicesRes.body[0].Locations[0].RecordedAt.toISOString(), "2026-06-01T08:00:00.000Z");

  const officerRes = createResponse();
  await getOfficerData({ user: { roleId: 1 } }, officerRes);

  assert.strictEqual(officerRes.statusCode, 200);
  assert.strictEqual(officerRes.body[0].officerId, 7);
  assert.strictEqual(officerRes.body[0].officerName, "Officer A");

  console.log("smoke-reports-production-relations-ok");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
