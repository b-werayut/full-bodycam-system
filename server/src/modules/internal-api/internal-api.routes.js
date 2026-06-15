const express = require("express");
const { authenticateToken } = require("../../middleware");
const { getReport, getLocation, getOfficerData } = require("./reports.controller");
const { getOnlineDevices, getAllDevices } = require("./devices.controller");
const {
  createMission,
  updateMission,
  deleteMission,
  deleteCancelledMission,
  confirmMission,
  completeMission,
  cancelMission,
} = require("./missions.controller");
const { getEventLogs, markEventLogRead, getUnreadEventLogsCount } = require("./eventLogs.controller");

const router = express.Router();

// Reports
router.get("/getReport", authenticateToken, getReport);
router.get("/getlocation", authenticateToken, getLocation);
router.get("/getofficerData", authenticateToken, getOfficerData);

// Devices
router.get("/getonlinedevices", authenticateToken, getOnlineDevices);
router.get("/getalldevices", authenticateToken, getAllDevices);

// Event Logs
router.get("/geteventlogs", authenticateToken, getEventLogs);
router.get("/eventlogs/unread-count", authenticateToken, getUnreadEventLogsCount);
router.patch("/eventlogs/:id/read", authenticateToken, markEventLogRead);

// Missions CRUD
router.post("/createmission", authenticateToken, createMission);
router.put("/updatemission", authenticateToken, updateMission);
router.delete("/deletemission", authenticateToken, deleteMission);
router.delete("/deletecancelledmission", authenticateToken, deleteCancelledMission);
router.patch("/confirmmission", authenticateToken, confirmMission);
router.patch("/completemission", authenticateToken, completeMission);
router.patch("/cancelmission", authenticateToken, cancelMission);

module.exports = router;
