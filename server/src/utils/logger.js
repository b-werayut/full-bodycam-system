/**
 * Structured Logging Service
 * Provides consistent logging format across the application
 */

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL?.toUpperCase()] ?? LOG_LEVELS.INFO;

/**
 * Format log message with metadata
 */
function formatLog(level, module, message, meta = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    module,
    message,
    ...meta,
  };

  // In production, output JSON for log aggregation
  if (process.env.NODE_ENV === "production") {
    return JSON.stringify(logEntry);
  }

  // In development, output human-readable format
  const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : "";
  return `[${timestamp}] [${level}] [${module}] ${message}${metaStr}`;
}

/**
 * Create a logger instance for a specific module
 * @param {string} moduleName - Name of the module using this logger
 */
function createLogger(moduleName) {
  return {
    error(message, meta = {}) {
      if (currentLevel >= LOG_LEVELS.ERROR) {
        console.error(formatLog("ERROR", moduleName, message, meta));
      }
    },

    warn(message, meta = {}) {
      if (currentLevel >= LOG_LEVELS.WARN) {
        console.warn(formatLog("WARN", moduleName, message, meta));
      }
    },

    info(message, meta = {}) {
      if (currentLevel >= LOG_LEVELS.INFO) {
        console.log(formatLog("INFO", moduleName, message, meta));
      }
    },

    debug(message, meta = {}) {
      if (currentLevel >= LOG_LEVELS.DEBUG) {
        console.log(formatLog("DEBUG", moduleName, message, meta));
      }
    },

    // Log HTTP request
    request(req, meta = {}) {
      this.info(`${req.method} ${req.originalUrl}`, {
        ip: req.ip,
        userAgent: req.get("user-agent"),
        userId: req.user?.id,
        ...meta,
      });
    },

    // Log HTTP response
    response(req, res, duration, meta = {}) {
      const level = res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";
      this[level](`${req.method} ${req.originalUrl} ${res.statusCode}`, {
        duration: `${duration}ms`,
        ...meta,
      });
    },

    // Log database operation
    db(operation, table, meta = {}) {
      this.debug(`DB ${operation} on ${table}`, meta);
    },

    // Log external API call
    api(method, url, statusCode, duration, meta = {}) {
      const level = statusCode >= 500 ? "error" : statusCode >= 400 ? "warn" : "info";
      this[level](`API ${method} ${url} ${statusCode}`, {
        duration: `${duration}ms`,
        ...meta,
      });
    },
  };
}

// Pre-configured loggers for common modules
const loggers = {
  app: createLogger("App"),
  auth: createLogger("Auth"),
  users: createLogger("Users"),
  devices: createLogger("Devices"),
  missions: createLogger("Missions"),
  dss: createLogger("DSS"),
  video: createLogger("Video"),
  socket: createLogger("Socket"),
  scheduler: createLogger("Scheduler"),
};

module.exports = {
  createLogger,
  loggers,
  LOG_LEVELS,
};
