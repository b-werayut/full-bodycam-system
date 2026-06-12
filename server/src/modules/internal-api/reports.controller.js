const { prisma } = require("../../lib/prisma");

function decimalToNumber(value) {
  return value?.toNumber?.() ?? value;
}

const reportLocationSelect = {
  LocationId: true,
  LocationCode: true,
  LocationName: true,
  Latitude: true,
  Longitude: true,
};

async function getLocationByCodeMap(locationCodes) {
  const uniqueLocationCodes = [...new Set(locationCodes.filter(Boolean))];

  if (uniqueLocationCodes.length === 0) {
    return new Map();
  }

  try {
    const locations = await prisma.location.findMany({
      where: {
        LocationCode: {
          in: uniqueLocationCodes,
        },
      },
      select: reportLocationSelect,
    });

    return new Map(locations.map((location) => [location.LocationCode, location]));
  } catch (error) {
    console.warn("report location lookup failed:", {
      code: error?.code,
      message: error?.message,
    });
    return new Map();
  }
}

exports.getReport = async (req, res) => {
  try {
    const reports = await prisma.missions.findMany({
      orderBy: [
        {
          CreatedAt: "desc",
        },
        {
          MissionId: "desc",
        },
      ],
      select: {
        ReportId: true,
        MissionId: true,
        MissionName: true,
        StartTime: true,
        EndTime: true,
        Description: true,
        OfficerId: true,
        LocationCode: true,
        DeviceCode: true,
        MissionStatus: true,
        Priority: true,
        Duration: true,
        Note: true,
        Latitude: true,
        Longitude: true,

        Officers: true,

        Devices: {
          select: {
            DeviceName: true,
            DeviceType: true,
            SerialNo: true,
            Active: true,
          },
        },
      },
    });

    const locationByCode = await getLocationByCodeMap(reports.map((report) => report.LocationCode));

    const result = reports.map((r) => {
      const location = r.Location ?? locationByCode.get(r.LocationCode);
      const latitude = r.Latitude ?? location?.Latitude;
      const longitude = r.Longitude ?? location?.Longitude;

      return {
        reportId: r.ReportId,
        missionId: r.MissionId,
        missionName: r.MissionName,
        startTime: r.StartTime,
        endTime: r.EndTime,
        latitude: decimalToNumber(latitude),
        longitude: decimalToNumber(longitude),
        missionStatus: r.MissionStatus,
        description: r.Description ?? undefined,
        officerId: r.OfficerId,
        officerName: r.Officers?.OfficerName ?? undefined,
        locationId: location?.LocationId ?? undefined,
        locationCode: r.LocationCode ?? location?.LocationCode ?? undefined,

        deviceCode: r.DeviceCode ?? undefined,
        priority: r.Priority ?? undefined,
        duration: r.Duration ?? undefined,
        note: r.Note ?? undefined,
        locationName: location?.LocationName ?? undefined,
        deviceName: r.Devices?.DeviceName ?? undefined,
        deviceType: r.Devices?.DeviceType ?? undefined,
        serialNo: r.Devices?.SerialNo ?? undefined,
        active: r.Devices?.Active ?? undefined,
      };
    });

    return res.status(200).json(result);
  } catch (err) {
    console.error("report error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getLocation = async (req, res) => {
  try {
    const locations = await prisma.location.findMany({
      select: {
        LocationId: true,
        LocationCode: true,
        Latitude: true,
        Longitude: true,
        LocationName: true,
        CreatedAt: true,
        Devices: {
          select: {
            DeviceCode: true,
            DeviceName: true,
            DeviceType: true,
            SerialNo: true,
            Active: true,
          },
          orderBy: {
            DeviceCode: "asc",
          },
        },
      },
    });

    const result = locations.map((r) => {
      const devices = Array.isArray(r.Devices) ? r.Devices : r.Devices ? [r.Devices] : [];

      return {
        locationId: r.LocationId,
        locationCode: r.LocationCode,
        latitude: r.Latitude?.toNumber?.() ?? r.Latitude,
        longitude: r.Longitude?.toNumber?.() ?? r.Longitude,
        locationName: r.LocationName,
        recordedAt: r.CreatedAt,
        devices: devices.map((device) => ({
          deviceCode: device.DeviceCode,
          deviceName: device.DeviceName ?? null,
          deviceType: device.DeviceType ?? null,
          active: device.Active ?? null,
          serialNo: device.SerialNo ?? null,
        })),
      };
    });

    return res.status(200).json(result);
  } catch (err) {
    console.error("location error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

exports.getOfficerData = async (req, res) => {
  try {
    const officer = await prisma.officers.findMany({
      select: {
        OfficerId: true,
        OfficerName: true,
        CreatedAt: true,
      },
    });

    const result = officer.map((r) => ({
      officerId: r.OfficerId,
      officerName: r.OfficerName,
      createdAt: r.CreatedAt,
    }));

    return res.status(200).json(result);
  } catch (error) {
    console.error("getOnlineDevices error:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};
