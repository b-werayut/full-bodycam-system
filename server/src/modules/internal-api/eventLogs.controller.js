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
    console.warn("event log mission location lookup failed:", {
      code: error?.code,
      message: error?.message,
    });
    return mission;
  }
};

const mapRelatedMissionWithLocation = async (mission) => mapRelatedMission(await attachMissionLocation(mission));

const getEventLogDeviceInfo = (log) => {
  const details = log.Details || "";
  const deviceMatch = details.match(/อุปกรณ์\s+(.+?)\s+\(([^)]+)\)/);

  return {
    deviceName: log.Devices?.DeviceName || deviceMatch?.[1] || "",
    deviceCode: log.DeviceCode || log.Devices?.DeviceCode || deviceMatch?.[2] || "",
  };
};

const warnMissionLookupFailure = (error) => {
  console.warn("event log mission lookup failed:", {
    code: error?.code,
    message: error?.message,
  });
};

const findRelatedMissionForEventLog = async ({ details, deviceCode, eventTime }) => {
  try {
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
  } catch (error) {
    warnMissionLookupFailure(error);
    return null;
  }
};

const parseEventLogDateQuery = (value, boundary = "start") => {
  if (!value) return null;

  const rawValue = Array.isArray(value) ? value[0] : String(value);
  const match = rawValue.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?)?$/,
  );

  if (!match) {
    const parsed = new Date(rawValue);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const [, year, month, day, hour, minute, second] = match;
  const hasTime = hour !== undefined;

  return new Date(
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      hasTime ? Number(hour) : boundary === "end" ? 23 : 0,
      hasTime ? Number(minute) : boundary === "end" ? 59 : 0,
      hasTime ? Number(second || 0) : boundary === "end" ? 59 : 0,
      boundary === "end" ? 999 : 0,
    ),
  );
};

const parseEventLogLimitQuery = (value) => {
  if (!value) return null;

  const rawValue = Array.isArray(value) ? value[0] : String(value);
  const parsed = Number.parseInt(rawValue, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return Math.min(parsed, 500);
};

exports.getEventLogs = async (req, res) => {
  try {
    const { startDate, endDate, limit } = req.query;
    const take = parseEventLogLimitQuery(limit);

    const where = {};

    if (startDate || endDate) {
      where.EventTime = {};
      if (startDate) {
        const parsedStartDate = parseEventLogDateQuery(startDate, "start");
        if (parsedStartDate) {
          where.EventTime.gte = parsedStartDate;
        }
      }
      if (endDate) {
        const parsedEndDate = parseEventLogDateQuery(endDate, "end");
        if (parsedEndDate) {
          where.EventTime.lte = parsedEndDate;
        }
      }
      if (Object.keys(where.EventTime).length === 0) {
        delete where.EventTime;
      }
    }

    const eventLogs = await prisma.eventLog.findMany({
      where,
      orderBy: {
        EventTime: "desc",
      },
      ...(take && { take }),
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

    const result = [];
    for (const log of eventLogs) {
      const details = log.Details || "";
      const deviceInfo = getEventLogDeviceInfo(log);
      const relatedMission =
        (await mapRelatedMissionWithLocation(log.Missions)) ||
        (await findRelatedMissionForEventLog({
          details,
          deviceCode: deviceInfo.deviceCode,
          eventTime: log.EventTime,
        }));

      result.push({
        id: log.LogId,
        typeKey: log.TypeKey,
        officer: log.OfficerName,
        time: log.EventTime
          ? new Date(log.EventTime).toLocaleTimeString("th-TH", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : null,
        date: log.EventTime
          ? new Date(log.EventTime).toISOString().split("T")[0]
          : null,
        severity: log.Severity,
        location: log.LocationName || "",
        details,
        isRead: log.IsRead,
        deviceName: deviceInfo.deviceName,
        deviceCode: deviceInfo.deviceCode,
        mission: relatedMission,
      });
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("getEventLogs error:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

exports.getUnreadEventLogsCount = async (_req, res) => {
  try {
    // IsRead: { not: true } ครอบคลุมทั้ง false และ null (ตรงกับ isRead !== true ฝั่ง client)
    const count = await prisma.eventLog.count({
      where: {
        IsRead: {
          not: true,
        },
      },
    });

    return res.status(200).json({ count });
  } catch (error) {
    console.error("getUnreadEventLogsCount error:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

exports.markEventLogRead = async (req, res) => {
  try {
    const logId = parseInt(req.params.id, 10);

    if (!logId) {
      return res.status(400).json({
        message: "Event log id is required",
      });
    }

    const eventLog = await prisma.eventLog.update({
      where: {
        LogId: logId,
      },
      data: {
        IsRead: true,
      },
    });

    return res.status(200).json({
      message: "Mark event log read success",
      data: {
        id: eventLog.LogId,
        isRead: eventLog.IsRead,
      },
    });
  } catch (error) {
    console.error("markEventLogRead error:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};
