const cron = require("node-cron");

const { deleteExpiredEventLogs } = require("../modules/internal-api/eventLogs.cleanup.service");
const { config } = require("../config");

const DEFAULT_CRON = "0 0 * * *"; // daily at midnight

let task = null;
let isRunning = false;

const RETENTION_DAYS = config.eventLogCleanup.retentionDays;
const TIMEZONE = config.eventLogCleanup.timezone;

function resolveCronExpression() {
    const expression = config.eventLogCleanup.cron;

    if (cron.validate(expression)) {
        return expression;
    }

    console.warn(`[EventLogCleanupScheduler] Invalid cron expression "${expression}", falling back to "${DEFAULT_CRON}"`);
    return DEFAULT_CRON;
}

function startEventLogCleanupScheduler() {
    if (task) {
        console.log('[EventLogCleanupScheduler] Already running');
        return;
    }

    const expression = resolveCronExpression();

    console.log(`[EventLogCleanupScheduler] Starting... (retention ${RETENTION_DAYS} days, cron "${expression}", timezone ${TIMEZONE})`);

    task = cron.schedule(expression, runCleanup, { timezone: TIMEZONE });
}

async function runCleanup() {
    if (isRunning) {
        console.log('[EventLogCleanupScheduler] Previous cleanup still running, skipping...');
        return;
    }

    isRunning = true;
    const startTime = Date.now();

    try {
        console.log('[EventLogCleanupScheduler] Cleaning up expired event logs...');
        const { deletedCount, cutoff } = await deleteExpiredEventLogs(RETENTION_DAYS);

        const duration = Date.now() - startTime;

        if (deletedCount > 0) {
            console.log(`[EventLogCleanupScheduler] Deleted ${deletedCount} event logs older than ${cutoff.toISOString()} (${duration}ms)`);
        } else {
            console.log(`[EventLogCleanupScheduler] No expired event logs found (${duration}ms)`);
        }
    } catch (error) {
        console.error('[EventLogCleanupScheduler] Unexpected error:', error);
    } finally {
        isRunning = false;
    }
}

function stopEventLogCleanupScheduler() {
    if (task) {
        task.stop();
        if (typeof task.destroy === "function") {
            task.destroy();
        }
        task = null;
        console.log('[EventLogCleanupScheduler] Stopped');
    }
}

function getEventLogCleanupSchedulerStatus() {
    return {
        running: !!task,
        retentionDays: RETENTION_DAYS,
        cron: config.eventLogCleanup.cron,
        timezone: TIMEZONE,
        nextRun: task && typeof task.getNextRun === "function" ? task.getNextRun() : null,
    };
}

module.exports = {
    startEventLogCleanupScheduler,
    stopEventLogCleanupScheduler,
    getEventLogCleanupSchedulerStatus,
};
