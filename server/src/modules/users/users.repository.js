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

module.exports = {
  createLoginLog,
  createLoginSession,
  createUser,
  deleteLoginLogsByUserId,
  deleteLoginSessionById,
  deleteLoginSessionsByHash,
  deleteLoginSessionsByUserDevice,
  deleteLoginSessionsByUserId,
  deleteUser,
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
