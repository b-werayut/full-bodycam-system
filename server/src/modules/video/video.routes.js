const express = require("express");
const { authenticateToken } = require("../../middleware");
const {
  convertHlsToMp4Stream,
  convertHlsToMp4File,
  downloadConvertedVideo,
  downloadVideoAsMp4,
  downloadVideoMobile,
  checkVideoCache,
  streamCachedVideo,
  convertAndCacheVideo,
  cancelConversion,
  getVideoInfo,
} = require("./video.controller");

const router = express.Router();

router.post("/convert-hls-stream", authenticateToken, convertHlsToMp4Stream);
router.post("/convert-hls-file", authenticateToken, convertHlsToMp4File);
router.get("/download-video/:fileId", authenticateToken, downloadConvertedVideo);
router.post("/download-mp4", authenticateToken, downloadVideoAsMp4);
router.post("/check-video-cache", authenticateToken, checkVideoCache);
router.get("/stream-cached-video/:cacheKey", streamCachedVideo);
router.post("/convert-and-cache", authenticateToken, convertAndCacheVideo);
router.post("/cancel-conversion", authenticateToken, cancelConversion);
router.post("/download-video-mobile", authenticateToken, downloadVideoMobile);

module.exports = router;
