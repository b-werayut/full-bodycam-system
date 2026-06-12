const assert = require("assert");
const path = require("path");

const serverRoot = path.resolve(__dirname, "..");
const prismaModulePath = path.join(serverRoot, "src", "lib", "prisma.js");

const startTime = new Date("2026-05-18T07:00:00.000Z");

let findManyArgs = null;
let findFirstArgs = null;
let createdEventLogData = null;
let existingOverdueLog = null;

const overdueMission = {
  MissionId: 321,
  ReportId: "RPT-OVERDUE-001",
  MissionName: "Patrol Area A",
  MissionStatus: "1",
  StartTime: startTime,
  EndTime: new Date(startTime.getTime() + 4 * 60 * 60 * 1000),
  DeviceCode: "CAM-001",
  Officers: { OfficerName: "Officer John", FirstName: "John", LastName: "Doe" },
  Devices: { DeviceCode: "CAM-001", DeviceName: "BodyCam 001" },
  Location: { LocationName: "Bangkok Central" },
};

const fakePrisma = {
  missions: {
    findMany: async (args) => {
      findManyArgs = args;
      return [overdueMission];
    },
  },
  eventLog: {
    findFirst: async (args) => {
      findFirstArgs = args;
      return existingOverdueLog;
    },
    create: async ({ data }) => {
      createdEventLogData = data;
      return { LogId: 1, ...data };
    },
  },
};

require.cache[prismaModulePath] = {
  id: prismaModulePath,
  filename: prismaModulePath,
  loaded: true,
  exports: { prisma: fakePrisma },
};

const {
  checkOverdueMissions,
  OVERDUE_ACCEPT_TYPE_KEY,
  OVERDUE_ACCEPT_SEVERITY,
} = require("../src/modules/internal-api/missionAlerts.service");

(async () => {
  // เคสที่ 1: ใบงาน PENDING เลยเวลาเริ่มแล้วและยังไม่เคยถูกแจ้งเตือน -> ต้องสร้าง event log
  const beforeCheck = new Date();
  const result = await checkOverdueMissions();
  const afterCheck = new Date();

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.logsCreated, 1, "should create one overdue alert");

  // เช็คเงื่อนไขการ query ใบงาน: ต้องเป็นสถานะ PENDING ("1") และ StartTime <= cutoff
  assert.ok(findManyArgs, "missions.findMany should be called");
  assert.strictEqual(findManyArgs.where.MissionStatus, "1");
  assert.ok(findManyArgs.where.StartTime.lte instanceof Date, "should filter StartTime by lte cutoff");
  assert.ok(findManyArgs.include.Officers, "should include officer for OfficerName");

  // เช็คเงื่อนไขกันแจ้งซ้ำ: ต้อง query ด้วย TypeKey + MissionId + ช่วงเวลา repeat
  assert.ok(findFirstArgs, "eventLog.findFirst should be called for dedup");
  assert.strictEqual(findFirstArgs.where.TypeKey, OVERDUE_ACCEPT_TYPE_KEY);
  assert.strictEqual(findFirstArgs.where.MissionId, 321);
  assert.ok(findFirstArgs.where.EventTime.gte instanceof Date, "dedup should use a repeat window");

  // เช็คข้อมูล event log ที่ถูกสร้าง
  assert.ok(createdEventLogData, "event log should be created");
  assert.strictEqual(createdEventLogData.TypeKey, OVERDUE_ACCEPT_TYPE_KEY);
  assert.strictEqual(createdEventLogData.Severity, OVERDUE_ACCEPT_SEVERITY);
  assert.strictEqual(createdEventLogData.MissionId, 321);
  assert.strictEqual(createdEventLogData.DeviceCode, "CAM-001");
  assert.strictEqual(createdEventLogData.OfficerName, "Officer John");
  assert.strictEqual(createdEventLogData.LocationName, "Bangkok Central");
  assert.strictEqual(createdEventLogData.IsRead, false);
  assert.ok(
    createdEventLogData.EventTime >= beforeCheck && createdEventLogData.EventTime <= afterCheck,
    "EventTime should be the check time",
  );
  assert.ok(
    createdEventLogData.Details.includes("ReportId: RPT-OVERDUE-001"),
    "details should carry ReportId so the client can link the mission",
  );
  assert.ok(
    createdEventLogData.Details.includes("อุปกรณ์ BodyCam 001 (CAM-001)"),
    "details should carry device info in the expected format",
  );
  assert.ok(
    createdEventLogData.Details.includes("ยังไม่มีการกดรับงาน"),
    "details should state the mission was not accepted",
  );

  // เคสที่ 2: มี event log แจ้งเตือนเดิมอยู่แล้วในช่วง repeat -> ต้องไม่สร้างซ้ำ
  createdEventLogData = null;
  existingOverdueLog = { LogId: 1 };

  const repeatResult = await checkOverdueMissions();
  assert.strictEqual(repeatResult.success, true);
  assert.strictEqual(repeatResult.logsCreated, 0, "should not re-alert within the repeat window");
  assert.strictEqual(createdEventLogData, null, "no new event log should be created on repeat");

  console.log("smoke-overdue-mission-accept-ok");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
