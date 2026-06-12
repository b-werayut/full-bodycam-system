const { fetchStreamUrl } = require("./dss.service");

async function getStream(req, res) {
  try {
    const { deviceCode, channelId } = req.body;

    if (!deviceCode || !channelId) {
      console.log("No device code provided");
      return res.status(400).json({ error: "No device code provided" });
    }

    const result = await fetchStreamUrl(deviceCode, channelId);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Failed to fetch camera stream:", error);
    return res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getStream,
};
