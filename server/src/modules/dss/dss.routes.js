const express = require("express");
const { authenticateToken } = require("../../middleware");
const { getStream } = require("./stream.controller");
const { getPlayback } = require("./playback.controller");
const { searchRecordings } = require("./recordings.controller");

const router = express.Router();

router.post("/getstream", authenticateToken, getStream);
router.post("/getplayback", authenticateToken, getPlayback);
router.post("/recording/search", authenticateToken, searchRecordings);

module.exports = router;
