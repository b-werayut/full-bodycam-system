const { searchRecordingsFromDss } = require("./dss.service");
const { canAccessDevice, deviceCodeFromChannelId } = require("../../utils/deviceAccess");

async function searchRecordings(req, res) {
  try {
    const { channelId, daysBack = 3 } = req.body;

    if (!channelId) {
      return res.status(400).json({
        code: 400,
        desc: "channelId is required",
      });
    }

    // channelId รูปแบบ "<deviceCode>$..." -> เช็คสิทธิ์ตาม location ของ device (admin เข้าถึงทุก location)
    if (!(await canAccessDevice(req.user, deviceCodeFromChannelId(channelId)))) {
      return res.status(403).json({ code: 403, desc: "Access denied for this device" });
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
