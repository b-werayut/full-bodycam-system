const assert = require("assert");
const path = require("path");

const serverRoot = path.resolve(__dirname, "..");
const prismaModulePath = path.join(serverRoot, "src", "lib", "prisma.js");

let missionUpdateData = null;
let deviceUpdateData = null;
let deviceUpdateWhere = null;

const fakePrisma = {
  devices: {
    findFirst: async () => ({
      DeviceCode: "CAM-001",
      DeviceName: "BodyCam 001",
      Active: false,
    }),
  },
  missions: {
    findFirst: async () => ({
      MissionId: 1,
      ReportId: "EMER-OLD001",
      MissionStatus: "5",
      DeviceCode: "CAM-001",
    }),
  },
  $transaction: async (callback) => callback({
    missions: {
      updateMany: async ({ data }) => {
        missionUpdateData = data;
        return { count: 1 };
      },
    },
    devices: {
      updateMany: async ({ where, data }) => {
        deviceUpdateWhere = where;
        deviceUpdateData = data;
        return { count: 1 };
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

const { confirmMission } = require("../src/modules/internal-api/missions.service");

(async () => {
  const beforeConfirm = new Date();
  const response = await confirmMission({
    reportId: "EMER-OLD001",
    deviceName: "BodyCam 001",
  }, { roleId: 1 });
  const afterConfirm = new Date();

  assert.strictEqual(response.statusCode, 200);
  assert.strictEqual(response.body.message, "Confirm emergency mission success");
  assert.ok(missionUpdateData, "mission should be updated");
  assert.strictEqual(missionUpdateData.MissionStatus, "6");
  assert.ok(missionUpdateData.StartTime instanceof Date, "StartTime should be updated");
  assert.ok(missionUpdateData.StartTime >= beforeConfirm, "StartTime should use current confirm time");
  assert.ok(missionUpdateData.StartTime <= afterConfirm, "StartTime should not be in the future");
  assert.strictEqual(
    missionUpdateData.EndTime.getTime(),
    missionUpdateData.StartTime.getTime() + 60 * 1000,
    "EndTime should be one minute after StartTime",
  );
  assert.deepStrictEqual(deviceUpdateWhere, { DeviceCode: "CAM-001" });
  assert.ok(deviceUpdateData.ActiveUpdatedAt instanceof Date, "device active timestamp should still be updated");

  console.log("smoke-confirm-emergency-mission-time-ok");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
