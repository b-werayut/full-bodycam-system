const assert = require("assert");

const usersRepository = require("../src/modules/users/users.repository");
const { hashPassword } = require("../src/modules/auth/password.service");
const authService = require("../src/modules/auth/auth.service");

(async () => {
  const password = "secret123";
  const passwordHash = await hashPassword(password);
  const loginLogs = [];
  const sessions = [];

  usersRepository.findUserByUsername = async () => ({
    UserId: 42,
    Username: "mobile_user",
    PasswordHash: passwordHash,
    RoleId: 2,
    Active: true,
  });
  usersRepository.findRoleById = async () => ({
    RoleId: 2,
    RoleName: "Officer",
    SecurityLevel: 2,
  });
  usersRepository.deleteLoginSessionsByUserDevice = async (userId, deviceId) => {
    assert.strictEqual(userId, 42);
    assert.strictEqual(deviceId, "device-abc");
  };
  usersRepository.createLoginSession = async (data) => {
    sessions.push(data);
  };
  usersRepository.createLoginLog = async (data) => {
    loginLogs.push(data);
  };

  const result = await authService.login({
    username: "mobile_user",
    password,
    deviceId: "device-abc",
    platform: "mobile",
  });

  assert.strictEqual(result.statusCode, 200);
  assert.ok(result.body.refreshToken, "mobile login should return refreshToken in body");
  assert.strictEqual(result.refreshToken, null, "mobile login should not set cookie refreshToken");
  assert.strictEqual(sessions.length, 1);
  assert.strictEqual(sessions[0].DeviceId, "device-abc");
  assert.strictEqual(loginLogs.length, 1);
  assert.strictEqual(loginLogs[0].DeviceId, "mobile");

  console.log("smoke-auth-login-platform-ok");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
