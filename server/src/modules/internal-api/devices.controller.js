const { prisma } = require("../../lib/prisma");
const { locationScope } = require("../../utils/locationScope");

function decimalToNumber(value) {
  return value?.toNumber?.() ?? value;
}

const deviceLocationInclude = {
  Location: {
    select: {
      LocationId: true,
      LocationCode: true,
      Latitude: true,
      Longitude: true,
      LocationName: true,
      CreatedAt: true,
    },
  },
};

function mapLegacyLocation(location) {
  if (!location) {
    return null;
  }

  return {
    LocationId: location.LocationId,
    LocationCode: location.LocationCode,
    Latitude: decimalToNumber(location.Latitude),
    Longitude: decimalToNumber(location.Longitude),
    LocationName: location.LocationName,
    RecordedAt: location.CreatedAt,
  };
}

exports.getOnlineDevices = async (req, res) => {
  try {
    const devices = await prisma.devices.findMany({
      where: {
        Active: true,
        // กรองเฉพาะ device ใน location ของ user (admin เห็นทุก location)
        ...locationScope(req.user),
      },
      include: deviceLocationInclude,
    });

    const result = devices.map((d) => {
      const loc = d.Location;

      return {
        deviceCode: d.DeviceCode,
        deviceName: d.DeviceName,
        status: d.Status,

        locationId: loc?.LocationId ?? null,
        locationCode: loc?.LocationCode ?? null,
        latitude: decimalToNumber(loc?.Latitude) ?? null,
        longitude: decimalToNumber(loc?.Longitude) ?? null,
        locationName: loc?.LocationName ?? null,
        recordedAt: loc?.CreatedAt ?? null,
      };
    });
    return res.status(200).json(result);
  } catch (error) {
    console.error("getOnlineDevices error:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

exports.getAllDevices = async (req, res) => {
  try {
    const devices = await prisma.devices.findMany({
      // กรองเฉพาะ device ใน location ของ user (admin เห็นทุก location)
      where: locationScope(req.user),
      include: deviceLocationInclude,
    });

    const result = devices.map(({ Location, ...device }) => {
      const legacyLocation = mapLegacyLocation(Location);

      return {
        ...device,
        Locations: legacyLocation ? [legacyLocation] : [],
      };
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching all devices:", error);
    return res.status(500).json({ error: "Failed to fetch devices" });
  }
};
