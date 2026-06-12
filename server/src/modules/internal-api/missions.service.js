const { prisma } = require("../../lib/prisma");

const MISSION_STATUS = {
  PENDING: "1",
  IN_PROGRESS: "2",
  COMPLETED: "3",
  CANCELLED: "4",
  EMERGENCY: "5",
  EMERGENCY_IN_PROGRESS: "6",
  EMERGENCY_COMPLETED: "7",
  EMERGENCY_CANCELLED: "8",
};

const MISSION_STATUS_ALIASES = {
  PENDING: MISSION_STATUS.PENDING,
  WAITING: MISSION_STATUS.PENDING,
  IN_PROGRESS: MISSION_STATUS.IN_PROGRESS,
  ACCEPTED: MISSION_STATUS.IN_PROGRESS,
  COMPLETED: MISSION_STATUS.COMPLETED,
  CANCELLED: MISSION_STATUS.CANCELLED,
  CANCELED: MISSION_STATUS.CANCELLED,
  EMERGENCY: MISSION_STATUS.EMERGENCY,
  EMERGENCY_IN_PROGRESS: MISSION_STATUS.EMERGENCY_IN_PROGRESS,
  EMERGENCY_COMPLETED: MISSION_STATUS.EMERGENCY_COMPLETED,
  EMERGENCY_CANCELLED: MISSION_STATUS.EMERGENCY_CANCELLED,
  EMERGENCY_CANCELED: MISSION_STATUS.EMERGENCY_CANCELLED,
};

function result(statusCode, body) {
  return { statusCode, body };
}

function requireField(payload, fieldName) {
  if (!payload?.[fieldName]) {
    return result(400, { message: `${fieldName} is required` });
  }

  return null;
}

function requireDeviceReference(payload) {
  if (!payload?.deviceCode && !payload?.deviceName) {
    return result(400, { message: "deviceCode or deviceName is required" });
  }

  return null;
}

function normalizeMissionStatus(status, fallback = MISSION_STATUS.PENDING) {
  if (status === undefined || status === null || status === "") {
    return fallback;
  }

  const rawStatus = String(status).trim();
  if (Object.values(MISSION_STATUS).includes(rawStatus)) {
    return rawStatus;
  }

  const aliasKey = rawStatus.toUpperCase().replace(/-/g, "_");
  return MISSION_STATUS_ALIASES[aliasKey] || fallback;
}

function hasPayloadField(payload, fieldName) {
  return Object.prototype.hasOwnProperty.call(payload || {}, fieldName);
}

async function resolveLocationReference(payload) {
  if (hasPayloadField(payload, "locationCode")) {
    if (payload.locationCode === null || payload.locationCode === "") {
      return { location: null };
    }

    const locationCode = String(payload.locationCode).trim();
    const location = await prisma.location.findUnique({
      where: { LocationCode: locationCode },
      select: {
        LocationCode: true,
        Latitude: true,
        Longitude: true,
      },
    });

    if (!location) {
      return { error: result(404, { message: "Location not found" }) };
    }

    return { location };
  }

  if (payload?.deviceCode) {
    const device = await prisma.devices.findUnique({
      where: { DeviceCode: payload.deviceCode },
      select: {
        Location: {
          select: {
            LocationCode: true,
            Latitude: true,
            Longitude: true,
          },
        },
      },
    });

    return { location: device?.Location ?? null };
  }

  if (!hasPayloadField(payload, "locationId")) {
    return { location: null };
  }

  if (payload.locationId === null || payload.locationId === "") {
    return { location: null };
  }

  const locationId = Number(payload.locationId);
  if (!Number.isInteger(locationId)) {
    return { error: result(400, { message: "locationId must be a number" }) };
  }

  const location = await prisma.location.findUnique({
    where: { LocationId: locationId },
    select: {
      LocationCode: true,
      Latitude: true,
      Longitude: true,
    },
  });

  if (!location) {
    return { error: result(404, { message: "Location not found" }) };
  }

  return { location };
}

