const express = require("express");
const { authenticateToken, auditLog, authorizeRoleIdAtMost, validateRequest } = require("../../middleware");
const {
  listUsers,
  getUserById,
  getUserDetails,
  createUser,
  updateUser,
  resetUserPassword,
  deleteUser,
  listRoles,
} = require("./users.controller");
const {
  userIdParamsSchema,
  createUserSchema,
  updateUserSchema,
  resetPasswordSchema,
} = require("./users.schemas");

const router = express.Router();

router.get("/users", authenticateToken, authorizeRoleIdAtMost(2), listUsers);
router.get("/users/:userId/details", authenticateToken, authorizeRoleIdAtMost(2), validateRequest(userIdParamsSchema), getUserDetails);
router.get("/users/:userId", authenticateToken, authorizeRoleIdAtMost(2), validateRequest(userIdParamsSchema), getUserById);
router.post("/users", authenticateToken, authorizeRoleIdAtMost(2), validateRequest(createUserSchema), auditLog("CREATE_USER"), createUser);
router.put("/users/:userId", authenticateToken, authorizeRoleIdAtMost(2), validateRequest(updateUserSchema), auditLog("UPDATE_USER"), updateUser);
router.put("/users/:userId/password", authenticateToken, authorizeRoleIdAtMost(2), validateRequest(resetPasswordSchema), auditLog("RESET_USER_PASSWORD"), resetUserPassword);
router.delete("/users/:userId", authenticateToken, authorizeRoleIdAtMost(2), validateRequest(updateUserSchema), auditLog("DELETE_USER"), deleteUser);
router.get("/roles", authenticateToken, authorizeRoleIdAtMost(2), listRoles);

module.exports = router;
