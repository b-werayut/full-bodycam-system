const { prisma } = require("../../lib/prisma");
const { config } = require("../../config");

// สถานะใบงานที่ "รอรับงาน" (ยังไม่มีใครกดรับงาน) — ดูตาราง MissionStatus ใน schema/API_SPEC
const MISSION_STATUS_PENDING = "1";

// TypeKey/Severity ของ event log เคส "ถึงเวลาเริ่มงานแล้วแต่ยังไม่กดรับงาน"
const OVERDUE_ACCEPT_TYPE_KEY = "ใบงานถึงเวลายังไม่รับงาน";
const OVERDUE_ACCEPT_SEVERITY = "WARNING";

// ระยะผ่อนผันหลังถึงเวลาเริ่ม (กันแจ้งเตือนตอนเจ้าหน้าที่กำลังกดรับพอดี) — ตั้งเป็น 0 = แจ้งทันทีที่เลยเวลา
const OVERDUE_GRACE_MS = config.missionAlerts.overdueGraceSeconds * 1000;
// ช่วงเวลาเตือนซ้ำ — ใบงานที่ยังไม่รับงานจะถูกเตือนซ้ำได้ไม่ถี่กว่าค่านี้
const OVERDUE_REPEAT_MS = config.missionAlerts.repeatSeconds * 1000;

function formatOfficerName(officer) {
  if (!officer) {
    return "System";
  }

  const fullName = [officer.FirstName, officer.LastName].filter(Boolean).join(" ").trim();
  return officer.OfficerName || fullName || "System";
}

function formatStartTime(startTime) {
  if (!startTime) {
    return "-";
  }

  const date = new Date(startTime);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  try {
    return date.toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return date.toISOString();
  }
}

function buildOverdueDetails({ mission, officerName, startTimeText }) {
  const deviceName = mission.Devices?.DeviceName || mission.DeviceCode || null;
  // คงรูปแบบ "อุปกรณ์ <ชื่อ> (<รหัส>)" ให้ตรงกับ regex ที่ฝั่ง controller/socket ใช้ดึงข้อมูลอุปกรณ์
  const deviceSegment = mission.DeviceCode ? ` | อุปกรณ์ ${deviceName} (${mission.DeviceCode})` : "";

  return (
    `ใบงาน ${mission.MissionName || mission.ReportId} ถึงกำหนดเวลาเริ่ม ${startTimeText} แล้วแต่ยังไม่มีการกดรับงาน` +
    ` | เจ้าหน้าที่: ${officerName}${deviceSegment} | ReportId: ${mission.ReportId}`
  );
}

// ใบงานที่ยังรอรับงาน (PENDING) และเลยเวลาเริ่มที่กำหนดแล้ว (now - grace >= StartTime)
async function findOverdueMissions(now = new Date()) {
  const cutoff = new Date(now.getTime() - OVERDUE_GRACE_MS);

  return prisma.missions.findMany({
    where: {
      MissionStatus: MISSION_STATUS_PENDING,
      StartTime: { lte: cutoff },
    },
    include: {
      Officers: { select: { OfficerName: true, FirstName: true, LastName: true } },
      Devices: { select: { DeviceCode: true, DeviceName: true } },
      Location: { select: { LocationName: true } },
    },
  });
}

// เช็คว่าใบงานนี้เพิ่งถูกแจ้งเตือนไปแล้วหรือยัง (กันแจ้งซ้ำถี่เกินไป)
async function hasRecentOverdueLog(missionId, now = new Date()) {
  const repeatWindowStart = new Date(now.getTime() - OVERDUE_REPEAT_MS);

  const existingLog = await prisma.eventLog.findFirst({
    where: {
      TypeKey: OVERDUE_ACCEPT_TYPE_KEY,
      MissionId: missionId,
      EventTime: { gte: repeatWindowStart },
    },
    select: { LogId: true },
  });

  return Boolean(existingLog);
}

async function createOverdueMissionEventLog(mission, now = new Date()) {
  const officerName = formatOfficerName(mission.Officers);
  const startTimeText = formatStartTime(mission.StartTime);

  return prisma.eventLog.create({
    data: {
      TypeKey: OVERDUE_ACCEPT_TYPE_KEY,
      OfficerName: officerName,
      EventTime: now,
      Severity: OVERDUE_ACCEPT_SEVERITY,
      LocationName: mission.Location?.LocationName || null,
      DeviceCode: mission.DeviceCode || null,
      MissionId: mission.MissionId,
      // ผูก location ของ event log ตาม mission สำหรับกรองตาม location
      LocationCode: mission.LocationCode ?? null,
      Details: buildOverdueDetails({ mission, officerName, startTimeText }),
      IsRead: false,
    },
  });
}

/**
 * เช็คใบงานทั้งหมดที่ถึงเวลาเริ่มแล้วแต่ยังไม่มีการกดรับงาน
 * แล้วบันทึก EventLog แจ้งเตือน (ข้ามใบที่เพิ่งแจ้งเตือนไปภายในช่วง repeat)
 */
async function checkOverdueMissions() {
  try {
    const now = new Date();
    const missions = await findOverdueMissions(now);

    const logs = [];
    for (const mission of missions) {
      if (await hasRecentOverdueLog(mission.MissionId, now)) {
        continue;
      }

      const logEntry = await createOverdueMissionEventLog(mission, now);
      logs.push(logEntry);
      console.log(
        `[MissionAlertService] Overdue accept alert for mission ${mission.ReportId} (MissionId ${mission.MissionId})`,
      );
    }

    return { success: true, logsCreated: logs.length, logs };
  } catch (error) {
    console.error("[MissionAlertService] ❌ Error:", error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  checkOverdueMissions,
  findOverdueMissions,
  hasRecentOverdueLog,
  createOverdueMissionEventLog,
  OVERDUE_ACCEPT_TYPE_KEY,
  OVERDUE_ACCEPT_SEVERITY,
};
