const assert = require("assert");

const usersRepository = require("../src/modules/users/users.repository");
const cleanupService = require("../src/modules/notifications/deviceToken.cleanup.service");

const MS_PER_DAY = 24 * 60 * 60 * 1000;

(async () => {
  // getCutoffDate: ย้อนหลังตาม retentionDays
  const before = Date.now();
  const cutoff60 = cleanupService.getCutoffDate(60);
  const after = Date.now();
  assert.ok(cutoff60 instanceof Date, "cutoff should be a Date");
  assert.ok(
    cutoff60.getTime() >= before - 60 * MS_PER_DAY &&
      cutoff60.getTime() <= after - 60 * MS_PER_DAY,
    "cutoff should be ~now - 60 days",
  );

  // deactivateStaleDeviceTokens: ส่ง cutoff ที่ถูกต้องไป repo + คืน count
  let receivedCutoff = null;
  usersRepository.deactivateDeviceTokensNotSeenSince = async (cutoff) => {
    receivedCutoff = cutoff;
    return { count: 3 };
  };

  const beforeCall = Date.now();
  const result = await cleanupService.deactivateStaleDeviceTokens(45);
  const afterCall = Date.now();

  assert.strictEqual(result.deactivatedCount, 3, "should return repo updateMany count");
  assert.ok(receivedCutoff instanceof Date, "repo should receive a cutoff Date");
  assert.ok(
    receivedCutoff.getTime() >= beforeCall - 45 * MS_PER_DAY &&
      receivedCutoff.getTime() <= afterCall - 45 * MS_PER_DAY,
    "cutoff passed to repo should be ~now - 45 days",
  );
  assert.strictEqual(
    result.cutoff.getTime(),
    receivedCutoff.getTime(),
    "service should return the same cutoff it used",
  );

  console.log("smoke-device-token-cleanup-ok");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
