const { config } = require("../../config");

/**
 * Login to DSS and get access token
 */
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
    console.error("DSS Login Error:", err.message);
    return undefined;
  }
}

/**
 * Get recording search API URL
 */
function getRecordingSearchUrl() {
  if (config.dss.recordingSearchApiUrl) {
    return config.dss.recordingSearchApiUrl;
  }

  if (!config.dss.playbackApiUrl) {
    return null;
  }

  return new URL("/api/v1/recording/search", config.dss.playbackApiUrl).toString();
}

/**
 * Get location API URL
 */
function getLocationApiUrl() {
  if (config.dss.locationApiUrl) {
    return config.dss.locationApiUrl;
  }

  const baseUrl =
    config.dss.loginApiUrl ||
    config.dss.streamApiUrl ||
    config.dss.playbackApiUrl ||
    config.dss.recordingSearchApiUrl;

  if (!baseUrl) {
    return null;
  }

  return new URL("/api/v1/location", baseUrl).toString();
}

function unwrapLocationRecords(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (typeof payload !== "object") return [];

  const collectionKeys = ["data", "locations", "location", "items", "rows", "list", "result", "results"];
  for (const key of collectionKeys) {
    const nested = unwrapLocationRecords(payload[key]);
    if (nested.length > 0) {
      return nested;
    }
  }

  return [payload];
}

function pickValue(record, keys) {
  for (const key of keys) {
    if (record?.[key] !== undefined && record?.[key] !== null && record?.[key] !== "") {
      return record[key];
    }
  }

  return undefined;
}

function toFiniteNumber(value) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function normalizeDssLocation(record) {
  const latitude = toFiniteNumber(pickValue(record, ["Latitude", "latitude", "lat", "Lat", "gpsY", "y", "Y"]));
  const longitude = toFiniteNumber(
    pickValue(record, ["Longitude", "longitude", "lng", "lon", "long", "Lon", "Lng", "gpsX", "x", "X"]),
  );

  if (latitude === null || longitude === null) {
    return null;
  }

  const deviceCode = pickValue(record, [
    "DeviceCode",
    "deviceCode",
    "device_code",
    "DeviceId",
    "deviceId",
    "device_id",
    "code",
  ]);

  const locationCode = pickValue(record, ["LocationCode", "locationCode", "location_code"]);
  const locationName = pickValue(record, ["LocationName", "locationName", "location_name", "orgName", "name"]);

  return {
    ...(deviceCode && { DeviceCode: String(deviceCode) }),
    ...(locationCode && { LocationCode: locationCode }),
    ...(locationName && { LocationName: locationName }),
    Latitude: latitude,
    Longitude: longitude,
  };
}

function findDssLocationForDevice(payload, deviceCode) {
  const locations = unwrapLocationRecords(payload)
    .map(normalizeDssLocation)
    .filter(Boolean);

  if (locations.length === 0) {
    return null;
  }

  return locations.find((location) => location.DeviceCode === deviceCode) || (locations.length === 1 ? locations[0] : null);
}

/**
 * Fetch latest device location from DSS
 */
async function fetchDeviceLocationFromDss(deviceCode) {
  const locationApiUrl = getLocationApiUrl();
  if (!locationApiUrl) {
    throw new Error("Location API URL is not configured");
  }

  const token = await dssLogin();
  if (!token) {
    throw new Error("Unable to authenticate with DSS");
  }

  const response = await fetch(locationApiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ deviceCode }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(data?.desc || `Failed to fetch DSS location: ${response.status}`);
    error.statusCode = response.status;
    error.data = data;
    throw error;
  }

  return findDssLocationForDevice(data, deviceCode);
}

/**
 * Fetch live stream URL from DSS
 */
async function fetchStreamUrl(deviceCode, channelId) {
  const token = await dssLogin();
  if (!token) {
    throw new Error("Unable to authenticate with DSS");
  }

  const response = await fetch(`${config.dss.streamApiUrl}?_t=${Date.now()}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json;charset=UTF-8",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      User: "true",
      deviceCode,
      channelId: channelId || `${deviceCode}$1$0$0`,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP Error: ${response.status}`);
  }

  return response.json();
}

/**
 * Fetch playback URL from DSS
 */
async function fetchPlaybackUrl(deviceCode, channelId, startTime, endTime) {
  const token = await dssLogin();
  if (!token) {
    throw new Error("Unable to authenticate with DSS");
  }

  const response = await fetch(config.dss.playbackApiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      deviceCode,
      channelId,
      startTime,
      endTime,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to fetch playback");
  }

  return response.json();
}

/**
 * Search recordings from DSS
 */
async function searchRecordingsFromDss(channelId, daysBack = 3) {
  const searchUrl = getRecordingSearchUrl();
  if (!searchUrl) {
    throw new Error("Recording search API URL is not configured");
  }

  const token = await dssLogin();
  if (!token) {
    throw new Error("Unable to authenticate with DSS");
  }

  const response = await fetch(searchUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      channelId,
      daysBack,
    }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(data?.desc || "Failed to search recordings");
    error.statusCode = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

module.exports = {
  dssLogin,
  getLocationApiUrl,
  getRecordingSearchUrl,
  fetchDeviceLocationFromDss,
  fetchStreamUrl,
  fetchPlaybackUrl,
  searchRecordingsFromDss,
};
