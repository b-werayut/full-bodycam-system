const { config } = require("../../config");

async function dssLogin() {
  try {
    const resToken = await fetch(config.dss.loginApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: config.dss.username,
        password: config.dss.password,
      }),
    });

    if (!resToken) {
      console.log("No Token Response");
      return undefined;
    }

    const dataToken = await resToken.json();
    return dataToken.access_token;
  } catch (err) {
    console.error("Error:", err.message);
    return [];
  }
}

function getRecordingSearchUrl() {
  if (config.dss.recordingSearchApiUrl) {
    return config.dss.recordingSearchApiUrl;
  }

  if (!config.dss.playbackApiUrl) {
    return null;
  }

  return new URL("/api/v1/recording/search", config.dss.playbackApiUrl).toString();
}

module.exports = {
  dssLogin,
  getRecordingSearchUrl,
};
