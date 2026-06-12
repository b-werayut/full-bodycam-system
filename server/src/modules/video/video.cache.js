const crypto = require("crypto");
const fs = require("fs-extra");
const os = require("os");
const path = require("path");
const { config } = require("../../config");

const TEMP_DIR = path.join(os.tmpdir(), "bodycam-video-temp");
const CACHE_DURATION_MS = config.video.cacheDurationMs;
const MAX_CONVERSION_TIME_MS = config.video.maxConversionTimeMs;
const activeConversions = new Map();

fs.ensureDirSync(TEMP_DIR);

function parseTimemark(timemark) {
  if (!timemark) return 0;
  const parts = timemark.split(":");
  if (parts.length !== 3) return 0;
  const hours = parseInt(parts[0]) || 0;
  const minutes = parseInt(parts[1]) || 0;
  const seconds = parseFloat(parts[2]) || 0;
  return hours * 3600 + minutes * 60 + seconds;
}

function cleanupTempFiles() {
  try {
    const files = fs.readdirSync(TEMP_DIR);
    const now = Date.now();

    files.forEach((file) => {
      const filePath = path.join(TEMP_DIR, file);
      const stats = fs.statSync(filePath);

      if (file.endsWith(".converting")) {
        try {
          const markerContent = fs.readFileSync(filePath, "utf8");
          const markerStartTime = parseInt(markerContent.split("|")[0]) || 0;
          if (now - markerStartTime > MAX_CONVERSION_TIME_MS) {
            fs.removeSync(filePath);
            console.log(`[VideoConverter] Cleaned up stale converting marker: ${file}`);
            const mp4File = filePath.replace(".converting", ".mp4");
            if (fs.existsSync(mp4File)) {
              fs.removeSync(mp4File);
              console.log(`[VideoConverter] Cleaned up incomplete mp4: ${file.replace(".converting", ".mp4")}`);
            }
          }
        } catch (err) {
          if (now - stats.mtimeMs > MAX_CONVERSION_TIME_MS) {
            fs.removeSync(filePath);
            console.log(`[VideoConverter] Cleaned up old converting marker: ${file}`);
          }
        }
        return;
      }

      if (now - stats.mtimeMs > CACHE_DURATION_MS) {
        fs.removeSync(filePath);
        console.log(`[VideoConverter] Cleaned up old temp file: ${file}`);
      }
    });
  } catch (err) {
    console.error("[VideoConverter] Cleanup error:", err.message);
  }
}

function generateCacheKey(deviceCode, startTime, endTime) {
  const key = `${deviceCode}_${startTime}_${endTime}`;
  return crypto.createHash("md5").update(key).digest("hex");
}

function parseTimeValue(timeValue) {
  if (timeValue === undefined || timeValue === null) return null;
  if (typeof timeValue === "number") {
    return Number.isFinite(timeValue) ? timeValue : null;
  }

  const value = String(timeValue).trim();
  if (!value) return null;

  if (/^-?\d+$/.test(value)) {
    return Number(value);
  }

  const parsed = new Date(value.replace(" ", "T"));
  return parsed.getTime();
}

function isValidTimeRange(startTime, endTime) {
  return Number.isFinite(startTime) && Number.isFinite(endTime) && endTime > startTime;
}

function formatTimestampToDatetime(timestamp) {
  if (typeof timestamp === "string" && timestamp.includes("-")) {
    return timestamp;
  }

  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function startTempCleanup() {
  const timer = setInterval(cleanupTempFiles, 30 * 60 * 1000);
  timer.unref?.();
  return timer;
}

module.exports = {
  CACHE_DURATION_MS,
  MAX_CONVERSION_TIME_MS,
  TEMP_DIR,
  activeConversions,
  cleanupTempFiles,
  formatTimestampToDatetime,
  generateCacheKey,
  isValidTimeRange,
  parseTimeValue,
  parseTimemark,
  startTempCleanup,
};
