const fs = require("fs");
const path = require("path");

const serverRoot = path.resolve(__dirname, "..");
const routeFiles = [
  "src/modules/auth/auth.routes.js",
  "src/modules/users/users.routes.js",
  "src/modules/internal-api/internal-api.routes.js",
];

const violations = routeFiles.filter((routeFile) => {
  const routePath = path.join(serverRoot, routeFile);
  const source = fs.readFileSync(routePath, "utf8");
  const authControllerImports = source.matchAll(
    /const\s+\{([\s\S]*?)\}\s*=\s*require\(["'][^"']*Controllers\/auth_controller["']\);/g,
  );

  return Array.from(authControllerImports).some((match) => {
    const importedNames = match[1]
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean);

    return importedNames.includes("authenticateToken");
  });
});

if (violations.length > 0) {
  throw new Error(
    `Route files must use shared auth middleware instead of auth_controller: ${violations.join(", ")}`,
  );
}

console.log("smoke-auth-boundary-ok");
