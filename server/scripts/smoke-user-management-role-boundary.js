const assert = require("assert");
const path = require("path");

const serverRoot = path.resolve(__dirname, "..");

function createResponse() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

function runAuthorizeMiddleware(middleware, roleId) {
  const req = { user: { roleId } };
  const res = createResponse();
  let nextCalled = false;

  middleware(req, res, () => {
    nextCalled = true;
  });

  return { nextCalled, statusCode: res.statusCode, body: res.body };
}

function getRoutePermission(router, method, routePath) {
  const layer = router.stack.find(
    (item) => item.route?.path === routePath && item.route.methods[method],
  );

  assert.ok(layer, `${method.toUpperCase()} ${routePath} should exist`);

  const permissionMiddleware = layer.route.stack
    .map((item) => item.handle)
    .find((handle) => handle.requiredMaxRoleId !== undefined);

  assert.ok(
    permissionMiddleware,
    `${method.toUpperCase()} ${routePath} should have role permission middleware`,
  );

  return permissionMiddleware.requiredMaxRoleId;
}

(async () => {
  const { authorizeRoleIdAtMost } = require("../src/middleware/auth");

  assert.strictEqual(
    runAuthorizeMiddleware(authorizeRoleIdAtMost(2), 1).nextCalled,
    true,
    "SuperAdmin roleId 1 should access user management",
  );
  assert.strictEqual(
    runAuthorizeMiddleware(authorizeRoleIdAtMost(2), 2).nextCalled,
    true,
    "Admin roleId 2 should access user management",
  );
  assert.strictEqual(
    runAuthorizeMiddleware(authorizeRoleIdAtMost(2), 3).statusCode,
    403,
    "Supervisor roleId 3 should not access user management",
  );
  assert.strictEqual(
    runAuthorizeMiddleware(authorizeRoleIdAtMost(2), 5).statusCode,
    403,
    "Viewer roleId 5 must not bypass as SuperAdmin",
  );

  const middlewareIndexPath = path.join(serverRoot, "src", "middleware", "index.js");
  const usersRoutesPath = path.join(serverRoot, "src", "modules", "users", "users.routes.js");

  delete require.cache[usersRoutesPath];
  require.cache[middlewareIndexPath] = {
    id: middlewareIndexPath,
    filename: middlewareIndexPath,
    loaded: true,
    exports: {
      authenticateToken: (_req, _res, next) => next(),
      auditLog: () => (_req, _res, next) => next(),
      validateRequest: () => (_req, _res, next) => next(),
      authorizeRoleIdAtMost: (maxRoleId) => {
        const middleware = (_req, _res, next) => next();
        middleware.requiredMaxRoleId = maxRoleId;
        return middleware;
      },
    },
  };

  const usersRouter = require("../src/modules/users/users.routes");

  assert.strictEqual(getRoutePermission(usersRouter, "get", "/users"), 2);
  assert.strictEqual(getRoutePermission(usersRouter, "get", "/users/:userId/details"), 2);
  assert.strictEqual(getRoutePermission(usersRouter, "get", "/users/:userId"), 2);
  assert.strictEqual(getRoutePermission(usersRouter, "get", "/roles"), 2);
  assert.strictEqual(getRoutePermission(usersRouter, "post", "/users"), 2);
  assert.strictEqual(getRoutePermission(usersRouter, "put", "/users/:userId"), 2);
  assert.strictEqual(getRoutePermission(usersRouter, "put", "/users/:userId/password"), 2);
  assert.strictEqual(getRoutePermission(usersRouter, "delete", "/users/:userId"), 2);

  console.log("smoke-user-management-role-boundary-ok");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
