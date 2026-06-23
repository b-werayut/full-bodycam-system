/**
 * Backfill EventLog.LocationCode (รันครั้งเดียว, idempotent)
 *
 * เซ็ต LocationCode ให้ event log เดิมที่ยัง null โดยอ้างอิงตามลำดับ:
 *   1) DeviceCode -> Devices.LocationCode   (location ของอุปกรณ์ที่ log นั้นเกี่ยวข้อง)
 *   2) MissionId  -> Missions.LocationCode   (fallback สำหรับ log ที่ไม่มี device แต่ผูก mission)
 *
 * log ที่ไม่มีทั้ง device และ mission (หรือทั้งคู่ location เป็น null) จะคง LocationCode = null
 * -> หลังเปิด filter (4c-3) จะเห็นได้เฉพาะ admin ซึ่งยอมรับได้ (log ที่ระบุ location ไม่ได้)
 *
 * วิธีรัน: node scripts/backfill-eventlog-location.js
 * รันซ้ำได้ปลอดภัย (แตะเฉพาะแถวที่ LocationCode IS NULL)
 */
const { prisma } = require("../src/lib/prisma");

// SQL Server จำกัดจำนวน parameter (~2100) ต่อ query -> แบ่ง IN list เป็นชุด
const CHUNK_SIZE = 500;

function chunk(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

// จัดกลุ่ม "ค่าอ้างอิง" (deviceCode/missionId) ตาม LocationCode ปลายทาง
function groupByLocation(rows, keyField) {
  const byLocation = new Map();
  for (const row of rows) {
    const locationCode = row.LocationCode;
    if (!locationCode) continue;
    if (!byLocation.has(locationCode)) {
      byLocation.set(locationCode, []);
    }
    byLocation.get(locationCode).push(row[keyField]);
  }
  return byLocation;
}

// อัปเดต log ที่ยัง null ให้เป็น locationCode ตามรายการ key (matchField IN keys) แบบแบ่งชุด
async function applyBackfill(byLocation, matchField) {
  let updated = 0;
  for (const [locationCode, keys] of byLocation) {
    for (const keyChunk of chunk(keys, CHUNK_SIZE)) {
      const res = await prisma.eventLog.updateMany({
        where: {
          LocationCode: null,
          [matchField]: { in: keyChunk },
        },
        data: { LocationCode: locationCode },
      });
      updated += res.count;
    }
  }
  return updated;
}

async function main() {
  const before = await prisma.eventLog.count({ where: { LocationCode: null } });
  console.log(`[backfill] event logs ที่ LocationCode = null ก่อนเริ่ม: ${before}`);

  // 1) จาก device
  const devices = await prisma.devices.findMany({
    where: { LocationCode: { not: null } },
    select: { DeviceCode: true, LocationCode: true },
  });
  const fromDevices = await applyBackfill(groupByLocation(devices, "DeviceCode"), "DeviceCode");
  console.log(`[backfill] เซ็ตจาก DeviceCode: ${fromDevices} แถว`);

  // 2) fallback จาก mission (เฉพาะแถวที่ยัง null หลังรอบ device)
  const missions = await prisma.missions.findMany({
    where: { LocationCode: { not: null } },
    select: { MissionId: true, LocationCode: true },
  });
  const fromMissions = await applyBackfill(groupByLocation(missions, "MissionId"), "MissionId");
  console.log(`[backfill] เซ็ตจาก MissionId: ${fromMissions} แถว`);

  const after = await prisma.eventLog.count({ where: { LocationCode: null } });
  console.log(`[backfill] รวมอัปเดต: ${fromDevices + fromMissions} แถว`);
  console.log(`[backfill] เหลือ LocationCode = null (ระบุ location ไม่ได้ -> admin-only): ${after}`);
}

main()
  .catch((error) => {
    console.error("[backfill] ล้มเหลว:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
