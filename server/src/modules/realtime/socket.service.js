const { prisma } = require("../../lib/prisma");

const missionSelect = {
  MissionId: true,
  ReportId: true,
  MissionName: true,
  MissionStatus: true,
  DeviceCode: true,
  LocationCode: true,
  Latitude: true,
  Longitude: true,
  StartTime: true,
  EndTime: true,
};

const missionLocationSelect = {
  LocationName: true,
  Latitude: true,
  Longitude: true,
};

const decimalToNumber = (value) => value?.toNumber?.() ?? value;

const getEventLogDeviceInfo = (log) => {
  const details = log.Details || "";
  const match = details.match(/อุปกรณ์\s+(.+?)\s+\(([^)]+)\)/);

  return {
    deviceName: log.Devices?.DeviceName || match?.[1] || "",
    deviceCode: log.DeviceCode || log.Devices?.DeviceCode || match?.[2] || "",
  };
};

const getReportIdFromDetails = (details = "") => {
  const match = details.match(/ReportId:\s*([^|\s]+)/i);
  const reportId = match?.[1]?.trim();

  return reportId && reportId !== "-" ? reportId : null;
};

const mapRelatedMission = (mission) => {
  if (!mission) return null;

  const latitude = mission.Latitude ?? mission.Location?.Latitude;
  const longitude = mission.Longitude ?? mission.Location?.Longitude;

  return {
    missionId: mission.MissionId,
    reportId: mission.ReportId,
    missionName: mission.MissionName,
    missionStatus: mission.MissionStatus,
    deviceCode: mission.DeviceCode,
    locationCode: mission.LocationCode,
    locationName: mission.Location?.LocationName,
    latitude: decimalToNumber(latitude),
    longitude: decimalToNumber(longitude),
    startTime: mission.StartTime,
    endTime: mission.EndTime,
  };
};

const attachMissionLocation = async (mission) => {
  if (!mission || mission.Location || !mission.LocationCode) {
    return mission;
  }

  try {
    const location = await prisma.location.findUnique({
      where: {
        LocationCode: mission.LocationCode,
      },
      select: missionLocationSelect,
    });

    return location ? { ...mission, Location: location } : mission;
  } catch (error) {
    console.warn("mission location lookup failed:", {
      code: error?.code,
      message: error?.message,
    });
    return mission;
  }
};

const mapRelatedMissionWithLocation = async (mission) => mapRelatedMission(await attachMissionLocation(mission));

const findRelatedMissionForEventLog = async ({ details, deviceCode, eventTime }) => {
  const reportId = getReportIdFromDetails(details);

  if (reportId) {
    const missionByReport = await prisma.missions.findFirst({
      where: {
        ReportId: reportId,
      },
      select: missionSelect,
    });

    if (missionByReport) {
      return mapRelatedMissionWithLocation(missionByReport);
    }
  }

  if (!deviceCode) {
    return null;
  }

  const timeWindow = eventTime
    ? {
        AND: [
          {
            OR: [{ StartTime: null }, { StartTime: { lte: eventTime } }],
          },
          {
            OR: [{ EndTime: null }, { EndTime: { gte: eventTime } }],
          },
        ],
      }
    : {
        MissionStatus: {
          in: ["2", "6"],
        },
      };

  const missionByDevice = await prisma.missions.findFirst({
    where: {
      DeviceCode: deviceCode,
      ...timeWindow,
    },
    orderBy: [
      {
        CreatedAt: "desc",
      },
      {
        MissionId: "desc",
      },
    ],
    select: missionSelect,
  });

  return mapRelatedMissionWithLocation(missionByDevice);
};

const mapEventLogNotification = async (log) => {
  const details = log.Details || "";
  const deviceInfo = getEventLogDeviceInfo(log);
  const mission =
    (await mapRelatedMissionWithLocation(log.Missions)) ||
    (await findRelatedMissionForEventLog({
      details,
      deviceCode: deviceInfo.deviceCode,
      eventTime: log.EventTime,
    }));

  return {
    id: log.LogId,
    typeKey: log.TypeKey,
    officer: log.OfficerName,
    time: log.EventTime
      ? new Date(log.EventTime).toLocaleTimeString("th-TH", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : null,
    date: log.EventTime ? new Date(log.EventTime).toISOString().split("T")[0] : null,
    severity: log.Severity,
    location: log.LocationName || "",
    // LocationCode สำหรับให้ socket handler กรอง notification ตาม location ของ client
    locationCode: log.LocationCode ?? null,
    details,
    isRead: log.IsRead,
    deviceName: deviceInfo.deviceName,
    deviceCode: deviceInfo.deviceCode,
    mission,
  };
};

const getDevicesWithStatus = async () => {
  try {
    const devices = await prisma.devices.findMany({
      where: {
        Active: true,
      },
      include: {
        Location: true,
      },
      orderBy: {
        RegisteredAt: "desc",
      },
    });

    const devicesWithGps = devices.map((d) => {
      const loc = d.Location || null;

      return {
        deviceCode: d.DeviceCode,
        deviceName: d.DeviceName,
        status: d.Status,
        locationId: loc?.LocationId || null,
        locationCode: loc?.LocationCode || null,
        latitude: loc?.Latitude ? Number(loc.Latitude) : null,
        longitude: loc?.Longitude ? Number(loc.Longitude) : null,
        locationName: loc?.LocationName || null,
        createdAt: loc?.CreatedAt || null,
      };
    });

    return devicesWithGps;
  } catch (err) {
    console.error("Error fetching devices with status:", err);
    return [];
  }
};

const getLatestEventLogId = async () => {
  try {
    const latestLog = await prisma.eventLog.findFirst({
      orderBy: {
        LogId: "desc",
      },
      select: {
        LogId: true,
      },
    });

    return latestLog?.LogId || 0;
  } catch (err) {
    console.error("Error fetching latest event log id:", err);
    return 0;
  }
};

const getNewEventLogNotifications = async (lastLogId = 0) => {
  try {
    const eventLogs = await prisma.eventLog.findMany({
      where: {
        LogId: {
          gt: lastLogId,
        },
      },
      orderBy: {
        LogId: "asc",
      },
      include: {
        Devices: {
          select: {
            DeviceCode: true,
            DeviceName: true,
          },
        },
        Missions: {
          select: missionSelect,
        },
      },
    });

    return Promise.all(eventLogs.map(mapEventLogNotification));
  } catch (err) {
    console.error("Error fetching new event log notifications:", err);
    return [];
  }
};

module.exports = {
  getDevicesWithStatus,
  getLatestEventLogId,
  getNewEventLogNotifications,
};