function getMissionLocationCode(payload, location) {
  if (hasPayloadField(payload, "locationCode")) {
    return payload.locationCode === null || payload.locationCode === ""
      ? null
      : String(payload.locationCode).trim();
  }

  if (payload?.deviceCode) {
    return location?.LocationCode ?? null;
  }

  if (hasPayloadField(payload, "locationId")) {
    return location?.LocationCode ?? null;
  }

  return undefined;
}

function getMissionLatitude(payload, location) {
  return hasPayloadField(payload, "latitude") ? payload.latitude : location?.Latitude;
}

function getMissionLongitude(payload, location) {
  return hasPayloadField(payload, "longitude") ? payload.longitude : location?.Longitude;
}

function missionCreateData(payload, location = null) {
  return {
    ReportId: payload.reportId,
    MissionName: payload.missionName,
    StartTime: payload.startTime ? new Date(payload.startTime) : null,
    EndTime: payload.endTime ? new Date(payload.endTime) : null,
    Description: payload.description,
    OfficerId: payload.officerId,
    LocationCode: getMissionLocationCode(payload, location),
    DeviceCode: payload.deviceCode,
    MissionStatus: normalizeMissionStatus(payload.missionStatus),
    Duration: payload.duration,
    Latitude: getMissionLatitude(payload, location),
    Longitude: getMissionLongitude(payload, location),
    Note: payload.note,
    Priority: payload.priority,
  };
}

function missionUpdateData(payload, location = null) {
  const {
    missionName,
    startTime,
    endTime,
    description,
    officerId,
    deviceCode,
    missionStatus,
    priority,
    duration,
    note,
  } = payload;
  const resolvedLocationCode = getMissionLocationCode(payload, location);
  const resolvedLatitude = getMissionLatitude(payload, location);
  const resolvedLongitude = getMissionLongitude(payload, location);

  return {
    ...(missionName !== undefined && { MissionName: missionName }),
    ...(startTime !== undefined && {
      StartTime: startTime ? new Date(startTime) : null,
    }),
    ...(endTime !== undefined && {
      EndTime: endTime ? new Date(endTime) : null,
    }),
    ...(description !== undefined && { Description: description }),
    ...(officerId !== undefined && { OfficerId: officerId }),
    ...(resolvedLocationCode !== undefined && { LocationCode: resolvedLocationCode }),
    ...(deviceCode !== undefined && { DeviceCode: deviceCode }),
    ...(missionStatus !== undefined && {
      MissionStatus: normalizeMissionStatus(missionStatus),
    }),
    ...(priority !== undefined && { Priority: priority }),
    ...(duration !== undefined && { Duration: duration }),
    ...(resolvedLatitude !== undefined && { Latitude: resolvedLatitude }),
    ...(resolvedLongitude !== undefined && { Longitude: resolvedLongitude }),
    ...(note !== undefined && { Note: note }),
  };
}

async function findDeviceByReference(payload) {
  const deviceCode = payload?.deviceCode || null;
  const deviceName = payload?.deviceName || null;

  return prisma.devices.findFirst({
    where: deviceCode ? { DeviceCode: deviceCode } : { DeviceName: deviceName },
    select: {
      DeviceCode: true,
      DeviceName: true,
      Active: true,
    },
  });
}

async function findMissionStatus(reportId) {
  return prisma.missions.findFirst({
    where: { ReportId: reportId },
    select: {
      MissionId: true,
      ReportId: true,
      MissionStatus: true,
      DeviceCode: true,
      StartTime: true,
      EndTime: true,
      OfficerId: true,
    },
  });
}

function ensureMissionDeviceMatches(mission, device) {
  if (mission?.DeviceCode && device?.DeviceCode && mission.DeviceCode !== device.DeviceCode) {
    return result(400, { message: "Device does not match mission" });
  }

  return null;
}

