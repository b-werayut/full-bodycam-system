const { searchRecordingsFromDss } = require("./dss.service");

async function searchRecordings(req, res) {
  try {
    const { channelId, daysBack = 3 } = req.body;

    if (!channelId) {
      return res.status(400).json({
        code: 400,
        desc: "channelId is required",
      });
    }

    const data = await searchRecordingsFromDss(channelId, daysBack);
    return res.json(data);
  } catch (error) {
    console.error("Recording search error:", error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json(error.data || {
      code: statusCode,
      desc: error.message,
    });
  }
}

module.exports = {
  searchRecordings,
};
