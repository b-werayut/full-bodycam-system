const { hashPassword } = require("../auth/password.service");
const usersRepository = require("./users.repository");

const USER_SELECT = {
  UserId: true,
  Username: true,
  RoleId: true,
  Active: true,
  CreatedAt: true,
  UpdatedAt: true,
};

function toResult(statusCode, body) {
  return { statusCode, body };
}

function invalidUserIdResult() {
  return toResult(400, { message: "Invalid userId" });
}

function normalizeUserId(value) {
  const userId = Number(value);
  return Number.isNaN(userId) ? null : userId;
}

function mapRole(role) {
  return {
    roleId: role.RoleId,
    roleName: role.RoleName,
  };
}

function mapUserWithRole(user, role) {
  return {
    userId: user.UserId,
    username: user.Username,
    roleId: user.RoleId ?? null,
    roleName: role?.RoleName ?? "",
    Active: user.Active,
    createdAt: user.CreatedAt,
    updatedAt: user.UpdatedAt,
  };
}

async function getRoleById(roleId) {
  if (roleId == null || Number.isNaN(Number(roleId))) {
    return null;
  }

  return usersRepository.findRoleById(roleId, {
    RoleId: true,
    RoleName: true,
  });
}

async function listRoles() {
  const roles = await usersRepository.listRoles({
    RoleId: true,
    RoleName: true,
  });

  return toResult(200, roles.map(mapRole));
}

async function listUsers() {
  const users = await usersRepository.listUsers(USER_SELECT);
  const roleIds = Array.from(new Set(users.map((user) => user.RoleId).filter((roleId) => roleId != null)));
  const roles = await usersRepository.findRolesByIds(roleIds, {
    RoleId: true,
    RoleName: true,
  });
  const roleMap = new Map(roles.map((role) => [role.RoleId, role]));

  const body = users.map((user) => mapUserWithRole(user, user.RoleId != null ? roleMap.get(user.RoleId) : null));

  return toResult(200, body);
}

async function getUserById(userIdValue) {
  const userId = normalizeUserId(userIdValue);
  if (userId == null) {
    return invalidUserIdResult();
  }

  const user = await usersRepository.findUserById(userId, USER_SELECT);
  if (!user) {
    return toResult(404, { message: "User not found" });
  }

  const role = user.RoleId
    ? await usersRepository.findRoleById(user.RoleId, {
        RoleId: true,
        RoleName: true,
      })
    : null;

  return toResult(200, {
    ...mapUserWithRole(user, role),
    Active: true,
  });
}

async function getUserDetails(userIdValue) {
  const userId = normalizeUserId(userIdValue);
  if (userId == null) {
    return invalidUserIdResult();
  }

  const user = await usersRepository.findUserById(userId, USER_SELECT);
  if (!user) {
    return toResult(404, { message: "User not found" });
  }

  const role = user.RoleId
    ? await usersRepository.findRoleById(user.RoleId, {
        RoleId: true,
        RoleName: true,
      })
    : null;
  const latestLogin = await usersRepository.findLatestSuccessfulLogin(user.UserId);

  return toResult(200, {
    ...mapUserWithRole(user, role),
    status: user.Active ? "active" : "inactive",
    lastLoginAt: latestLogin?.LoggedAt ?? null,
    lastLoginPlatform: latestLogin?.DeviceId ?? null,
  });
}

async function createUser(payload = {}) {
  const { username, password, roleId, status, Active } = payload;
  const normalizedUsername = typeof username === "string" ? username.trim() : "";

  if (!normalizedUsername) {
    return toResult(400, { message: "username is required" });
  }

  if (!password || typeof password !== "string") {
    return toResult(400, { message: "password is required" });
  }

  const existing = await usersRepository.findUserByUsername(normalizedUsername, { UserId: true });
  if (existing) {
    return toResult(409, { message: "Username already exists" });
  }

  const role = await getRoleById(roleId);
  const hashedPassword = await hashPassword(password);
  const active = Active !== undefined ? Boolean(Active) : status ? status === "active" : true;

  const created = await usersRepository.transaction(async (tx) =>
    usersRepository.createUser(
      {
        Username: normalizedUsername,
        PasswordHash: hashedPassword,
        RoleId: role?.RoleId ?? null,
        Active: active,
        UpdatedAt: new Date(),
      },
      USER_SELECT,
      tx,
    ),
  );

  return toResult(201, {
    message: "Create user success",
    data: mapUserWithRole(created, role),
  });
}

