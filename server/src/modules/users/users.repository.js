const { prisma } = require("../../lib/prisma");

function getUsersModel(client = prisma) {
  return client.users ?? client.Users;
}

function getRolesModel(client = prisma) {
  return client.roles ?? client.Roles;
}

function getLoginSessionModel(client = prisma) {
  return client.loginSession ?? client.LoginSession;
}

function getLoginLogsModel(client = prisma) {
  return client.loginLogs ?? client.LoginLogs;
}

function getUserDevicesModel(client = prisma) {
  return client.userDevices ?? client.UserDevices;
}

function isUniqueUsernameError(error) {
  const target = error?.meta?.target;
  const fields = Array.isArray(target) ? target : [target];

  return (
    error &&
    typeof error === "object" &&
    error.code === "P2002" &&
    fields.some((field) => String(field).toLowerCase() === "username")
  );
}

async function transaction(callback) {
  return prisma.$transaction(callback);
}

async function findUserByUsername(username, select) {
  return getUsersModel().findFirst({
    where: { Username: username },
    select,
  });
}

async function findUserById(userId, select) {
  return getUsersModel().findFirst({
    where: { UserId: userId },
    select,
  });
}

async function listUsers(select) {
  return getUsersModel().findMany({
    select,
    orderBy: { UserId: "asc" },
  });
}

async function createUser(data, select, client = prisma) {
  return getUsersModel(client).create({ data, select });
}

async function updateUser(userId, data, select) {
  return getUsersModel().update({
    where: { UserId: userId },
    data,
    select,
  });
}

async function deleteUser(userId) {
  return getUsersModel().delete({
    where: { UserId: userId },
  });
}

async function listRoles(select) {
  return getRolesModel().findMany({
    select,
    orderBy: { RoleId: "asc" },
  });
}

async function findRoleById(roleId, select) {
  return getRolesModel().findFirst({
    where: { RoleId: Number(roleId) },
    select,
  });
}

async function findRolesByIds(roleIds, select) {
  if (!roleIds.length) {
    return [];
  }

  return getRolesModel().findMany({
    where: { RoleId: { in: roleIds } },
    select,
  });
}

async function findLatestSuccessfulLogin(userId) {
  return getLoginLogsModel().findFirst({
    where: {
      UserId: userId,
      IsSuccess: true,
    },
    select: {
      LoggedAt: true,
      DeviceId: true,
    },
    orderBy: { LoggedAt: "desc" },
  });
}

async function createLoginLog(data) {
  return getLoginLogsModel().create({ data });
}

async function deleteLoginLogsByUserId(userId) {
  return getLoginLogsModel().deleteMany({
    where: { UserId: userId },
  });
}

async function findActiveLoginSessionByRefreshTokenHash(refreshTokenHash, now = new Date()) {
  return getLoginSessionModel().findFirst({
    where: {
      RefreshTokenHash: refreshTokenHash,
      ExpiresAt: { gt: now },
    },
  });
}

// หา session จาก refresh token hash โดยไม่กรอง expiry (ใช้ตอน logout เพื่อรู้ UserId ก่อนลบ)
async function findLoginSessionByRefreshTokenHash(refreshTokenHash) {
  return getLoginSessionModel().findFirst({
    where: { RefreshTokenHash: refreshTokenHash },
    select: { SessionId: true, UserId: true, DeviceId: true },
  });
}

async function createLoginSession(data) {
  return getLoginSessionModel().create({ data });
}

async function updateLoginSession(sessionId, data) {
  return getLoginSessionModel().update({
    where: { SessionId: sessionId },
    data,
  });
}

async function deleteLoginSessionById(sessionId) {
  return getLoginSessionModel().delete({
    where: { SessionId: sessionId },
  });
}

async function deleteLoginSessionsByHash(refreshTokenHash) {
  return getLoginSessionModel().deleteMany({
    where: { RefreshTokenHash: refreshTokenHash },
  });
}

async function deleteLoginSessionsByUserDevice(userId, deviceId) {
  return getLoginSessionModel().deleteMany({
    where: {
      UserId: userId,
      DeviceId: deviceId,
    },
  });
}

