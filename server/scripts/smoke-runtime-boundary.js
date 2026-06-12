const fs = require("fs");
const path = require("path");

const serverRoot = path.resolve(__dirname, "..");
const runtimeFiles = [
  "src/utils/socketHandler.js",
  "src/utils/deviceStatusScheduler.js",
];

const violations = runtimeFiles.filter((runtimeFile) => {
  const runtimePath = path.join(serverRoot, runtimeFile);
  const source = fs.readFileSync(runtimePath, "utf8");
  return source.includes("../Controllers/") || source.includes("./Controllers/");
});

if (violations.length > 0) {
  throw new Error(
    `Runtime utilities must use src module services instead of Controllers: ${violations.join(", ")}`,
  );
}

console.log("smoke-runtime-boundary-ok");