async function findOverlappingMission(payload, excludeReportId = null) {
  // ต้องมีเวลาเริ่มเป็นจุดอ้างอิงเสมอ ส่วนเวลาสิ้นสุดเว้นว่างได้ (งานปลายเปิดที่ยังไม่รู้เวลาจบ)
  if (!payload?.startTime) {
    return null;
  }

  const startTime = new Date(payload.startTime);
  if (Number.isNaN(startTime.getTime())) {
    return null;
  }

  // ไม่มี endTime = งานปลายเปิด ถือว่าจองเวลาตั้งแต่ startTime ไปจนถึงอนันต์
  const hasEndTime = Boolean(payload.endTime);
  const endTime = hasEndTime ? new Date(payload.endTime) : null;
  if (endTime && Number.isNaN(endTime.getTime())) {
    return null;
  }

  const hasDeviceScope = Boolean(payload.deviceCode);
  const hasOfficerScope = payload.officerId !== undefined && payload.officerId !== null;

  const scopeConditions = [];
  if (hasDeviceScope) {
    scopeConditions.push({ DeviceCode: payload.deviceCode });
  }
  if (hasOfficerScope) {
    scopeConditions.push({ OfficerId: payload.officerId });
  }

  if (scopeConditions.length === 0) {
    return null;
  }

  const mission = await prisma.missions.findFirst({
    where: {
      ...(excludeReportId ? { ReportId: { not: excludeReportId } } : {}),
      MissionStatus: {
        notIn: [
          MISSION_STATUS.CANCELLED,
          MISSION_STATUS.EMERGENCY_CANCELLED,
          MISSION_STATUS.COMPLETED,
          MISSION_STATUS.EMERGENCY_COMPLETED,
        ],
      },
      OR: scopeConditions,
      // ใบงานเดิมจบหลังเวลาเริ่มของใบใหม่ — ใบงานปลายเปิด (EndTime = null) จะไม่ถูกนำมาเช็ค
      EndTime: { gt: startTime },
      // ใบงานเดิมเริ่มก่อนเวลาสิ้นสุดของใบใหม่ — ข้ามเงื่อนไขนี้ถ้าใบใหม่เป็นงานปลายเปิด
      ...(endTime ? { StartTime: { lt: endTime } } : {}),
    },
    include: {
      Devices: { select: { DeviceName: true } },
    },
  });

  if (!mission) {
    return null;
  }

  // ตรวจแยกว่าใบงานที่ชนเวลานี้ ชนเพราะ "อุปกรณ์เดียวกัน" หรือ "เจ้าหน้าที่คนเดียวกัน"
  // อุปกรณ์คนละตัวและเจ้าหน้าที่คนละคนจะไม่ถูกจับว่าชน (สร้างใบงานได้ตามปกติ)
  const conflictsOnDevice = hasDeviceScope && mission.DeviceCode === payload.deviceCode;
  const conflictsOnOfficer = hasOfficerScope && mission.OfficerId === payload.officerId;

  let location = null;
  if (mission.LocationCode) {
    location = await prisma.location.findUnique({
      where: { LocationCode: mission.LocationCode },
      select: { LocationName: true },
    });
  }

  return {
    mission: { ...mission, Location: location },
    conflictsOnDevice,
    conflictsOnOfficer,
  };
}

function overlapConflictMessage({ conflictsOnDevice, conflictsOnOfficer }) {
  if (conflictsOnDevice && conflictsOnOfficer) {
    return "Mission time overlaps for the same device and officer";
  }
  if (conflictsOnDevice) {
    return "Mission time overlaps for the same device";
  }
  if (conflictsOnOfficer) {
    return "Mission time overlaps for the same officer";
  }
  return "Mission time overlaps with an existing mission";
}

function overlappingMissionConflict({ mission, conflictsOnDevice, conflictsOnOfficer }) {
  return {
    reportId: mission.ReportId,
    startTime: mission.StartTime,
    endTime: mission.EndTime,
    deviceCode: mission.DeviceCode,
    deviceName: mission.Devices?.DeviceName ?? null,
    officerId: mission.OfficerId,
    locationCode: mission.LocationCode,
    locationName: mission.Location?.LocationName ?? null,
    conflictOn: conflictsOnDevice && conflictsOnOfficer ? "both" : conflictsOnDevice ? "device" : "officer",
  };
}

async function createMission(payload) {
  const required = requireField(payload, "reportId");
  if (required) {
    return required;
  }

  const overlappingMission = await findOverlappingMission(payload);
  if (overlappingMission) {
    return result(409, {
      message: overlapConflictMessage(overlappingMission),
      data: overlappingMissionConflict(overlappingMission),
    });
  }

  const locationReference = await resolveLocationReference(payload);
  if (locationReference.error) {
    return locationReference.error;
  }

  const mission = await prisma.missions.create({
    data: missionCreateData(payload, locationReference.location),
  });

  return result(201, {
    message: "Create mission success",
    data: mission,
  });
}