async function deleteLoginSessionsByUserId(userId) {
  return getLoginSessionModel().deleteMany({
    where: { UserId: userId },
  });
}

// บันทึก/อัปเดต FCM token ของเครื่อง (key = UserId + DeviceId) สำหรับ push notification
async function upsertUserDevice({ userId, deviceId, firebaseToken, platform = "mobile" }) {
  const now = new Date();

  return getUserDevicesModel().upsert({
    where: {
      UserId_DeviceId: {
        UserId: userId,
        DeviceId: deviceId,
      },
    },
    create: {
      UserId: userId,
      DeviceId: deviceId,
      FirebaseToken: firebaseToken,
      Platform: platform,
      IsActive: true,
      LastSeenAt: now,
    },
    update: {
      FirebaseToken: firebaseToken,
      Platform: platform,
      IsActive: true,
      LastSeenAt: now,
      UpdatedAt: now,
    },
  });
}

// รายการ FCM token ที่ยัง active ทั้งหมด (unique) สำหรับ broadcast push
async function listActiveDeviceTokens() {
  const rows = await getUserDevicesModel().findMany({
    where: { IsActive: true },
    select: { FirebaseToken: true },
  });

  return [...new Set(rows.map((row) => row.FirebaseToken).filter(Boolean))];
}

// ปิดการใช้งาน token ที่ FCM ตอบกลับว่าใช้ไม่ได้แล้ว (unregistered/invalid)
async function deactivateDeviceTokens(tokens) {
  if (!Array.isArray(tokens) || tokens.length === 0) {
    return { count: 0 };
  }

  return getUserDevicesModel().updateMany({
    where: { FirebaseToken: { in: tokens } },
    data: { IsActive: false, UpdatedAt: new Date() },
  });
}

// ปิด device token ที่ยัง active แต่ไม่ได้อัปเดต (LastSeenAt) ตั้งแต่ก่อน cutoff — ใช้โดย cleanup job
async function deactivateDeviceTokensNotSeenSince(cutoff) {
  return getUserDevicesModel().updateMany({
    where: {
      IsActive: true,
      LastSeenAt: { lt: cutoff },
    },
    data: { IsActive: false, UpdatedAt: new Date() },
  });
}

// unregister ตอน logout: ปิดแถวที่ match token ตรงตัว หรือเครื่อง (UserId + DeviceId) ของ session นั้น
// token เป็น unique ต่อ install จึงปลอดภัย ส่วน (UserId, DeviceId) กันกรณี token หมุนและ scope เฉพาะ user นี้
async function deactivateUserDevice({ userId, deviceId, firebaseToken }) {
  const conditions = [];

  if (firebaseToken) {
    conditions.push({ FirebaseToken: firebaseToken });
  }
  if (userId && deviceId) {
    conditions.push({ UserId: userId, DeviceId: deviceId });
  }

  if (conditions.length === 0) {
    return { count: 0 };
  }

  return getUserDevicesModel().updateMany({
    where: { OR: conditions, IsActive: true },
    data: { IsActive: false, UpdatedAt: new Date() },
  });
}

module.exports = {
  createLoginLog,
  createLoginSession,
  createUser,
  deactivateDeviceTokens,
  deactivateDeviceTokensNotSeenSince,
  deactivateUserDevice,
  deleteLoginLogsByUserId,
  deleteLoginSessionById,
  deleteLoginSessionsByHash,
  deleteLoginSessionsByUserDevice,
  deleteLoginSessionsByUserId,
  deleteUser,
  findLoginSessionByRefreshTokenHash,
  listActiveDeviceTokens,
  upsertUserDevice,
  findActiveLoginSessionByRefreshTokenHash,
  findLatestSuccessfulLogin,
  findRoleById,
  findRolesByIds,
  findUserById,
  findUserByUsername,
  isUniqueUsernameError,
  listRoles,
  listUsers,
  transaction,
  updateLoginSession,
  updateUser,
};
