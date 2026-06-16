const usersRepository = require("../users/users.repository");

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const getCutoffDate = (retentionDays) => new Date(Date.now() - retentionDays * MS_PER_DAY);

// ปิด (IsActive=false) device token ที่ไม่ได้อัปเดต (LastSeenAt) นานเกิน retentionDays
// -> ลด token ค้างออกจากรายชื่อผู้รับ push (เครื่องที่ re-register ภายหลังจะกลับมา active เอง)
const deactivateStaleDeviceTokens = async (retentionDays) => {
  const cutoff = getCutoffDate(retentionDays);
  const result = await usersRepository.deactivateDeviceTokensNotSeenSince(cutoff);

  return {
    deactivatedCount: result.count,
    cutoff,
  };
};

module.exports = {
  getCutoffDate,
  deactivateStaleDeviceTokens,
};
