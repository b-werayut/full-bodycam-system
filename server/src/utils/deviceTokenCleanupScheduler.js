const cron = require("node-cron");

const { deactivateStaleDeviceTokens } = require("../modules/notifications/deviceToken.cleanup.service");
const { config } = require("../config");

const DEFAULT_CRON = "0 3 * * *"; // daily at 03:00 (offset จาก event log cleanup ที่เที่ยงคืน)

let task = null;
let isRunning = false;

const RETENTION_DAYS = config.deviceTokenCleanup.retentionDays;
const TIMEZONE = config.deviceTokenCleanup.timezone;

function resolveCronExpression() {
    const expression = config.deviceTokenCleanup.cron;

    if (cron.validate(expression)) {
        return expression;
    }

    console.warn(`[DeviceTokenCleanupScheduler] Invalid cron expression "${expression}", falling back to "${DEFAULT_CRON}"`);
    return DEFAULT_CRON;
}

function startDeviceTokenCleanupScheduler() {
    if (task) {
        console.log('[DeviceTokenCleanupScheduler] Already running');
        return;
    }

    const expression = resolveCronExpression();

    console.log(`[DeviceTokenCleanupScheduler] Starting... (retention ${RETENTION_DAYS} days, cron "${expression}", timezone ${TIMEZONE})`);

    task = cron.schedule(expression, runCleanup, { timezone: TIMEZONE });
}

async function runCleanup() {
    if (isRunning) {
        console.log('[DeviceTokenCleanupScheduler] Previous cleanup still running, skipping...');
        return;
    }

    isRunning = true;
    const startTime = Date.now();

    try {
        console.log('[DeviceTokenCleanupScheduler] Deactivating stale device tokens...');
        const { deactivatedCount, cutoff } = await deactivateStaleDeviceTokens(RETENTION_DAYS);

        const duration = Date.now() - startTime;

        if (deactivatedCount > 0) {
            console.log(`[DeviceTokenCleanupScheduler] Deactivated ${deactivatedCount} device token(s) not seen since ${cutoff.toISOString()} (${duration}ms)`);
        } else {
            console.log(`[DeviceTokenCleanupScheduler] No stale device tokens found (${duration}ms)`);
        }
    } catch (error) {
        console.error('[DeviceTokenCleanupScheduler] Unexpected error:', error);
    } finally {
        isRunning = false;
    }
}

function stopDeviceTokenCleanupScheduler() {
    if (task) {
        task.stop();
        if (typeof task.destroy === "function") {
            task.destroy();
        }
        task = null;
        console.log('[DeviceTokenCleanupScheduler] Stopped');
    }
}

function getDeviceTokenCleanupSchedulerStatus() {
    return {
        running: !!task,
        retentionDays: RETENTION_DAYS,
        cron: config.deviceTokenCleanup.cron,
        timezone: TIMEZONE,
        nextRun: task && typeof task.getNextRun === "function" ? task.getNextRun() : null,
    };
}

module.exports = {
    startDeviceTokenCleanupScheduler,
    stopDeviceTokenCleanupScheduler,
    getDeviceTokenCleanupSchedulerStatus,
};