async function updateMission(payload) {
  const required = requireField(payload, "reportId");
  if (required) {
    return required;
  }

  const mission = await prisma.missions.findFirst({
    where: { ReportId: payload.reportId },
  });

  if (!mission) {
    return result(404, { message: "Mission not found" });
  }

  if (mission.MissionStatus !== MISSION_STATUS.PENDING && mission.MissionStatus !== MISSION_STATUS.EMERGENCY) {
    return result(400, {
      message: "Only pending or emergency missions can be edited",
    });
  }

  const overlapPayload = {
    startTime: hasPayloadField(payload, "startTime") ? payload.startTime : mission.StartTime,
    endTime: hasPayloadField(payload, "endTime") ? payload.endTime : mission.EndTime,
    deviceCode: hasPayloadField(payload, "deviceCode") ? payload.deviceCode : mission.DeviceCode,
    officerId: hasPayloadField(payload, "officerId") ? payload.officerId : mission.OfficerId,
  };
  const overlappingMission = await findOverlappingMission(overlapPayload, payload.reportId);
  if (overlappingMission) {
    return result(409, {
      message: overlapConflictMessage(overlappingMission),
      data: overlappingMissionConflict(overlappingMission),
    });
  }

  const locationReference = await resolveLocationReference(payload);
  if (locationReference.error) {
    return locationReference.error;
  }

  const updated = await prisma.missions.updateMany({
    where: { ReportId: payload.reportId },
    data: missionUpdateData(payload, locationReference.location),
  });

  return result(200, {
    message: "Update mission success",
    data: updated,
  });
}

async function deleteMission(payload) {
  const reportIdRequired = requireField(payload, "reportId");
  if (reportIdRequired) {
    return reportIdRequired;
  }

  const deviceReferenceRequired = requireDeviceReference(payload);
  if (deviceReferenceRequired) {
    return deviceReferenceRequired;
  }

  const device = await findDeviceByReference(payload);
  if (!device) {
    return result(404, { message: "Device not found" });
  }

  const mission = await findMissionStatus(payload.reportId);
  if (!mission) {
    return result(404, { message: "Mission not found" });
  }

  const missionDeviceMismatch = ensureMissionDeviceMatches(mission, device);
  if (missionDeviceMismatch) {
    return missionDeviceMismatch;
  }

  if (device.Active) {
    return result(400, {
      message: `Device ${device.DeviceName} is currently active, cannot delete mission`,
    });
  }

  const transactionResult = await prisma.$transaction(async (tx) => {
    const deleted = await tx.missions.deleteMany({
      where: { ReportId: payload.reportId },
    });

    const updatedDevice = await tx.devices.updateMany({
      where: { DeviceCode: device.DeviceCode },
      data: { Active: false, ActiveUpdatedAt: new Date() },
    });

    return { deleted, updatedDevice };
  });

  return result(200, {
    message: "Delete mission success",
    data: transactionResult,
  });
}

