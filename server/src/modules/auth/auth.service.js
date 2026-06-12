const { config } = require("../../config");
const usersRepository = require("../users/users.repository");
const { hashPassword, verifyPassword } = require("./password.service");
const {
  createJwt,
  generateRefreshToken,
  hashRefreshToken,
} = require("./token.service");

const AUTH_USER_SELECT = {
  UserId: true,
  Username: true,
  PasswordHash: true,
  RoleId: true,
  Active: true,
};

function toResult(statusCode, body, meta = {}) {
  return { statusCode, body, ...meta };
}

function securityLevelFromRoleInt(securityLevel) {
  if (securityLevel >= 3) return "high";
  if (securityLevel === 2) return "medium";
  return "low";
}

function mapAuthUser(user, role) {
  return {
    userId: user.UserId,
    username: user.Username,
    roleId: user.RoleId,
    roleName: role?.RoleName ?? "",
    securityLevel: role ? securityLevelFromRoleInt(role.SecurityLevel) : "low",
  };
}

function buildAccessToken(user, role) {
  return createJwt(mapAuthUser(user, role));
}

async function getAuthRole(roleId) {
  if (!roleId) {
    return null;
  }

  return usersRepository.findRoleById(roleId, {
    RoleId: true,
    RoleName: true,
    SecurityLevel: true,
  });
}

async function safeCreateLoginLog(data) {
  try {
    await usersRepository.createLoginLog(data);
  } catch {
    // Login logs should not block the authentication flow.
  }
}

function getRefreshExpiryDate() {
  return new Date(Date.now() + config.auth.refreshTokenExpiresInSeconds * 1000);
}

async function register(payload = {}) {
  const { username, password, roleId } = payload;
  const normalizedUsername = typeof username === "string" ? username.trim() : "";

  if (!normalizedUsername) {
    return toResult(400, { message: "Username is required" });
  }

  if (!password || typeof password !== "string") {
    return toResult(400, { message: "Password is required" });
  }

  if (password.length < 6) {
    return toResult(400, { message: "Password must be at least 6 characters" });
  }

  const existing = await usersRepository.findUserByUsername(normalizedUsername, { UserId: true });
  if (existing) {
    return toResult(409, { message: "Username already exists" });
  }

  const role = roleId ? await getAuthRole(roleId) : null;
  const created = await usersRepository.createUser(
    {
      Username: normalizedUsername,
      PasswordHash: await hashPassword(password),
      RoleId: role?.RoleId ?? null,
      Active: true,
      UpdatedAt: new Date(),
    },
    {
      UserId: true,
      Username: true,
      RoleId: true,
      Active: true,
      CreatedAt: true,
    },
  );

  return toResult(201, {
    message: "Registration successful",
    user: mapAuthUser(created, role),
  });
}

async function login(payload = {}) {
  const {
    username,
    password,
    deviceId = "web",
    platform = "web",
  } = payload;
  const isMobile = platform === "mobile";
  const loginLogPlatform = isMobile ? "mobile" : "web";

  if (!username || !password) {
    return toResult(400, { message: "Username and password are required" });
  }

  const user = await usersRepository.findUserByUsername(username, AUTH_USER_SELECT);

  if (!user) {
    await safeCreateLoginLog({
      UserId: null,
      Username: username,
      IsSuccess: false,
      FailureReason: "User not found",
      DeviceId: loginLogPlatform,
    });

    return toResult(401, { message: "Invalid credentials" });
  }

  if (!user.Active) {
    await safeCreateLoginLog({
      UserId: user.UserId,
      Username: username,
      IsSuccess: false,
      FailureReason: "Account disabled",
      DeviceId: loginLogPlatform,
    });

    return toResult(403, { message: "Account is disabled" });
  }

  const isValidPassword = await verifyPassword(password, user.PasswordHash);
  if (!isValidPassword) {
    await safeCreateLoginLog({
      UserId: user.UserId,
      Username: username,
      IsSuccess: false,
      FailureReason: "Invalid password",
      DeviceId: loginLogPlatform,
    });

    return toResult(401, { message: "Invalid credentials" });
  }

  const role = await getAuthRole(user.RoleId);
  const accessToken = buildAccessToken(user, role);
  const refreshToken = generateRefreshToken();

  await usersRepository.deleteLoginSessionsByUserDevice(user.UserId, deviceId);
  await usersRepository.createLoginSession({
    UserId: user.UserId,
    RefreshTokenHash: hashRefreshToken(refreshToken),
    DeviceId: deviceId,
    ExpiresAt: getRefreshExpiryDate(),
    LastUsedAt: new Date(),
  });

  await safeCreateLoginLog({
    UserId: user.UserId,
    Username: username,
    IsSuccess: true,
    DeviceId: loginLogPlatform,
  });

  const body = {
    message: "Login successful",
    accessToken,
    user: mapAuthUser(user, role),
  };

  if (isMobile) {
    body.refreshToken = refreshToken;
  }

  return toResult(200, body, {
    refreshToken: isMobile ? null : refreshToken,
  });
}

