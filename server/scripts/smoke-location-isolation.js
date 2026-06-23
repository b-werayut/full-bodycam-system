/**
 * Isolation smoke test — พิสูจน์ว่า user เห็น/แตะได้เฉพาะข้อมูล location ตัวเอง
 *
 * ต่างจาก smoke อื่นตรงที่ mock prisma "เคารพ" where.LocationCode (กรองจริง)
 * เพื่อยืนยันพฤติกรรมปลายทาง: admin (RoleId 1-2) เห็นทุก location, role อื่นเห็นเฉพาะของตัว,
 * user ไม่มี location เห็นว่าง (fail-closed), และเขียน mission ข้าม location -> 403
 */
const assert = require("assert");
const path = require("path");

const serverRoot = path.resolve(__dirname, "..");
const prismaModulePath = path.join(serverRoot, "src", "lib", "prisma.js");

const makeLoc = (code, name, id) => ({
  LocationId: id,
  LocationCode: code,
  Latitude: null,
  Longitude: null,
  LocationName: name,
  CreatedAt: new Date("2026-01-01T00:00:00.000Z"),
});

// dataset 2 location + 1 device ที่ไม่มี location
const DEVICES = [
  { DeviceCode: "CAM-A", DeviceName: "Cam A", Status: true, Active: true, LocationCode: "LOC-A", Location: makeLoc("LOC-A", "Loc A", 1) },
  { DeviceCode: "CAM-B", DeviceName: "Cam B", Status: true, Active: true, LocationCode: "LOC-B", Location: makeLoc("LOC-B", "Loc B", 2) },
  { DeviceCode: "CAM-X", DeviceName: "Cam X", Status: true, Active: true, LocationCode: null, Location: null },
];

const EVENTLOGS = [
  { LogId: 1, LocationCode: "LOC-A", IsRead: false },
  { LogId: 2, LocationCode: "LOC-B", IsRead: true },
  { LogId: 3, LocationCode: "LOC-A", IsRead: true },
];

// เคารพ where-fragment ของ LocationCode: ไม่มี key = ไม่กรอง (admin), string = ตรงตัว, { in: [] } = ไม่ match อะไร
function matchLocation(where, row) {
  if (!where || !Object.prototype.hasOwnProperty.call(where, "LocationCode")) {
    return true;
  }
  const cond = where.LocationCode;
  if (cond && typeof cond === "object" && Array.isArray(cond.in)) {
    return cond.in.includes(row.LocationCode);
  }
  return row.LocationCode === cond;
}

function matchActive(where, row) {
  return where.Active === undefined || row.Active === where.Active;
}

function matchUnread(where, row) {
  if (!where || where.IsRead === undefined) {
    return true;
  }
  // { not: true } -> ยังไม่อ่าน (IsRead !== true)
  if (where.IsRead && typeof where.IsRead === "object" && Object.prototype.hasOwnProperty.call(where.IsRead, "not")) {
    return row.IsRead !== where.IsRead.not;
  }
  return row.IsRead === where.IsRead;
}

let missionForGuard = null;

const fakePrisma = {
  devices: {
    findMany: async ({ where = {} } = {}) => DEVICES.filter((d) => matchActive(where, d) && matchLocation(where, d)),
  },
  eventLog: {
    count: async ({ where = {} } = {}) => EVENTLOGS.filter((e) => matchLocation(where, e) && matchUnread(where, e)).length,
  },
  missions: {
    findFirst: async () => missionForGuard,
  },
};

require.cache[prismaModulePath] = {
  id: prismaModulePath,
  filename: prismaModulePath,
  loaded: true,
  exports: { prisma: fakePrisma },
};

const { getAllDevices } = require("../src/modules/internal-api/devices.controller");
const { getEventLogsCount, getUnreadEventLogsCount } = require("../src/modules/internal-api/eventLogs.controller");
const missionsService = require("../src/modules/internal-api/missions.service");

const ADMIN = { roleId: 1 };
const ADMIN2 = { roleId: 2 };
const USER_A = { roleId: 4, locationCode: "LOC-A" };
const USER_B = { roleId: 4, locationCode: "LOC-B" };
const USER_NONE = { roleId: 4, locationCode: null };

function makeRes() {
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

const deviceCodesFor = async (user) => {
  const res = makeRes();
  await getAllDevices({ user }, res);
  return res.body.map((d) => d.DeviceCode).sort();
};

const countFor = async (user) => {
  const res = makeRes();
  await getEventLogsCount({ user }, res);
  return res.body.count;
};

const unreadCountFor = async (user) => {
  const res = makeRes();
  await getUnreadEventLogsCount({ user }, res);
  return res.body.count;
};

(async () => {
  // ---- read isolation: devices ----
  assert.deepStrictEqual(await deviceCodesFor(ADMIN), ["CAM-A", "CAM-B", "CAM-X"], "SuperAdmin sees all devices");
  assert.deepStrictEqual(await deviceCodesFor(ADMIN2), ["CAM-A", "CAM-B", "CAM-X"], "Admin (RoleId 2) sees all devices");
  assert.deepStrictEqual(await deviceCodesFor(USER_A), ["CAM-A"], "user A sees only LOC-A device (null-location hidden)");
  assert.deepStrictEqual(await deviceCodesFor(USER_B), ["CAM-B"], "user B sees only LOC-B device");
  assert.deepStrictEqual(await deviceCodesFor(USER_NONE), [], "user without location sees nothing (fail-closed)");

  // ---- read isolation: event log counts ----
  assert.strictEqual(await countFor(ADMIN), 3, "admin counts all event logs");
  assert.strictEqual(await countFor(USER_A), 2, "user A counts only LOC-A logs");
  assert.strictEqual(await countFor(USER_B), 1, "user B counts only LOC-B logs");
  assert.strictEqual(await countFor(USER_NONE), 0, "user without location counts 0");

  assert.strictEqual(await unreadCountFor(ADMIN), 1, "admin unread = 1");
  assert.strictEqual(await unreadCountFor(USER_A), 1, "user A unread = 1 (LOC-A unread log)");
  assert.strictEqual(await unreadCountFor(USER_B), 0, "user B unread = 0 (LOC-B log already read)");

  // ---- write guard: updateMission ----
  // mission อยู่ LOC-B (สถานะ completed) -> user A ห้ามแตะ (403 ก่อนถึง logic อื่น)
  missionForGuard = { ReportId: "R-B", MissionStatus: "3", LocationCode: "LOC-B" };
  let guard = await missionsService.updateMission({ reportId: "R-B" }, USER_A);
  assert.strictEqual(guard.statusCode, 403, "user A blocked from editing LOC-B mission (cross-location write)");

  // mission เดิม + admin -> ผ่าน location guard (bypass) แล้วโดน block ด้วย status แทน (400 ไม่ใช่ 403)
  guard = await missionsService.updateMission({ reportId: "R-B" }, ADMIN);
  assert.strictEqual(guard.statusCode, 400, "admin passes location guard, blocked by status check instead");

  // mission อยู่ LOC-A + user A -> ผ่าน guard (location ตรง) แล้วโดน block ด้วย status (400 ไม่ใช่ 403)
  missionForGuard = { ReportId: "R-A", MissionStatus: "3", LocationCode: "LOC-A" };
  guard = await missionsService.updateMission({ reportId: "R-A" }, USER_A);
  assert.strictEqual(guard.statusCode, 400, "user A passes guard on own-location mission (blocked by status, not location)");

  console.log("smoke-location-isolation-ok");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