async function confirmMission(payload) {
  const reportIdRequired = requireField(payload, "reportId");
  if (reportIdRequired) {
    return reportIdRequired;
  }

  const deviceReferenceRequired = requireDeviceReference(payload);
  if (deviceReferenceRequired) {
    return deviceReferenceRequired;
  }

  const device = await findDeviceByReference(payload);
  if (!device) {
    return result(404, { message: "Device not found" });
  }

  const mission = await findMissionStatus(payload.reportId);
  if (!mission) {
    return result(404, { message: "Mission not found" });
  }

  const missionDeviceMismatch = ensureMissionDeviceMatches(mission, device);
  if (missionDeviceMismatch) {
    return missionDeviceMismatch;
  }

  if (device.Active) {
    return result(400, {
      message: `Device ${device.DeviceName} is currently active`,
    });
  }

  const isEmergency = mission?.MissionStatus === MISSION_STATUS.EMERGENCY;
  const openedAt = new Date();

  // กดรับงานหลังเลยเวลาสิ้นสุดที่กำหนด — ใบงานหมดช่วงเวลาแล้ว ต้องไปขยับ EndTime ใหม่ก่อนถึงจะรับงานได้
  // ใช้สถานะ 422 (ไม่ใช่ 409) เพื่อแยกจากเคส overlap งานฉุกเฉินข้ามเคสนี้เพราะกำหนดเวลาเองสดใหม่ตอนรับงาน
  if (!isEmergency && mission.EndTime && new Date(mission.EndTime) < openedAt) {
    return result(422, {
      message: "Mission end time has already passed; adjust the end time before accepting",
      data: {
        reportId: mission.ReportId,
        startTime: mission.StartTime,
        endTime: mission.EndTime,
        reason: "end-time-passed",
      },
    });
  }

  // กดรับงานก่อนถึงเวลาเริ่มที่กำหนด (รับงานล่วงหน้า) — จะใช้ "เวลาที่กดรับ" (openedAt) เป็นจุดเริ่มจริง
  // งานฉุกเฉินข้ามเคสนี้ เพราะกำหนดช่วงเวลาเองเป็น 1 นาทีนับจากนี้
  const isEarlyAccept =
    !isEmergency && Boolean(mission.StartTime) && new Date(mission.StartTime) > openedAt;

  // รับงานล่วงหน้า: ตรวจว่าช่วงเวลา [openedAt, EndTime] ชนกับใบงานอื่นของอุปกรณ์/เจ้าหน้าที่คนเดียวกันหรือไม่
  // ไม่ชน = รับงานได้, ชน = แจ้งเตือนและไม่รับงาน (รูปแบบ 409 เดียวกับตอน create/update)
  if (isEarlyAccept) {
    const overlappingMission = await findOverlappingMission(
      {
        startTime: openedAt,
        endTime: mission.EndTime,
        deviceCode: mission.DeviceCode,
        officerId: mission.OfficerId,
      },
      mission.ReportId,
    );

    if (overlappingMission) {
      return result(409, {
        message: overlapConflictMessage(overlappingMission),
        data: overlappingMissionConflict(overlappingMission),
      });
    }
  }

  const newStatus = isEmergency
    ? MISSION_STATUS.EMERGENCY_IN_PROGRESS
    : MISSION_STATUS.IN_PROGRESS;
  const missionData = {
    MissionStatus: newStatus,
    ...(isEmergency && {
      StartTime: openedAt,
      EndTime: new Date(openedAt.getTime() + 1 * 60 * 1000),
    }),
    // รับงานล่วงหน้าและไม่ชน: เขียนทับเวลาเริ่มด้วยเวลาที่กดรับจริง (คงเวลาสิ้นสุดเดิมไว้)
    // แล้วคำนวณ Duration (นาที) ใหม่จากช่วง [เวลาที่กดรับ → เวลาสิ้นสุดเดิม] ด้วยสูตรเดียวกับหน้าบ้าน
    ...(isEarlyAccept && {
      StartTime: openedAt,
      ...(mission.EndTime && {
        Duration: Math.max(
          0,
          Math.round((new Date(mission.EndTime).getTime() - openedAt.getTime()) / 60000),
        ),
      }),
    }),
  };

  const transactionResult = await prisma.$transaction(async (tx) => {
    const updatedMission = await tx.missions.updateMany({
      where: { ReportId: payload.reportId },
      data: missionData,
    });

    const updatedDevice = await tx.devices.updateMany({
      where: { DeviceCode: device.DeviceCode },
      data: { Active: true, ActiveUpdatedAt: new Date() },
    });

    return { updatedMission, updatedDevice };
  });

  return result(200, {
    message:
      newStatus === MISSION_STATUS.EMERGENCY_IN_PROGRESS
        ? "Confirm emergency mission success"
        : "Confirm mission success",
    data: transactionResult,
  });
}

