const { verifyJwt } = require("../modules/auth/token.service");

const SUPERADMIN_ROLE_ID = 1;

function authenticateToken(req, res, next) {
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
}

function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const userRole = req.user.roleName?.toLowerCase() || "";
    const allowed = allowedRoles.map((role) => role.toLowerCase());

    if (!allowed.includes(userRole)) {
      return res.status(403).json({
        message: "Access denied. Insufficient permissions.",
        requiredRoles: allowedRoles,
      });
    }

    return next();
  };
}

function authorizeRoleIdAtMost(maxRoleId) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const userRoleId = req.user.roleId;

    if (userRoleId === undefined || userRoleId === null) {
      return res.status(403).json({
        message: "Access denied. Role not assigned.",
      });
    }

    if (userRoleId === SUPERADMIN_ROLE_ID) {
      return next();
    }

    if (userRoleId > maxRoleId) {
      return res.status(403).json({
        message: "Access denied. Insufficient permissions.",
        requiredMaxRoleId: maxRoleId,
        currentRoleId: userRoleId,
      });
    }

    return next();
  };
}

const authorizeSecurityLevel = authorizeRoleIdAtMost;

function requireAuth(options = {}) {
  const middlewares = [authenticateToken];

  if (options.roles && options.roles.length > 0) {
    middlewares.push(authorizeRoles(...options.roles));
  }

  if (options.securityLevel) {
    middlewares.push(authorizeSecurityLevel(options.securityLevel));
  }

  return middlewares;
}

module.exports = {
  authenticateToken,
  authorizeRoles,
  authorizeRoleIdAtMost,
  authorizeSecurityLevel,
  requireAuth,
  verifyJwt,
};