async function refresh(payload = {}, cookieRefreshToken) {
  const { refreshToken: bodyRefreshToken, platform = "web" } = payload;
  const isMobile = platform === "mobile";
  const refreshToken = isMobile ? bodyRefreshToken : cookieRefreshToken;

  if (!refreshToken) {
    return toResult(401, { message: "Refresh token not found" });
  }

  const session = await usersRepository.findActiveLoginSessionByRefreshTokenHash(hashRefreshToken(refreshToken));
  if (!session) {
    return toResult(
      401,
      { message: "Invalid or expired refresh token" },
      { clearRefreshCookie: !isMobile },
    );
  }

  const user = await usersRepository.findUserById(session.UserId, {
    UserId: true,
    Username: true,
    RoleId: true,
    Active: true,
  });

  if (!user || !user.Active) {
    await usersRepository.deleteLoginSessionById(session.SessionId);

    return toResult(
      401,
      { message: "User not found or disabled" },
      { clearRefreshCookie: !isMobile },
    );
  }

  const role = await getAuthRole(user.RoleId);
  const newRefreshToken = generateRefreshToken();
  await usersRepository.updateLoginSession(session.SessionId, {
    RefreshTokenHash: hashRefreshToken(newRefreshToken),
    LastUsedAt: new Date(),
    ExpiresAt: getRefreshExpiryDate(),
  });

  const body = {
    accessToken: buildAccessToken(user, role),
    user: mapAuthUser(user, role),
  };

  if (isMobile) {
    body.refreshToken = newRefreshToken;
  }

  return toResult(200, body, {
    refreshToken: isMobile ? null : newRefreshToken,
  });
}

async function logout(payload = {}, cookieRefreshToken) {
  const { refreshToken: bodyRefreshToken, platform = "web" } = payload;
  const isMobile = platform === "mobile";
  const refreshToken = isMobile ? bodyRefreshToken : cookieRefreshToken;

  if (refreshToken) {
    await usersRepository.deleteLoginSessionsByHash(hashRefreshToken(refreshToken));
  }

  return toResult(200, { message: "Logout successful" }, { clearRefreshCookie: !isMobile });
}

async function changePassword(authUser, payload = {}) {
  const userId = Number(authUser?.userId);
  const { currentPassword, newPassword } = payload;

  if (!userId || Number.isNaN(userId)) {
    return toResult(401, { message: "Authentication required" });
  }

  if (!currentPassword || typeof currentPassword !== "string") {
    return toResult(400, { message: "Current password is required" });
  }

  if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
    return toResult(400, { message: "New password must be at least 6 characters" });
  }

  const user = await usersRepository.findUserById(userId, {
    UserId: true,
    Username: true,
    PasswordHash: true,
    Active: true,
  });

  if (!user || !user.Active) {
    return toResult(404, { message: "User not found" });
  }

  const isValidCurrentPassword = await verifyPassword(currentPassword, user.PasswordHash);
  if (!isValidCurrentPassword) {
    return toResult(400, { message: "Current password is incorrect" });
  }

  await usersRepository.updateUser(
    user.UserId,
    {
      PasswordHash: await hashPassword(newPassword),
      UpdatedAt: new Date(),
    },
    { UserId: true },
  );

  return toResult(200, {
    message: "Change password success",
    data: {
      userId: user.UserId,
      username: user.Username,
    },
  });
}

async function me(authUser) {
  const { userId } = authUser;
  const user = await usersRepository.findUserById(userId, {
    UserId: true,
    Username: true,
    RoleId: true,
    Active: true,
  });

  if (!user) {
    return toResult(404, { message: "User not found" });
  }

  const role = await getAuthRole(user.RoleId);
  return toResult(200, mapAuthUser(user, role));
}

module.exports = {
  changePassword,
  login,
  logout,
  me,
  refresh,
  register,
  securityLevelFromRoleInt,
};