async function completeMission(payload) {
  const reportIdRequired = requireField(payload, "reportId");
  if (reportIdRequired) {
    return reportIdRequired;
  }

  const deviceReferenceRequired = requireDeviceReference(payload);
  if (deviceReferenceRequired) {
    return deviceReferenceRequired;
  }

  const device = await findDeviceByReference(payload);
  if (!device) {
    return result(404, { message: "Device not found" });
  }

  const mission = await findMissionStatus(payload.reportId);
  if (!mission) {
    return result(404, { message: "Mission not found" });
  }

  const missionDeviceMismatch = ensureMissionDeviceMatches(mission, device);
  if (missionDeviceMismatch) {
    return missionDeviceMismatch;
  }

  const newStatus =
    mission?.MissionStatus === MISSION_STATUS.EMERGENCY_IN_PROGRESS
      ? MISSION_STATUS.EMERGENCY_COMPLETED
      : MISSION_STATUS.COMPLETED;

  const completedAt = new Date();

  const transactionResult = await prisma.$transaction(async (tx) => {
    const updatedMission = await tx.missions.updateMany({
      where: { ReportId: payload.reportId },
      data: { MissionStatus: newStatus, EndTime: completedAt },
    });

    const updatedDevice = await tx.devices.updateMany({
      where: { DeviceCode: device.DeviceCode },
      data: { Active: false, ActiveUpdatedAt: new Date() },
    });

    return { updatedMission, updatedDevice };
  });

  return result(200, {
    message:
      newStatus === MISSION_STATUS.EMERGENCY_COMPLETED
        ? "Complete emergency mission success"
        : "Complete mission success",
    data: transactionResult,
  });
}

async function cancelMission(payload) {
  const reportIdRequired = requireField(payload, "reportId");
  if (reportIdRequired) {
    return reportIdRequired;
  }

  const deviceReferenceRequired = requireDeviceReference(payload);
  if (deviceReferenceRequired) {
    return deviceReferenceRequired;
  }

  const device = await findDeviceByReference(payload);
  if (!device) {
    return result(404, { message: "Device not found" });
  }

  const mission = await findMissionStatus(payload.reportId);
  if (!mission) {
    return result(404, { message: "Mission not found" });
  }

  const missionDeviceMismatch = ensureMissionDeviceMatches(mission, device);
  if (missionDeviceMismatch) {
    return missionDeviceMismatch;
  }

  const isEmergency =
    mission?.MissionStatus === MISSION_STATUS.EMERGENCY ||
    mission?.MissionStatus === MISSION_STATUS.EMERGENCY_IN_PROGRESS;
  const newStatus = isEmergency ? MISSION_STATUS.EMERGENCY_CANCELLED : MISSION_STATUS.CANCELLED;

  const transactionResult = await prisma.$transaction(async (tx) => {
    const updatedMission = await tx.missions.updateMany({
      where: { ReportId: payload.reportId },
      data: { MissionStatus: newStatus },
    });

    let updatedDevice = null;
    if (!isEmergency) {
      updatedDevice = await tx.devices.updateMany({
        where: { DeviceCode: device.DeviceCode },
        data: { Active: false, ActiveUpdatedAt: new Date() },
      });
    }

    return { updatedMission, updatedDevice };
  });

  return result(200, {
    message: isEmergency
      ? "Cancel emergency mission success"
      : "Cancel mission success",
    data: transactionResult,
  });
}

async function deleteCancelledMission(payload) {
  const required = requireField(payload, "reportId");
  if (required) {
    return required;
  }

  const mission = await prisma.missions.findFirst({
    where: { ReportId: payload.reportId },
    select: {
      MissionId: true,
      ReportId: true,
      MissionStatus: true,
    },
  });

  if (!mission) {
    return result(404, { message: "Mission not found" });
  }

  if (
    mission.MissionStatus !== MISSION_STATUS.CANCELLED &&
    mission.MissionStatus !== MISSION_STATUS.EMERGENCY_CANCELLED
  ) {
    return result(400, {
      message: "Only cancelled missions can be deleted",
    });
  }

  const deleted = await prisma.$transaction(async (tx) => {
    await tx.eventLog.deleteMany({
      where: { MissionId: mission.MissionId },
    });

    return tx.missions.deleteMany({
      where: { ReportId: payload.reportId },
    });
  });

  return result(200, {
    message: "Delete cancelled mission success",
    data: deleted,
  });
}

module.exports = {
  cancelMission,
  completeMission,
  confirmMission,
  createMission,
  deleteCancelledMission,
  deleteMission,
  updateMission,
};
