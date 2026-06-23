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
const { canAccessDevice } = require("../../utils/deviceAccess");

const router = express.Router();

// guard: เสิร์ฟ/แปลง/ดาวน์โหลดวิดีโอได้เฉพาะ device ใน location ของ user (admin ทุก location)
// deviceCode อยู่ที่ body.playbackParams.deviceCode หรือ body.deviceCode แล้วแต่ endpoint
const requireDeviceAccess = async (req, res, next) => {
  const deviceCode = req.body?.playbackParams?.deviceCode || req.body?.deviceCode;
  if (!(await canAccessDevice(req.user, deviceCode))) {
    return res.status(403).json({ error: "Access denied for this device" });
  }
  return next();
};

router.post("/convert-hls-stream", authenticateToken, convertHlsToMp4Stream);
router.post("/convert-hls-file", authenticateToken, convertHlsToMp4File);
router.get("/download-video/:fileId", authenticateToken, downloadConvertedVideo);
router.post("/download-mp4", authenticateToken, requireDeviceAccess, downloadVideoAsMp4);
router.post("/check-video-cache", authenticateToken, requireDeviceAccess, checkVideoCache);
router.get("/stream-cached-video/:cacheKey", streamCachedVideo);
router.post("/convert-and-cache", authenticateToken, requireDeviceAccess, convertAndCacheVideo);
router.post("/cancel-conversion", authenticateToken, requireDeviceAccess, cancelConversion);
router.post("/download-video-mobile", authenticateToken, requireDeviceAccess, downloadVideoMobile);

module.exports = router;
