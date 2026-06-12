const { prisma } = require("../../lib/prisma");

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const getCutoffDate = (retentionDays) => new Date(Date.now() - retentionDays * MS_PER_DAY);

const deleteExpiredEventLogs = async (retentionDays) => {
  const cutoff = getCutoffDate(retentionDays);

  const result = await prisma.eventLog.deleteMany({
    where: {
      EventTime: {
        lt: cutoff,
      },
    },
  });

  return {
    deletedCount: result.count,
    cutoff,
  };
};

module.exports = {
  getCutoffDate,
  deleteExpiredEventLogs,
};
