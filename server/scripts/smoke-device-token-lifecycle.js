const assert = require("assert");

const usersRepository = require("../src/modules/users/users.repository");
const { hashPassword } = require("../src/modules/auth/password.service");
const authService = require("../src/modules/auth/auth.service");

(async () => {
  const password = "secret123";
  const passwordHash = await hashPassword(password);

  // stub ผู้ใช้/role/session ที่ login ต้องใช้ (ไม่แตะ DB จริง)
  usersRepository.findUserByUsername = async () => ({
    UserId: 42,
    Username: "mobile_user",
    PasswordHash: passwordHash,
    RoleId: 2,
    Active: true,
  });
  usersRepository.findRoleById = async () => ({ RoleId: 2, RoleName: "Officer", SecurityLevel: 2 });
  usersRepository.deleteLoginSessionsByUserDevice = async () => {};
  usersRepository.createLoginSession = async () => {};
  usersRepository.createLoginLog = async () => {};

  // ---- login (mobile + firebaseToken) -> ลงทะเบียน device token (trim ให้) ----
  let upserts = [];
  usersRepository.upsertUserDevice = async (a) => { upserts.push(a); };

  const loginRes = await authService.login({
    username: "mobile_user",
    password,
    platform: "mobile",
    deviceId: "dev-1",
    firebaseToken: "  fcm-1 ",
  });
  assert.strictEqual(loginRes.statusCode, 200);
  assert.strictEqual(upserts.length, 1, "mobile login with firebaseToken should register device");
  assert.deepStrictEqual(upserts[0], {
    userId: 42,
    deviceId: "dev-1",
    firebaseToken: "fcm-1",
    platform: "mobile",
  });

  // ---- login (mobile ไม่มี firebaseToken) -> ไม่ลงทะเบียน ----
  upserts = [];
  await authService.login({ username: "mobile_user", password, platform: "mobile", deviceId: "dev-1" });
  assert.strictEqual(upserts.length, 0, "login without firebaseToken should not register");

  // ---- login (web) -> ไม่ลงทะเบียนแม้ส่ง firebaseToken มา ----
  upserts = [];
  await authService.login({ username: "mobile_user", password, platform: "web", firebaseToken: "x" });
  assert.strictEqual(upserts.length, 0, "web login should not register device");

  // ---- device-token endpoint (FCM rotate) -> upsert token ใหม่ + default platform mobile ----
  upserts = [];
  const rotate = await authService.updateDeviceToken({ userId: 42 }, { deviceId: "dev-1", firebaseToken: " fcm-rotated " });
  assert.strictEqual(rotate.statusCode, 200);
  assert.deepStrictEqual(upserts[0], {
    userId: 42,
    deviceId: "dev-1",
    firebaseToken: "fcm-rotated",
    platform: "mobile",
  });

  // device-token validation
  assert.strictEqual((await authService.updateDeviceToken({}, { deviceId: "d", firebaseToken: "t" })).statusCode, 401);
  assert.strictEqual((await authService.updateDeviceToken({ userId: 42 }, { firebaseToken: "t" })).statusCode, 400);
  assert.strictEqual((await authService.updateDeviceToken({ userId: 42 }, { deviceId: "d" })).statusCode, 400);

  // ---- logout (mobile) -> ลบ session + unregister (scope userId+deviceId และ token) ----
  let deactivateArgs = [];
  let deletedHash = null;
  usersRepository.findLoginSessionByRefreshTokenHash = async () => ({ SessionId: 9, UserId: 42, DeviceId: "dev-1" });
  usersRepository.deleteLoginSessionsByHash = async (h) => { deletedHash = h; };
  usersRepository.deactivateUserDevice = async (a) => { deactivateArgs.push(a); return { count: 1 }; };

  const out = await authService.logout({
    refreshToken: "rt",
    platform: "mobile",
    deviceId: "dev-1",
    firebaseToken: " fcm-rotated ",
  });
  assert.strictEqual(out.statusCode, 200);
  assert.ok(deletedHash, "logout should delete the session");
  assert.deepStrictEqual(deactivateArgs[0], { userId: 42, deviceId: "dev-1", firebaseToken: "fcm-rotated" });

  // ---- logout (web) -> ไม่ยุ่งกับ device token ----
  deactivateArgs = [];
  await authService.logout({ platform: "web" }, "cookie-rt");
  assert.strictEqual(deactivateArgs.length, 0, "web logout should not unregister device token");

  console.log("smoke-device-token-lifecycle-ok");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
