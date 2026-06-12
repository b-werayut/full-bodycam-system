function auditLog(action) {
  return (req, res, next) => {
    const originalSend = res.send;

    res.send = function sendWithAudit(body) {
      const logEntry = {
        timestamp: new Date().toISOString(),
        action,
        userId: req.user?.userId || "anonymous",
        username: req.user?.username || "anonymous",
        ip: req.ip || req.connection.remoteAddress,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        userAgent: req.headers["user-agent"],
      };

      if (res.statusCode >= 400) {
        console.warn("[AUDIT]", JSON.stringify(logEntry));
      } else {
        console.log("[AUDIT]", JSON.stringify(logEntry));
      }

      return originalSend.call(this, body);
    };

    return next();
  };
}

module.exports = { auditLog };