async function updateUser(userIdValue, payload = {}, actor = {}) {
  const userId = normalizeUserId(userIdValue);
  if (userId == null) {
    return invalidUserIdResult();
  }

  const { username, roleId, Active, password } = payload;
  const normalizedUsername = typeof username === "string" ? username.trim() : "";
  const canUpdatePassword = Number(actor?.roleId) === 1;

  if (password && !canUpdatePassword) {
    return toResult(403, { message: "Only administrators can change passwords" });
  }

  const user = await usersRepository.findUserById(userId, {
    UserId: true,
    Username: true,
  });

  if (!user) {
    return toResult(404, { message: "User not found" });
  }

  if (normalizedUsername && normalizedUsername !== user.Username) {
    const existingUser = await usersRepository.findUserByUsername(normalizedUsername, { UserId: true });

    if (existingUser && existingUser.UserId !== userId) {
      return toResult(409, { message: "Username already exists" });
    }
  }

  const role = await getRoleById(roleId);
  const data = {
    ...(normalizedUsername ? { Username: normalizedUsername } : {}),
    ...(role ? { RoleId: role.RoleId } : roleId != null ? { RoleId: null } : {}),
    ...(Active !== undefined ? { Active: Boolean(Active) } : {}),
    ...(password && canUpdatePassword ? { PasswordHash: await hashPassword(password) } : {}),
    UpdatedAt: new Date(),
  };

  const updated = await usersRepository.updateUser(userId, data, USER_SELECT);
  const resolvedRole = updated.RoleId
    ? await usersRepository.findRoleById(updated.RoleId, {
        RoleId: true,
        RoleName: true,
      })
    : null;

  return toResult(200, {
    message: "Update user success",
    data: {
      ...mapUserWithRole(updated, resolvedRole),
      Active: updated.Active ? "active" : "inactive",
    },
  });
}

async function resetUserPassword(userIdValue, payload = {}) {
  const userId = normalizeUserId(userIdValue);
  if (userId == null) {
    return invalidUserIdResult();
  }

  const { password } = payload;
  if (!password || typeof password !== "string" || password.length < 6) {
    return toResult(400, { message: "password must be at least 6 characters" });
  }

  const user = await usersRepository.findUserById(userId, {
    UserId: true,
    Username: true,
  });

  if (!user) {
    return toResult(404, { message: "User not found" });
  }

  await usersRepository.updateUser(
    userId,
    {
      PasswordHash: await hashPassword(password),
      UpdatedAt: new Date(),
    },
    { UserId: true },
  );

  return toResult(200, {
    message: "Reset password success",
    data: {
      userId: user.UserId,
      username: user.Username,
    },
  });
}

async function deleteUser(userIdValue) {
  const userId = normalizeUserId(userIdValue);
  if (userId == null) {
    return invalidUserIdResult();
  }

  const user = await usersRepository.findUserById(userId, { UserId: true });
  if (!user) {
    return toResult(404, { message: "User not found" });
  }

  await usersRepository.deleteLoginLogsByUserId(userId);
  await usersRepository.deleteLoginSessionsByUserId(userId);
  await usersRepository.deleteUser(userId);

  return toResult(200, { message: "Delete user success" });
}

module.exports = {
  USER_SELECT,
  createUser,
  deleteUser,
  getRoleById,
  getUserById,
  getUserDetails,
  listRoles,
  listUsers,
  resetUserPassword,
  updateUser,
};
