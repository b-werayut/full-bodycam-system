const assert = require("assert");

const usersRepository = require("../src/modules/users/users.repository");
const usersService = require("../src/modules/users/users.service");

const ORIGINAL_REPOSITORY_METHODS = {
  findRoleById: usersRepository.findRoleById,
  findUserById: usersRepository.findUserById,
  findUserByUsername: usersRepository.findUserByUsername,
  updateUser: usersRepository.updateUser,
};

function restoreRepository() {
  Object.assign(usersRepository, ORIGINAL_REPOSITORY_METHODS);
}

function mockRepository(overrides) {
  restoreRepository();
  Object.assign(usersRepository, overrides);
}

async function rejectsUnknownRoleIdWithoutClearingUserRole() {
  let updateCalled = false;

  mockRepository({
    findUserById: async () => ({
      UserId: 2,
      Username: "admin",
    }),
    findUserByUsername: async () => null,
    findRoleById: async () => null,
    updateUser: async (_userId, data) => {
      updateCalled = true;
      return {
        UserId: 2,
        Username: data.Username ?? "admin",
        RoleId: data.RoleId ?? null,
        Active: data.Active ?? true,
        CreatedAt: new Date("2026-06-08T00:00:00.000Z"),
        UpdatedAt: data.UpdatedAt,
      };
    },
  });

  const result = await usersService.updateUser(
    2,
    {
      username: "admin",
      roleId: 999,
      Active: true,
    },
    { roleId: 1 },
  );

  assert.strictEqual(result.statusCode, 400);
  assert.strictEqual(result.body.message, "Invalid roleId");
  assert.strictEqual(updateCalled, false);
}

async function updatesUserToExistingRoleId() {
  let updatedData = null;
  const adminRole = {
    RoleId: 2,
    RoleName: "Admin",
  };

  mockRepository({
    findUserById: async () => ({
      UserId: 2,
      Username: "admin",
    }),
    findUserByUsername: async () => null,
    findRoleById: async (roleId) => (Number(roleId) === 2 ? adminRole : null),
    updateUser: async (_userId, data) => {
      updatedData = data;
      return {
        UserId: 2,
        Username: data.Username ?? "admin",
        RoleId: data.RoleId ?? null,
        Active: data.Active ?? true,
        CreatedAt: new Date("2026-06-08T00:00:00.000Z"),
        UpdatedAt: data.UpdatedAt,
      };
    },
  });

  const result = await usersService.updateUser(
    2,
    {
      username: "admin",
      roleId: 2,
      Active: true,
    },
    { roleId: 1 },
  );

  assert.strictEqual(result.statusCode, 200);
  assert.strictEqual(updatedData.RoleId, 2);
  assert.strictEqual(result.body.data.roleId, 2);
  assert.strictEqual(result.body.data.roleName, "Admin");
}

(async () => {
  try {
    await rejectsUnknownRoleIdWithoutClearingUserRole();
    await updatesUserToExistingRoleId();
    console.log("smoke-user-role-update-ok");
  } finally {
    restoreRepository();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
