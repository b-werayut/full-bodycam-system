const { fetchPlaybackUrl } = require("./dss.service");

async function getPlayback(req, res) {
  try {
    const { deviceCode, channelId, startTime, endTime } = req.body;

    if (!deviceCode || !channelId || !startTime || !endTime) {
      console.log("No device code, channel id, start time or end time provided");
      return res.status(400).json({ error: "No device code, channel id, start time or end time provided" });
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
