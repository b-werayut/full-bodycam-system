/**
 * Device-level access control (ตาม location ของ device)
 *
 * ใช้ก่อนเสิร์ฟข้อมูลที่อ้างอิง device โดยตรง เช่น stream/playback/recording ของ DSS
 * โดยดู LocationCode ของ device แล้วเทียบกับสิทธิ์ของ user ผ่าน canAccessLocation
 */
const { prisma } = require("../lib/prisma");
const { canAccessLocation, isLocationAdmin } = require("./locationScope");

/**
 * user เข้าถึง device นี้ได้ไหม (ตาม location ของ device)
 *   admin               -> true เสมอ (ไม่ query DB)
 *   device มี+อยู่ location เดียวกับ user -> true
 *   device ไม่มี/อยู่นอก location          -> false (fail-closed)
 * @param {{ roleId?: number|null, locationCode?: string|null }} reqUser
 * @param {string|null|undefined} deviceCode
 * @returns {Promise<boolean>}
 */
async function canAccessDevice(reqUser, deviceCode) {
  if (isLocationAdmin(reqUser)) {
    return true;
  }

  const code = typeof deviceCode === "string" ? deviceCode.trim() : deviceCode;
  if (!code) {
    return false;
  }

  const device = await prisma.devices.findUnique({
    where: { DeviceCode: String(code) },
    select: { LocationCode: true },
  });

  return canAccessLocation(reqUser, device?.LocationCode ?? null);
}

/**
 * ดึง deviceCode จาก channelId (รูปแบบ DSS: "<deviceCode>$<channel>$<stream>$...")
 * @param {string|null|undefined} channelId
 * @returns {string|null}
 */
function deviceCodeFromChannelId(channelId) {
  if (!channelId) {
    return null;
  }

  return String(channelId).split("$")[0] || null;
}

module.exports = { canAccessDevice, deviceCodeFromChannelId };
