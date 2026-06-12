const { config } = require("../../config");
const { dssLogin } = require("../dss");
const { formatTimestampToDatetime } = require("./video.cache");

const HLS_HOST_REPLACEMENT = "www.centrecities.com:3007->10.15.15.31:3007";

async function fetchFreshHlsUrl(playbackParams) {
  const { deviceCode, channelId, startTime, endTime } = playbackParams;

  const token = await dssLogin();
  if (!token) {
    console.log("Token is require");
    throw new Error("Unable to authenticate with DSS");
  }

  const startTimeStr = formatTimestampToDatetime(startTime);
  const endTimeStr = formatTimestampToDatetime(endTime);

  console.log(`[VideoConverter] Fetching HLS URL from: ${config.dss.playbackApiUrl}`);
  console.log(`[VideoConverter] Params: deviceCode=${deviceCode}, startTime=${startTimeStr}, endTime=${endTimeStr}`);

  const response = await fetch(config.dss.playbackApiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      deviceCode,
      channelId,
      startTime: startTimeStr,
      endTime: endTimeStr,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    console.error(`[VideoConverter] Playback API error: ${response.status} - ${errorText}`);
    throw new Error(`Playback API returned ${response.status}`);
  }

  const data = await response.json();
  console.log("[VideoConverter] Playback API response:", JSON.stringify(data).substring(0, 200));

  let videoUrl = null;
  if (data.code === 1000 && data.data?.video_url) {
    videoUrl = data.data.video_url;
  } else if (data.url) {
    videoUrl = data.url;
  }

  if (!videoUrl) {
    throw new Error(data.message || "No video URL in playback response");
  }

  if (HLS_HOST_REPLACEMENT) {
    const [from, to] = HLS_HOST_REPLACEMENT.split("->");
    if (from && to && videoUrl.includes(from)) {
      const originalUrl = videoUrl;
      videoUrl = videoUrl.replace(from, to);
      console.log(`[VideoConverter] Replaced HLS URL: ${originalUrl} -> ${videoUrl}`);
    }
  }

  return videoUrl;
}

module.exports = {
  fetchFreshHlsUrl,
};
