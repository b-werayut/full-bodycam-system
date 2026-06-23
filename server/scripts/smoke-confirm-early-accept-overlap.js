const assert = require("assert");
const path = require("path");

const serverRoot = path.resolve(__dirname, "..");
const prismaModulePath = path.join(serverRoot, "src", "lib", "prisma.js");

// ใบงานที่กำลังกดรับ มีเวลาเริ่มในอนาคต (กดรับก่อนเวลา) และไม่ใช่งานฉุกเฉิน
const acceptedMission = {
  MissionId: 1,
  ReportId: "INT-EARLY",
  MissionStatus: "1", // PENDING
  DeviceCode: "CAM-001",
  StartTime: new Date(Date.now() + 60 * 60 * 1000), // อีก 1 ชั่วโมง
  EndTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
  OfficerId: 1,
};

let missionRecord = acceptedMission;
let overlapResult = null;
let overlapFindArgs = null;
let transactionRan = false;
let missionUpdateData = null;

const fakePrisma = {
  devices: {
    findFirst: async () => ({
      DeviceCode: "CAM-001",
      DeviceName: "BodyCam 001",
      Active: false,
    }),
  },
  missions: {
    // findFirst ถูกเรียกทั้งจาก findMissionStatus (มี select) และ findOverlappingMission (มี include)
    findFirst: async (args) => {
      if (args.select) {
        return missionRecord;
      }
      overlapFindArgs = args;
      return overlapResult;
    },
  },
  location: {
    findUnique: async () => ({ LocationName: "Bangkok Central" }),
  },
  $transaction: async (callback) => {
    transactionRan = true;
    return callback({
      missions: {
        updateMany: async ({ data }) => {
          missionUpdateData = data;
          return { count: 1 };
        },
      },
      devices: {
        updateMany: async () => ({ count: 1 }),
      },
    });
  },
};

require.cache[prismaModulePath] = {
  id: prismaModulePath,
  filename: prismaModulePath,
  loaded: true,
  exports: { prisma: fakePrisma },
};

const { confirmMission } = require("../src/modules/internal-api/missions.service");

(async () => {
  // กรณีที่ 1: รับงานก่อนเวลาแล้วช่วงเวลาที่กดรับชนกับใบงานอื่น -> 409 และต้องไม่รับงาน
  overlapResult = {
    ReportId: "INT-EXISTING",
    StartTime: new Date(Date.now() - 30 * 60 * 1000),
    EndTime: new Date(Date.now() + 90 * 60 * 1000),
    DeviceCode: "CAM-001",
    Devices: { DeviceName: "BodyCam 001" },
    OfficerId: 1,
    LocationCode: "LOC-001",
  };
  transactionRan = false;
  overlapFindArgs = null;

  const blocked = await confirmMission({
    reportId: "INT-EARLY",
    deviceName: "BodyCam 001",
  }, { roleId: 1 });

  assert.strictEqual(blocked.statusCode, 409, "overlapping early accept must be blocked");
  assert.strictEqual(blocked.body.data.reportId, "INT-EXISTING");
  assert.strictEqual(blocked.body.data.conflictOn, "both", "same device and officer");
  assert.strictEqual(blocked.body.data.locationName, "Bangkok Central");
  assert.strictEqual(transactionRan, false, "must not confirm mission when overlapping");
  // ต้องใช้ "เวลาที่กดรับ" (ตอนนี้) เป็นจุดเริ่มตรวจ ไม่ใช่ StartTime เดิมในอนาคต
  assert.ok(
    overlapFindArgs.where.EndTime.gt <= new Date(),
    "overlap check must use press time (now) as the start reference",
  );
  assert.deepStrictEqual(overlapFindArgs.where.ReportId, { not: "INT-EARLY" }, "must exclude itself");

  // กรณีที่ 2: รับงานล่วงหน้าแต่ไม่ชนกับใบงานใด -> รับงานได้ (200) และเขียนทับ StartTime ด้วยเวลาที่กดรับ
  overlapResult = null;
  transactionRan = false;
  missionUpdateData = null;

  const beforeAccept = new Date();
  const ok = await confirmMission({
    reportId: "INT-EARLY",
    deviceName: "BodyCam 001",
  }, { roleId: 1 });
  const afterAccept = new Date();

  assert.strictEqual(ok.statusCode, 200, "non-overlapping early accept must succeed");
  assert.strictEqual(ok.body.message, "Confirm mission success");
  assert.strictEqual(transactionRan, true, "mission should be confirmed");
  assert.strictEqual(missionUpdateData.MissionStatus, "2", "status should become in-progress");
  // รับงานล่วงหน้าและไม่ชน: เขียนทับ StartTime ด้วยเวลาที่กดรับ (ตอนนี้) แต่ต้องไม่แตะ EndTime เดิม
  assert.ok(missionUpdateData.StartTime instanceof Date, "early accept should rewrite StartTime");
  assert.ok(missionUpdateData.StartTime >= beforeAccept, "StartTime should use the press time (now)");
  assert.ok(missionUpdateData.StartTime <= afterAccept, "StartTime should not be in the future");
  assert.ok(
    missionUpdateData.StartTime < acceptedMission.StartTime,
    "StartTime should be earlier than the original future schedule",
  );
  assert.strictEqual(missionUpdateData.EndTime, undefined, "early accept must not rewrite EndTime");
  // ระยะเวลา (Duration) ต้องถูกคำนวณใหม่จากช่วง [StartTime ใหม่ -> EndTime เดิม] เป็นนาที
  const expectedDuration = Math.round(
    (acceptedMission.EndTime.getTime() - missionUpdateData.StartTime.getTime()) / 60000,
  );
  assert.strictEqual(
    missionUpdateData.Duration,
    expectedDuration,
    "Duration should be recalculated from the press time to the original end time",
  );
  assert.ok(missionUpdateData.Duration > 0, "recalculated Duration should be positive");

  // กรณีที่ 3: รับงานหลังเลยเวลาสิ้นสุดที่กำหนด -> 422 ไม่รับงาน (ต้องไปขยับ EndTime ใหม่ก่อน)
  missionRecord = {
    ...acceptedMission,
    StartTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
    EndTime: new Date(Date.now() - 60 * 60 * 1000), // สิ้นสุดไปแล้ว 1 ชั่วโมง
  };
  overlapResult = null;
  transactionRan = false;

  const expired = await confirmMission({
    reportId: "INT-EARLY",
    deviceName: "BodyCam 001",
  }, { roleId: 1 });

  assert.strictEqual(expired.statusCode, 422, "accepting after end time must be blocked");
  assert.strictEqual(expired.body.data.reason, "end-time-passed");
  assert.strictEqual(transactionRan, false, "must not confirm a mission past its end time");

  console.log("smoke-confirm-early-accept-overlap-ok");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
