const { checkAllOnlineDevices, clearLoggedDevicesCache } = require("../modules/devices/deviceStatus.service");
const { config } = require("../config");

let schedulerInterval = null;
let cacheResetInterval = null;
let isRunning = false;

const CHECK_INTERVAL = config.deviceStatus.checkIntervalSeconds * 1000;
const CACHE_RESET_INTERVAL = config.deviceStatus.cacheResetSeconds * 1000;

function startDeviceStatusScheduler() {
    if (schedulerInterval) {
        console.log('[DeviceStatusScheduler] Already running');
        return;
    }

    console.log('[DeviceStatusScheduler] Starting... (check every 1 minute)');

    runCheck();
    schedulerInterval = setInterval(runCheck, CHECK_INTERVAL);
    cacheResetInterval = setInterval(() => {
        console.log('[DeviceStatusScheduler] Resetting logged devices cache');
        clearLoggedDevicesCache();
    }, CACHE_RESET_INTERVAL);
}

async function runCheck() {
    if (isRunning) {
        console.log('[DeviceStatusScheduler] Previous check still running, skipping...');
        return;
    }

    isRunning = true;
    const startTime = Date.now();

    try {
        console.log('[DeviceStatusScheduler] Checking devices...');
        const result = await checkAllOnlineDevices();

        const duration = Date.now() - startTime;

        if (result.success) {
            if (result.logsCreated > 0) {
                console.log(`[DeviceStatusScheduler] Created ${result.logsCreated} event logs (${duration}ms)`);
            } else {
                console.log(`[DeviceStatusScheduler] No device status events found (${duration}ms)`);
            }
        } else {
            console.error(`[DeviceStatusScheduler] Error: ${result.error}`);
        }
    } catch (error) {
        console.error('[DeviceStatusScheduler] Unexpected error:', error);
    } finally {
        isRunning = false;
    }
}

function stopDeviceStatusScheduler() {
    if (schedulerInterval) {
        clearInterval(schedulerInterval);
        schedulerInterval = null;
        if (cacheResetInterval) {
            clearInterval(cacheResetInterval);
            cacheResetInterval = null;
        }
        console.log('[DeviceStatusScheduler] Stopped');
    }
}

function getSchedulerStatus() {
    return {
        running: !!schedulerInterval,
        checkInterval: CHECK_INTERVAL,
        cacheResetInterval: CACHE_RESET_INTERVAL
    };
}

module.exports = {
    startDeviceStatusScheduler,
    stopDeviceStatusScheduler,
    getSchedulerStatus
};
