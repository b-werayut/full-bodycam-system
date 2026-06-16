const express = require("express");
const {
  register,
  login,
  refresh,
  logout,
  changePassword,
  me,
} = require("./auth.controller");
const { authenticateToken, loginRateLimit, validateRequest, auditLog } = require("../../middleware");
const {
  loginSchema,
  registerSchema,
  changePasswordSchema,
} = require("./auth.schemas");

const router = express.Router();

router.post("/register", loginRateLimit(), validateRequest(registerSchema), auditLog("REGISTER"), register);
router.post("/login", loginRateLimit(), validateRequest(loginSchema), auditLog("LOGIN"), login);
router.post("/refresh", loginRateLimit(), refresh);
router.post("/logout", auditLog("LOGOUT"), logout);
router.get("/me", authenticateToken, me);
router.put("/me/password", authenticateToken, validateRequest(changePasswordSchema), auditLog("CHANGE_PASSWORD"), changePassword);

module.exports = router;
