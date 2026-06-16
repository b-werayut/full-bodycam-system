const { config } = require("../../config");
const { verifyJwt } = require("./token.service");
const authService = require("./auth.service");
const { isUniqueUsernameError } = require("../users/users.repository");

function shouldUseSecureCookie(req) {
  return config.auth.secureCookies && req.protocol === "https";
}

function setRefreshCookie(req, res, refreshToken) {
  if (!refreshToken) {
    return;
  }

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: shouldUseSecureCookie(req),
    sameSite: "strict",
    maxAge: config.auth.refreshTokenExpiresInSeconds * 1000,
    path: "/",
  });
}

function applyRefreshCookieResult(req, res, result) {
  if (result.clearRefreshCookie) {
    res.clearCookie("refreshToken", { path: "/" });
  }

  setRefreshCookie(req, res, result.refreshToken);
}

function sendResult(req, res, result) {
  applyRefreshCookieResult(req, res, result);
  return res.status(result.statusCode).json(result.body);
}

function sendDuplicateUsername(res) {
  return res.status(409).json({ message: "Username already exists" });
}

exports.register = async (req, res) => {
  try {
    return sendResult(req, res, await authService.register(req.body));
  } catch (error) {
    console.error("Register error:", error);
    if (isUniqueUsernameError(error)) {
      return sendDuplicateUsername(res);
    }
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.login = async (req, res) => {
  try {
    return sendResult(req, res, await authService.login(req.body));
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.refresh = async (req, res) => {
  try {
    return sendResult(req, res, await authService.refresh(req.body, req.cookies?.refreshToken));
  } catch (error) {
    console.error("Refresh token error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.logout = async (req, res) => {
  try {
    return sendResult(req, res, await authService.logout(req.body, req.cookies?.refreshToken));
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.changePassword = async (req, res) => {
  try {
    return sendResult(req, res, await authService.changePassword(req.user, req.body));
  } catch (error) {
    console.error("Change password error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Access token required" });
  }

  const payload = verifyJwt(token);
  if (!payload) {
    return res.status(401).json({ message: "Invalid or expired access token" });
  }

  req.user = payload;
  return next();
};

exports.me = async (req, res) => {
  try {
    return sendResult(req, res, await authService.me(req.user));
  } catch (error) {
    console.error("Get me error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.updateDeviceToken = async (req, res) => {
  try {
    return sendResult(req, res, await authService.updateDeviceToken(req.user, req.body));
  } catch (error) {
    console.error("Update device token error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
