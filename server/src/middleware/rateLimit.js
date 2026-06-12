const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 80;
const MAX_GENERAL_REQUESTS = 100;

const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, data] of rateLimitStore.entries()) {
    if (now - data.windowStart > RATE_LIMIT_WINDOW_MS) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

if (typeof cleanupInterval.unref === "function") {
  cleanupInterval.unref();
}

function rateLimit(maxRequests = MAX_GENERAL_REQUESTS, windowMs = RATE_LIMIT_WINDOW_MS) {
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress || "unknown";
    const key = `${ip}:${req.path}`;
    const now = Date.now();
    let record = rateLimitStore.get(key);

    if (!record || now - record.windowStart > windowMs) {
      record = { count: 1, windowStart: now };
      rateLimitStore.set(key, record);
      return next();
    }

    record.count += 1;

    if (record.count > maxRequests) {
      const retryAfter = Math.ceil((record.windowStart + windowMs - now) / 1000);
      res.set("Retry-After", String(retryAfter));
      return res.status(429).json({
        message: "Too many requests. Please try again later.",
        retryAfter,
      });
    }

    return next();
  };
}

function loginRateLimit() {
  return rateLimit(MAX_LOGIN_ATTEMPTS, RATE_LIMIT_WINDOW_MS);
}

module.exports = {
  rateLimit,
  loginRateLimit,
};
