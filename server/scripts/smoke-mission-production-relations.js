const assert = require("assert");
const path = require("path");

const serverRoot = path.resolve(__dirname, "..");
const prismaModulePath = path.join(serverRoot, "src", "lib", "prisma.js");

let createdMissionData = null;
let deviceLookupWhere = null;
let missionUpdateWhere = null;
let missionUpdateData = null;
let directMissionUpdateData = null;
let deviceUpdateWhere = null;
let eventLogDeleteWhere = null;
let missionDeleteWhere = null;
const locationLookupWheres = [];
const createdMissionDataItems = [];
const deleteOrder = [];

const fakePrisma = {
  location: {
    findUnique: async ({ where }) => {
      locationLookupWheres.push({ where });
      return {
        LocationCode: "LOC-CAM-LEGACY",
        Latitude: 13.75,
        Longitude: 100.5,
      };
    },
  },
  devices: {
    findUnique: async ({ where }) => {
      locationLookupWheres.push({ where });
      return {
        Location: {
          LocationCode: "LOC-CAM-DEVICE",
          Latitude: 13.75,
          Longitude: 100.5,
        },
      };
    },
    findFirst: async ({ where }) => {
      deviceLookupWhere = where;
      return {
        DeviceCode: "CAM-001",
        DeviceName: "BodyCam 001",
        Active: false,
      };
    },
  },
  missions: {
    create: async ({ data }) => {
      createdMissionData = data;
      createdMissionDataItems.push(data);
      return {
        MissionId: 1,
        ...data,
      };
    },
    findFirst: async ({ where }) => {
      // overlap check จะมีเงื่อนไข EndTime เสมอ — กรณีนี้ถือว่าไม่ชนเวลา
      if (where.EndTime) {
        return null;
      }

      // deleteCancelledMission lookup — คืน mission ที่ถูกยกเลิกแล้ว
      if (where.ReportId === "INT-CANCELLED") {
        return {
          MissionId: 99,
          ReportId: "INT-CANCELLED",
          MissionStatus: "4",
        };
      }

      return {
        MissionId: 1,
        ReportId: "INT-001",
        MissionStatus: "1",
        DeviceCode: "CAM-001",
      };
    },
    updateMany: async ({ data }) => {
      directMissionUpdateData = data;
      return { count: 1 };
    },
  },
  $transaction: async (callback) => callback({
    missions: {
      updateMany: async ({ where, data }) => {
        missionUpdateWhere = where;
        missionUpdateData = data;
        return { count: 1 };
      },
      deleteMany: async ({ where }) => {
        missionDeleteWhere = where;
        deleteOrder.push("mission");
        return { count: 1 };
      },
    },
    devices: {
      updateMany: async ({ where }) => {
        deviceUpdateWhere = where;
        return { count: 1 };
      },
    },
    eventLog: {
      deleteMany: async ({ where }) => {
        eventLogDeleteWhere = where;
        deleteOrder.push("eventLog");
        return { count: 2 };
      },
    },
  }),
};

require.cache[prismaModulePath] = {
  id: prismaModulePath,
  filename: prismaModulePath,
  loaded: true,
  exports: { prisma: fakePrisma },
};

const { confirmMission, createMission, deleteCancelledMission, updateMission } = require("../src/modules/internal-api/missions.service");

(async () => {
  const createResponse = await createMission({
    reportId: "INT-001",
    missionName: "Patrol",
    missionStatus: "PENDING",
    deviceCode: "CAM-001",
  }, { roleId: 1 });

  assert.strictEqual(createResponse.statusCode, 201);
  assert.ok(createdMissionData, "mission create data should be captured");
  assert.strictEqual(createdMissionData.MissionStatus, "1");
  assert.strictEqual(createdMissionData.DeviceCode, "CAM-001");
  assert.deepStrictEqual(locationLookupWheres[0].where, { DeviceCode: "CAM-001" });
  assert.strictEqual(createdMissionData.LocationCode, "LOC-CAM-DEVICE");
  assert.strictEqual(createdMissionData.Latitude, 13.75);
  assert.strictEqual(createdMissionData.Longitude, 100.5);
  assert.strictEqual(Object.hasOwn(createdMissionData, "LocationId"), false);

  const locationCodeCreateResponse = await createMission({
    reportId: "INT-702289",
    missionName: "test overlap",
    startTime: "2026-06-06T18:16:00.000Z",
    endTime: "2026-06-06T19:17:00.000Z",
    description: "test overlap",
    locationCode: "BWC-CP-001",
    latitude: 14.226,
    longitude: 100.715,
    officerId: 1,
    deviceCode: "1000097",
    priority: "medium",
    missionStatus: "PENDING",
    duration: 61,
    note: "test overlap",
  }, { roleId: 1 });

  assert.strictEqual(locationCodeCreateResponse.statusCode, 201);
  assert.deepStrictEqual(locationLookupWheres[1].where, { LocationCode: "BWC-CP-001" });
  assert.strictEqual(createdMissionDataItems[1].LocationCode, "BWC-CP-001");
  assert.strictEqual(createdMissionDataItems[1].Latitude, 14.226);
  assert.strictEqual(createdMissionDataItems[1].Longitude, 100.715);

  const updateResponse = await updateMission({
    reportId: "INT-001",
    deviceCode: "CAM-001",
  }, { roleId: 1 });

  assert.strictEqual(updateResponse.statusCode, 200);
  assert.deepStrictEqual(locationLookupWheres[2].where, { DeviceCode: "CAM-001" });
  assert.strictEqual(directMissionUpdateData.LocationCode, "LOC-CAM-DEVICE");
  assert.strictEqual(Object.hasOwn(directMissionUpdateData, "LocationId"), false);

  const confirmResponse = await confirmMission({
    reportId: "INT-001",
    deviceCode: "CAM-001",
  }, { roleId: 1 });

  assert.strictEqual(confirmResponse.statusCode, 200);
  assert.deepStrictEqual(deviceLookupWhere, { DeviceCode: "CAM-001" });
  assert.deepStrictEqual(missionUpdateWhere, { ReportId: "INT-001" });
  assert.strictEqual(missionUpdateData.MissionStatus, "2");
  assert.deepStrictEqual(deviceUpdateWhere, { DeviceCode: "CAM-001" });

  const deleteResponse = await deleteCancelledMission({
    reportId: "INT-CANCELLED",
  }, { roleId: 1 });

  assert.strictEqual(deleteResponse.statusCode, 200);
  // ต้องลบ EventLog ก่อน mission เพื่อเลี่ยง FK constraint EventLog_MissionId_fkey
  assert.deepStrictEqual(deleteOrder, ["eventLog", "mission"]);
  assert.deepStrictEqual(eventLogDeleteWhere, { MissionId: 99 });
  assert.deepStrictEqual(missionDeleteWhere, { ReportId: "INT-CANCELLED" });

  console.log("smoke-mission-production-relations-ok");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
