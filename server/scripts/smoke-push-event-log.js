const assert = require("assert");
const path = require("path");

// push.service ทำ `const { getMessaging } = require("../../lib/firebase")` แบบ destructure
// จึงต้อง inject fake ผ่าน require.cache "ก่อน" require push.service (monkeypatch ทีหลังไม่ทัน)
const firebasePath = path.join(__dirname, "..", "src", "lib", "firebase.js");

let lastMessage = null;
let multicastResponse = null;
const fakeMessaging = {
  sendEachForMulticast: async (message) => {
    lastMessage = message;
    return multicastResponse(message);
  },
};

require.cache[firebasePath] = {
  id: firebasePath,
  filename: firebasePath,
  loaded: true,
  exports: { getMessaging: () => fakeMessaging },
};

const usersRepository = require("../src/modules/users/users.repository");
const pushService = require("../src/modules/notifications/push.service");

const allSuccess = (message) => ({
  successCount: message.tokens.length,
  failureCount: 0,
  responses: message.tokens.map(() => ({ success: true })),
});

(async () => {
  usersRepository.listActiveDeviceTokens = async () => ["t1"];
  usersRepository.deactivateDeviceTokens = async () => ({ count: 0 });
  multicastResponse = allSuccess;

  // ---- camera + HIGH -> emoji 🔴, channel alerts_high, body = device label · location ----
  await pushService.sendEventLogPush(
    {
      LogId: 1,
      TypeKey: "กล้องออฟไลน์ระหว่างปฏิบัติงาน",
      Severity: "HIGH",
      DeviceCode: "CAM-001",
      MissionId: 55,
      LocationName: "Bangkok Central",
      OfficerName: "System",
      Details: "อุปกรณ์ BodyCam 001 (CAM-001) ออฟไลน์ระหว่างปฏิบัติงาน | ประเภท: bodycam | Serial: SN1 | ReportId: -",
    },
    "camera",
  );
  assert.strictEqual(lastMessage.notification.title, "🔴 กล้องออฟไลน์ระหว่างปฏิบัติงาน");
  assert.strictEqual(lastMessage.notification.body, "BodyCam 001 (CAM-001) · Bangkok Central");
  assert.deepStrictEqual(lastMessage.data, { type: "camera", id: "CAM-001" });
  assert.strictEqual(lastMessage.android.priority, "high");
  assert.strictEqual(lastMessage.android.notification.channelId, "alerts_high");
  assert.strictEqual(lastMessage.apns.headers["apns-priority"], "10");
  assert.strictEqual(lastMessage.apns.payload.aps.sound, "default");

  // ---- mission + WARNING -> emoji ⚠️, channel alerts_default, body = mission · officer ----
  await pushService.sendEventLogPush(
    {
      LogId: 2,
      TypeKey: "ใบงานถึงเวลายังไม่รับงาน",
      Severity: "WARNING",
      DeviceCode: "CAM-001",
      MissionId: 321,
      OfficerName: "Officer John",
      Details: "ใบงาน Patrol Area A ถึงกำหนดเวลาเริ่ม 18/5/2569 14:00 แล้วแต่ยังไม่มีการกดรับงาน | เจ้าหน้าที่: Officer John | อุปกรณ์ BodyCam 001 (CAM-001) | ReportId: RPT-1",
    },
    "mission",
  );
  assert.strictEqual(lastMessage.notification.title, "⚠️ ใบงานถึงเวลายังไม่รับงาน");
  assert.strictEqual(lastMessage.notification.body, "Patrol Area A · Officer John");
  assert.deepStrictEqual(lastMessage.data, { type: "mission", id: "321" });
  assert.strictEqual(lastMessage.android.notification.channelId, "alerts_default");

  // ---- ไม่ระบุ type -> fallback eventlog/LogId, body = ประโยคแรกของ Details ----
  await pushService.sendEventLogPush({
    LogId: 3,
    TypeKey: "อื่นๆ",
    Severity: "LOW",
    DeviceCode: "X",
    MissionId: 9,
    Details: "ข้อความหลัก | meta1 | meta2",
  });
  assert.strictEqual(lastMessage.notification.title, "⚠️ อื่นๆ");
  assert.strictEqual(lastMessage.notification.body, "ข้อความหลัก");
  assert.deepStrictEqual(lastMessage.data, { type: "eventlog", id: "3" });

  // ---- multicast: นับ sent/failed + ปิดเฉพาะ token ที่ unregistered ----
  let deactivated = null;
  usersRepository.listActiveDeviceTokens = async () => ["good", "bad"];
  usersRepository.deactivateDeviceTokens = async (tokens) => { deactivated = tokens; return { count: tokens.length }; };
  multicastResponse = () => ({
    successCount: 1,
    failureCount: 1,
    responses: [
      { success: true },
      { success: false, error: { code: "messaging/registration-token-not-registered" } },
    ],
  });

  const res = await pushService.sendEventLogPush(
    { LogId: 4, TypeKey: "t", Severity: "HIGH", DeviceCode: "C", MissionId: null, Details: "d" },
    "camera",
  );
  assert.strictEqual(res.sent, 1);
  assert.strictEqual(res.failed, 1);
  assert.strictEqual(res.invalidated, 1);
  assert.deepStrictEqual(deactivated, ["bad"], "only the unregistered token should be deactivated");

  // ---- ไม่มี active token -> skip ----
  usersRepository.listActiveDeviceTokens = async () => [];
  const skipped = await pushService.sendEventLogPush({ LogId: 5, TypeKey: "t", Severity: "LOW", Details: "d" }, "camera");
  assert.strictEqual(skipped.skipped, true, "should skip when there are no active tokens");

  console.log("smoke-push-event-log-ok");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
