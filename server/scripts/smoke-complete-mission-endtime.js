const assert = require("assert");
const path = require("path");

const serverRoot = path.resolve(__dirname, "..");
const prismaModulePath = path.join(serverRoot, "src", "lib", "prisma.js");

let missionUpdate = null;

const makeFakePrisma = (missionStatus) => ({
  devices: {
    findFirst: async () => ({
      DeviceCode: "CAM-001",
      DeviceName: "BodyCam 001",
      Active: true,
    }),
  },
  missions: {
    findFirst: async () => ({
      MissionId: 1,
      ReportId: "INT-001",
      MissionStatus: missionStatus,
      DeviceCode: "CAM-001",
    }),
  },
  $transaction: async (callback) =>
    callback({
      missions: {
        updateMany: async ({ where, data }) => {
          missionUpdate = { where, data };
          return { count: 1 };
        },
      },
      devices: {
        updateMany: async () => ({ count: 1 }),
      },
    }),
});

require.cache[prismaModulePath] = {
  id: prismaModulePath,
  filename: prismaModulePath,
  loaded: true,
  exports: { prisma: makeFakePrisma("2") },
};

const { completeMission } = require("../src/modules/internal-api/missions.service");

(async () => {
  const before = Date.now();
  const response = await completeMission({
    reportId: "INT-001",
    deviceCode: "CAM-001",
  }, { roleId: 1 });
  const after = Date.now();

  assert.strictEqual(response.statusCode, 200);
  assert.deepStrictEqual(missionUpdate.where, { ReportId: "INT-001" });
  // จบงานปกติ -> สถานะ COMPLETED ("3")
  assert.strictEqual(missionUpdate.data.MissionStatus, "3");
  // EndTime ต้องถูกอัปเดตเป็นเวลาที่กดจบงานจริง
  assert.ok(missionUpdate.data.EndTime instanceof Date, "EndTime should be a Date");
  const endMs = missionUpdate.data.EndTime.getTime();
  assert.ok(endMs >= before && endMs <= after, "EndTime should be the actual completion time");

  console.log("smoke-complete-mission-endtime-ok");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
