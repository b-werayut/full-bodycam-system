const fs = require("fs");
const path = require("path");

process.env.VIDEO_CACHE_DURATION_MS = "123456";
process.env.VIDEO_MAX_CONVERSION_TIME_MS = "654321";

const {
  CACHE_DURATION_MS,
  MAX_CONVERSION_TIME_MS,
  parseTimeValue,
} = require("../src/modules/video/video.cache");

const serverRoot = path.resolve(__dirname, "..");
const routeFiles = ["src/modules/video/video.routes.js"];

const violations = routeFiles.filter((routeFile) => {
  const routePath = path.join(serverRoot, routeFile);
  const source = fs.readFileSync(routePath, "utf8");

  return /Controllers\/video_converter/.test(source);
});

if (violations.length > 0) {
  throw new Error(
    `Route files must use src/modules/video instead of legacy video controller: ${violations.join(", ")}`,
  );
}

const parsedDateTime = parseTimeValue("2026-04-23 14:38:00");
if (!Number.isFinite(parsedDateTime) || new Date(parsedDateTime).getFullYear() !== 2026) {
  throw new Error("Video datetime parser must preserve datetime strings instead of truncating them to a year");
}

if (CACHE_DURATION_MS !== 123456) {
  throw new Error("Video cache duration must use VIDEO_CACHE_DURATION_MS");
}

if (MAX_CONVERSION_TIME_MS !== 654321) {
  throw new Error("Maximum conversion time must use VIDEO_MAX_CONVERSION_TIME_MS");
}

console.log("smoke-video-boundary-ok");
