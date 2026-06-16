const path = require("path");
const { readBoolean, readInteger, readPositiveInteger, readString } = require("./env");

const rootDir = path.resolve(__dirname, "../..");
const isProduction = process.env.NODE_ENV === "production";

const config = {
  env: process.env.NODE_ENV || "development",
  isProduction,
  rootDir,
  server: {
    port: readPositiveInteger("PORT", 3009),
  },
  cors: {
    origin: readString("FRONTEND_URL", "http://localhost:3190"),
    credentials: true,
  },
  request: {
    jsonLimit: readString("JSON_BODY_LIMIT", "10mb"),
  },
  auth: {
    accessSecret: readString("JWT_ACCESS_SECRET", ""),
    accessTokenExpiresInSeconds: readPositiveInteger("ACCESS_TOKEN_EXPIRES_IN", 15 * 60),
    refreshTokenExpiresInSeconds: readPositiveInteger("REFRESH_TOKEN_EXPIRES_IN", 7 * 24 * 60 * 60),
    passwordIterations: readPositiveInteger("PASSWORD_ITERATIONS", 100000),
    passwordKeyLength: readPositiveInteger("PASSWORD_KEYLEN", 64),
    passwordDigest: readString("PASSWORD_DIGEST", "sha512"),
    secureCookies: readBoolean("SECURE_COOKIES", isProduction),
  },
  deviceStatus: {
    checkIntervalSeconds: readPositiveInteger("DEVICE_STATUS_CHECK_INTERVAL_SECONDS", 60),
    cacheResetSeconds: readPositiveInteger("DEVICE_STATUS_CACHE_RESET_SECONDS", 60 * 60),
    alertDelaySeconds: readPositiveInteger("DEVICE_STATUS_ALERT_DELAY_SECONDS", 15 * 60),
    onlineInactiveRepeatSeconds: readPositiveInteger("DEVICE_STATUS_ONLINE_INACTIVE_REPEAT_SECONDS", 60 * 60),
  },
  eventLogCleanup: {
    retentionDays: readPositiveInteger("EVENT_LOG_RETENTION_DAYS", 90),
    cron: readString("EVENT_LOG_CLEANUP_CRON", "0 0 * * *"),
    timezone: readString("EVENT_LOG_CLEANUP_TIMEZONE", "Asia/Bangkok"),
  },
  deviceTokenCleanup: {
    retentionDays: readPositiveInteger("DEVICE_TOKEN_RETENTION_DAYS", 60),
    cron: readString("DEVICE_TOKEN_CLEANUP_CRON", "0 3 * * *"),
    timezone: readString("DEVICE_TOKEN_CLEANUP_TIMEZONE", "Asia/Bangkok"),
  },
  missionAlerts: {
    checkIntervalSeconds: readPositiveInteger("MISSION_ALERT_CHECK_INTERVAL_SECONDS", 60),
    overdueGraceSeconds: readInteger("MISSION_ALERT_OVERDUE_GRACE_SECONDS", 0),
    repeatSeconds: readPositiveInteger("MISSION_ALERT_REPEAT_SECONDS", 60 * 60),
  },
  rateLimit: {
    maxRequests: readPositiveInteger("RATE_LIMIT_MAX_REQUESTS", 10000),
    windowMs: readPositiveInteger("RATE_LIMIT_WINDOW_MS", 15 * 60 * 1000),
  },
  video: {
    cacheDurationMs: readPositiveInteger("VIDEO_CACHE_DURATION_MS", 7 * 24 * 60 * 60 * 1000),
    maxConversionTimeMs: readPositiveInteger("VIDEO_MAX_CONVERSION_TIME_MS", 2 * 60 * 60 * 1000),
  },
  dss: {
    loginApiUrl: readString("LOGIN_API_URL", ""),
    streamApiUrl: readString("STREAM_API_URL", ""),
    playbackApiUrl: readString("PLAYBACK_API_URL", ""),
    locationApiUrl: readString("LOCATION_API_URL", ""),
    recordingSearchApiUrl: readString("RECORDING_SEARCH_API_URL", ""),
    username: readString("USER_DSS", ""),
    password: readString("PWD_DSS", ""),
  },
  firebase: {
    pushEnabled: readBoolean("FIREBASE_PUSH_ENABLED", true),
    serviceAccountPath: readString(
      "FIREBASE_SERVICE_ACCOUNT_PATH",
      path.join(rootDir, "firebase", "service_account.json"),
    ),
  },
};

module.exports = { config };
