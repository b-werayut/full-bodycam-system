/**
 * Location-based access control helpers
 *
 * จุดเดียวที่ตัดสินว่า user คนหนึ่งเห็น/แตะข้อมูลของ location ไหนได้บ้าง
 * ทุก endpoint ต้องเรียกใช้ helper ในไฟล์นี้ ห้ามเขียนเงื่อนไข role/location กระจายในที่อื่น
 *
 * เกณฑ์: RoleId <= 2 (1=SuperAdmin, 2=Admin) เห็นทุก location ตรงกับ authorizeRoleIdAtMost(2)
 */

// RoleId ที่ถือว่าเป็นชั้น admin (เห็น/จัดการได้ทุก location)
const ADMIN_MAX_ROLE_ID = 2;

/**
 * เป็น user ชั้น admin หรือไม่ (RoleId 1 หรือ 2) -> ข้ามการกรอง location ทั้งหมด
 * @param {{ roleId?: number|null }} reqUser - payload จาก JWT (req.user)
 * @returns {boolean}
 */
function isLocationAdmin(reqUser) {
  const rawRoleId = reqUser?.roleId;
  // กัน null/undefined ก่อน coerce เพราะ Number(null)=0 จะผ่าน isInteger แล้วหลุดเป็น admin
  if (rawRoleId === null || rawRoleId === undefined) {
    return false;
  }

  const roleId = Number(rawRoleId);
  // roleId เริ่มที่ 1 (autoincrement) -> บังคับ >= 1 กัน 0/ค่าติดลบ/"" หลุดเป็น admin ด้วย
  return Number.isInteger(roleId) && roleId >= 1 && roleId <= ADMIN_MAX_ROLE_ID;
}

/**
 * สร้าง where-fragment สำหรับกรองข้อมูลตาม location ของ user (ใช้ spread เข้า where ของ Prisma)
 *   admin            -> {}                       (ไม่กรอง เห็นทุก location)
 *   มี locationCode  -> { [field]: locationCode } (เห็นเฉพาะ location ตัวเอง)
 *   ไม่มี locationCode -> { [field]: { in: [] } }   (fail-closed: ไม่ match อะไรเลย เห็นว่าง)
 * @param {{ roleId?: number|null, locationCode?: string|null }} reqUser - payload จาก JWT (req.user)
 * @param {string} [field="LocationCode"] - ชื่อคอลัมน์ที่ใช้กรองในตารางนั้น
 * @returns {object} Prisma where-fragment
 */
function locationScope(reqUser, field = "LocationCode") {
  if (isLocationAdmin(reqUser)) {
    return {};
  }

  const locationCode = reqUser?.locationCode;
  if (!locationCode) {
    // user ที่ไม่ใช่ admin แต่ยังไม่ถูกผูก location -> ไม่ให้เห็นอะไรเลย (ปลอดภัยกว่าเห็นทั้งหมด)
    return { [field]: { in: [] } };
  }

  return { [field]: locationCode };
}

/**
 * ตรวจสิทธิ์ตอน "เขียน" ว่า user แตะข้อมูลของ location นี้ได้ไหม (ใช้กับ create/update/delete)
 *   admin                         -> true เสมอ
 *   locationCode ตรงกับของ user   -> true
 *   นอกนั้น                        -> false
 * @param {{ roleId?: number|null, locationCode?: string|null }} reqUser - payload จาก JWT (req.user)
 * @param {string|null|undefined} locationCode - location ของข้อมูลที่จะแตะ
 * @returns {boolean}
 */
function canAccessLocation(reqUser, locationCode) {
  if (isLocationAdmin(reqUser)) {
    return true;
  }

  return Boolean(locationCode) && reqUser?.locationCode === locationCode;
}

module.exports = {
  ADMIN_MAX_ROLE_ID,
  isLocationAdmin,
  locationScope,
  canAccessLocation,
};
