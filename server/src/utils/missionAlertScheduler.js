const { checkOverdueMissions } = require("../modules/internal-api/missionAlerts.service");
const { config } = require("../config");

let schedulerInterval = null;
let isRunning = false;

const CHECK_INTERVAL = config.missionAlerts.checkIntervalSeconds * 1000;

function startMissionAlertScheduler() {
    if (schedulerInterval) {
        console.log('[MissionAlertScheduler] Already running');
        return;
    }

    console.log(`[MissionAlertScheduler] Starting... (check every ${config.missionAlerts.checkIntervalSeconds}s)`);

    runCheck();
    schedulerInterval = setInterval(runCheck, CHECK_INTERVAL);
}

async function runCheck() {
    if (isRunning) {
        console.log('[MissionAlertScheduler] Previous check still running, skipping...');
        return;
    }

    isRunning = true;
    const startTime = Date.now();

    try {
        console.log('[MissionAlertScheduler] Checking overdue missions...');
        const result = await checkOverdueMissions();

        const duration = Date.now() - startTime;

        if (result.success) {
            if (result.logsCreated > 0) {
                console.log(`[MissionAlertScheduler] Created ${result.logsCreated} event log(s) (${duration}ms)`);
            } else {
                console.log(`[MissionAlertScheduler] No overdue missions found (${duration}ms)`);
            }
        } else {
            console.error(`[MissionAlertScheduler] Error: ${result.error}`);
        }
    } catch (error) {
        console.error('[MissionAlertScheduler] Unexpected error:', error);
    } finally {
        isRunning = false;
    }
}

function stopMissionAlertScheduler() {
    if (schedulerInterval) {
        clearInterval(schedulerInterval);
        schedulerInterval = null;
        console.log('[MissionAlertScheduler] Stopped');
    }
}

function getMissionAlertSchedulerStatus() {
    return {
        running: !!schedulerInterval,
        checkInterval: CHECK_INTERVAL,
    };
}

module.exports = {
    startMissionAlertScheduler,
    stopMissionAlertScheduler,
    getMissionAlertSchedulerStatus,
};
