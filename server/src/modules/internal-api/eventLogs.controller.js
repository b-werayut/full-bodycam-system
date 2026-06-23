const { prisma } = require("../../lib/prisma");
const { locationScope } = require("../../utils/locationScope");

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

// จับคู่ mission จาก device ในหน่วยความจำ (แทน findFirst per-row เดิม)
// missions ต้องเรียงมาแล้วแบบ CreatedAt desc, MissionId desc เพื่อให้ผลตรงกับ orderBy เดิม
const matchMissionByDeviceTime = (missions, eventTime) => {
  if (!Array.isArray(missions) || missions.length === 0) {
    return null;
  }

  if (eventTime) {
    return (
      missions.find(
        (mission) =>
          (mission.StartTime == null || mission.StartTime <= eventTime) &&
          (mission.EndTime == null || mission.EndTime >= eventTime),
      ) || null
    );
  }

  return (
    missions.find(
      (mission) => mission.MissionStatus === "2" || mission.MissionStatus === "6",
    ) || null
  );
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

const parseEventLogOffsetQuery = (value) => {
  if (!value) return 0;

  const rawValue = Array.isArray(value) ? value[0] : String(value);
  const parsed = Number.parseInt(rawValue, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return 0;
  }

  return parsed;
};

exports.getEventLogs = async (req, res) => {
  try {
    const { startDate, endDate, limit, offset } = req.query;
    const take = parseEventLogLimitQuery(limit);
    const skip = parseEventLogOffsetQuery(offset);

    // กรองเฉพาะ event log ใน location ของ user (admin เห็นทุก location)
    const where = { ...locationScope(req.user) };

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
      // LogId เป็น tiebreaker ให้ pagination แบบ skip เสถียร (EventTime ไม่ unique)
      orderBy: [{ EventTime: "desc" }, { LogId: "desc" }],
      ...(skip > 0 && { skip }),
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

    // เตรียม context ต่อ log: mission ที่ผูกตรง (จาก include) จะถูกใช้เลย
    // ส่วนที่ไม่ผูกตรงค่อยหาแบบ batch (กัน N+1) ด้วย reportId แล้วตามด้วย device+time
    const logContexts = eventLogs.map((log) => {
      const details = log.Details || "";
      const deviceInfo = getEventLogDeviceInfo(log);

      return {
        log,
        details,
        deviceInfo,
        reportId: log.Missions ? null : getReportIdFromDetails(details),
        mission: log.Missions || null,
      };
    });

    // 1) batch หา mission จาก reportId (ReportId เป็น unique)
    const reportIds = [
      ...new Set(
        logContexts
          .filter((ctx) => !ctx.mission && ctx.reportId)
          .map((ctx) => ctx.reportId),
      ),
    ];

    if (reportIds.length > 0) {
      try {
        const missionsByReport = await prisma.missions.findMany({
          where: { ReportId: { in: reportIds } },
          select: missionSelect,
        });
        const reportMissionMap = new Map(
          missionsByReport.map((mission) => [mission.ReportId, mission]),
        );

        logContexts.forEach((ctx) => {
          if (!ctx.mission && ctx.reportId && reportMissionMap.has(ctx.reportId)) {
            ctx.mission = reportMissionMap.get(ctx.reportId);
          }
        });
      } catch (error) {
        warnMissionLookupFailure(error);
      }
    }

    // 2) batch หา mission จาก device (สำหรับ log ที่ยังหาไม่เจอและมี deviceCode)
    const deviceCodes = [
      ...new Set(
        logContexts
          .filter((ctx) => !ctx.mission && ctx.deviceInfo.deviceCode)
          .map((ctx) => ctx.deviceInfo.deviceCode),
      ),
    ];

    if (deviceCodes.length > 0) {
      try {
        const missionsByDevice = await prisma.missions.findMany({
          where: { DeviceCode: { in: deviceCodes } },
          select: { ...missionSelect, CreatedAt: true },
        });

        const deviceMissionMap = new Map();
        missionsByDevice
          .sort((a, b) => {
            const aTime = a.CreatedAt ? new Date(a.CreatedAt).getTime() : 0;
            const bTime = b.CreatedAt ? new Date(b.CreatedAt).getTime() : 0;
            if (bTime !== aTime) return bTime - aTime;
            return b.MissionId - a.MissionId;
          })
          .forEach((mission) => {
            const list = deviceMissionMap.get(mission.DeviceCode) || [];
            list.push(mission);
            deviceMissionMap.set(mission.DeviceCode, list);
          });

        logContexts.forEach((ctx) => {
          if (!ctx.mission && ctx.deviceInfo.deviceCode) {
            ctx.mission = matchMissionByDeviceTime(
              deviceMissionMap.get(ctx.deviceInfo.deviceCode),
              ctx.log.EventTime,
            );
          }
        });
      } catch (error) {
        warnMissionLookupFailure(error);
      }
    }

    // 3) batch ดึง Location ให้ mission ที่ยังไม่มี Location ติดมา
    const locationCodes = [
      ...new Set(
        logContexts
          .map((ctx) => ctx.mission)
          .filter((mission) => mission && !mission.Location && mission.LocationCode)
          .map((mission) => mission.LocationCode),
      ),
    ];

    if (locationCodes.length > 0) {
      try {
        const locations = await prisma.location.findMany({
          where: { LocationCode: { in: locationCodes } },
          select: { LocationCode: true, ...missionLocationSelect },
        });
        const locationMap = new Map(
          locations.map((location) => [location.LocationCode, location]),
        );

        logContexts.forEach((ctx) => {
          const mission = ctx.mission;
          if (mission && !mission.Location && locationMap.has(mission.LocationCode)) {
            ctx.mission = { ...mission, Location: locationMap.get(mission.LocationCode) };
          }
        });
      } catch (error) {
        console.warn("event log location lookup failed:", {
          code: error?.code,
          message: error?.message,
        });
      }
    }

    const result = logContexts.map(({ log, details, deviceInfo, mission }) => ({
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
      mission: mapRelatedMission(mission),
    }));

    return res.status(200).json(result);
  } catch (error) {
    console.error("getEventLogs error:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

exports.getEventLogsCount = async (req, res) => {
  try {
    const count = await prisma.eventLog.count({
      where: locationScope(req.user),
    });

    return res.status(200).json({ count });
  } catch (error) {
    console.error("getEventLogsCount error:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

exports.getUnreadEventLogsCount = async (req, res) => {
  try {
    // IsRead: { not: true } ครอบคลุมทั้ง false และ null (ตรงกับ isRead !== true ฝั่ง client)
    const count = await prisma.eventLog.count({
      where: {
        IsRead: {
          not: true,
        },
        // กรองเฉพาะ location ของ user (admin เห็นทุก location)
        ...locationScope(req.user),
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

    // updateMany + locationScope: non-admin mark read ได้เฉพาะ log ใน location ตัวเอง
    // ไม่เจอหรืออยู่นอก location -> count 0 -> 404 (ไม่เผยว่ามี log นี้อยู่)
    const updated = await prisma.eventLog.updateMany({
      where: {
        LogId: logId,
        ...locationScope(req.user),
      },
      data: {
        IsRead: true,
      },
    });

    if (updated.count === 0) {
      return res.status(404).json({
        message: "Event log not found",
      });
    }

    return res.status(200).json({
      message: "Mark event log read success",
      data: {
        id: logId,
        isRead: true,
      },
    });
  } catch (error) {
    console.error("markEventLogRead error:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};
