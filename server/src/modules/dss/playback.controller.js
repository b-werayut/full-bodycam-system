const { fetchPlaybackUrl } = require("./dss.service");
const { canAccessDevice } = require("../../utils/deviceAccess");

async function getPlayback(req, res) {
  try {
    const { deviceCode, channelId, startTime, endTime } = req.body;

    if (!deviceCode || !channelId || !startTime || !endTime) {
      console.log("No device code, channel id, start time or end time provided");
      return res.status(400).json({ error: "No device code, channel id, start time or end time provided" });
    }

    // เสิร์ฟ playback ได้เฉพาะ device ใน location ของ user (admin เข้าถึงทุก location)
    if (!(await canAccessDevice(req.user, deviceCode))) {
      return res.status(403).json({ error: "Access denied for this device" });
    }

    const data = await fetchPlaybackUrl(deviceCode, channelId, startTime, endTime);
    return res.json(data);
  } catch (error) {
    console.error("Playback error:", error);
    return res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getPlayback,
};
