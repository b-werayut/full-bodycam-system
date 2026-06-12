const { prisma } = require("../../lib/prisma");
const { config } = require("../../config");
const { fetchDeviceLocationFromDss } = require("../dss/dss.service");

const DEVICE_STATUS_SCENARIOS = {
    ONLINE_INACTIVE: 'online_inactive',
    OFFLINE_ACTIVE: 'offline_active'
};

const DEVICE_STATUS_ALERT_DELAY_MS = config.deviceStatus.alertDelaySeconds * 1000;
const ONLINE_INACTIVE_REPEAT_INTERVAL_MS = config.deviceStatus.onlineInactiveRepeatSeconds * 1000;

// เก็บ device event ที่เคย log แล้วเพื่อไม่ให้ log ซ้ำในแต่ละ scenario
const loggedDevices = new Set();

function getDateMs(value) {
    if (!value) return null;
    const timestamp = new Date(value).getTime();
    return Number.isNaN(timestamp) ? null : timestamp;
}

function getDeviceLogKey(deviceCode, scenario) {
    return `${scenario}:${deviceCode}`;
}

function getEventLogTypeKey(scenario) {
    return scenario === DEVICE_STATUS_SCENARIOS.OFFLINE_ACTIVE
        ? 'กล้องออฟไลน์ระหว่างปฏิบัติงาน'
        : 'เปิดใช้งานกล้องฉุกเฉิน';
}

function getEventRepeatIntervalMs(scenario) {
    return scenario === DEVICE_STATUS_SCENARIOS.OFFLINE_ACTIVE
        ? DEVICE_STATUS_ALERT_DELAY_MS
        : ONLINE_INACTIVE_REPEAT_INTERVAL_MS;
}

function getDeviceStatusScenario(device, now = new Date()) {
    const activeUpdatedAtMs = getDateMs(device.ActiveUpdatedAt);
    const statusUpdatedAtMs = getDateMs(device.StatusUpdatedAt);

    if (device.Status === false && device.Active === true) {
        if (!activeUpdatedAtMs) {
            return null;
        }

        const offlineStartedAtMs = statusUpdatedAtMs && statusUpdatedAtMs > activeUpdatedAtMs
            ? statusUpdatedAtMs
            : activeUpdatedAtMs;
        const offlineStartedAt = new Date(offlineStartedAtMs);
        const elapsedMs = now.getTime() - offlineStartedAt.getTime();
        if (elapsedMs < DEVICE_STATUS_ALERT_DELAY_MS) {
            return null;
        }

        return {
            scenario: DEVICE_STATUS_SCENARIOS.OFFLINE_ACTIVE,
            mismatchStartedAt: offlineStartedAt
        };
    }

    if (device.Status === true && device.Active === false) {
        if (!statusUpdatedAtMs) {
            return null;
        }

        const onlineStartedAt = new Date(statusUpdatedAtMs);
        const elapsedMs = now.getTime() - onlineStartedAt.getTime();
        if (elapsedMs < DEVICE_STATUS_ALERT_DELAY_MS) {
            return null;
        }

        return {
            scenario: DEVICE_STATUS_SCENARIOS.ONLINE_INACTIVE,
            mismatchStartedAt: onlineStartedAt
        };
    }

    return null;
}

async function hasRecentEventLog({ device, scenario }) {
    const repeatWindowStartedAt = new Date(Date.now() - getEventRepeatIntervalMs(scenario));

    const existingLog = await prisma.eventLog.findFirst({
        where: {
            TypeKey: getEventLogTypeKey(scenario),
            OR: [
                {
                    DeviceCode: device.DeviceCode
                },
                {
                    Details: {
                        contains: `(${device.DeviceCode})`
                    }
                }
            ],
            EventTime: {
                gte: repeatWindowStartedAt
            }
        },
        select: {
            LogId: true
        }
    });

    return Boolean(existingLog);
}

/**
 * ดึง Location ล่าสุดของ device จาก database
 */
async function getDeviceLocation(deviceCode) {
    try {
        const device = await prisma.devices.findUnique({
            where: { DeviceCode: deviceCode },
            select: {
                Location: {
                    select: {
                        LocationCode: true,
                        LocationName: true,
                        Latitude: true,
                        Longitude: true
                    }
                }
            }
        });
        return device?.Location ?? null;
    } catch (error) {
        console.error('[DeviceStatusService] Error fetching location:', error);
        return null;
    }
}

async function getDeviceDssLocation(deviceCode) {
    try {
        return await fetchDeviceLocationFromDss(deviceCode);
    } catch (error) {
        console.error('[DeviceStatusService] Error fetching DSS location:', error.message);
        return null;
    }
}

function mergeDeviceLocation(dbLocation, dssLocation) {
    if (!dbLocation && !dssLocation) {
        return null;
    }

    return {
        ...(dbLocation || {}),
        Latitude: dssLocation?.Latitude ?? dbLocation?.Latitude ?? null,
        Longitude: dssLocation?.Longitude ?? dbLocation?.Longitude ?? null,
        LocationCode: dbLocation?.LocationCode ?? null,
        LocationName: dbLocation?.LocationName ?? null
    };
}

/**
 * สร้างหรือดึง Officer "Emergency Open"
 */
async function getOrCreateEmergencyOfficer() {
    try {
        let officer = await prisma.officers.findFirst({
            where: { OfficerName: 'Emergency-System' }
        });

        if (!officer) {
            officer = await prisma.officers.create({
                data: { OfficerName: 'Emergency-System' }
            });
            console.log('[DeviceStatusService] Created Emergency officer');
        }

        return officer;
    } catch (error) {
        console.error('[DeviceStatusService] Error with emergency officer:', error);
        return null;
    }
}

/**
 * สร้าง ReportId แบบ EMER-XXXXXX (uuid 6 ตัว)
 */
function generateEmergencyReportId() {
    const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
    return `EMER-${uuid.slice(0, 6).toUpperCase()}`;
}

/**
 * สร้าง Emergency Mission อัตโนมัติ
 */
async function createEmergencyMission(device, location, officer, openedAt = new Date()) {
    try {
        const reportId = generateEmergencyReportId();

        // สร้างข้อมูล location สำหรับแสดงใน MissionName และ Description
        const locationInfo = location?.LocationName || 'ไม่ระบุตำแหน่ง';

        const mission = await prisma.missions.create({
            data: {
                ReportId: reportId,
                MissionName: `Emergency: กล้อง ${device.DeviceName || device.DeviceCode} @ ${locationInfo}`,
                StartTime: openedAt,
                EndTime: new Date(openedAt.getTime() + 1 * 60 * 1000),
                Description: `กล้อง ${device.DeviceName || device.DeviceCode} (${device.DeviceCode}) ออนไลน์แต่ยังไม่ได้เปิดใช้งาน - ระบบสร้างใบงานฉุกเฉินอัตโนมัติ`,
                OfficerId: officer?.OfficerId || null,
                LocationCode: location?.LocationCode || null,
                MissionStatus: "5",
                DeviceCode: device.DeviceCode,
                Latitude: location?.Latitude ?? null,
                Longitude: location?.Longitude ?? null,
                Priority: 'high',
                Note: 'สร้างอัตโนมัติจากระบบตรวจสอบสถานะอุปกรณ์'
            }
        });

        console.log(`[DeviceStatusService] Created emergency mission: ${reportId}`);
        return mission;
    } catch (error) {
        console.error('[DeviceStatusService] Error creating mission:', error);
        return null;
    }
}

async function findActiveMission(deviceCode) {
    try {
        return await prisma.missions.findFirst({
            where: {
                DeviceCode: deviceCode,
                MissionStatus: {
                    in: ["2", "6"]
                }
            },
            orderBy: {
                CreatedAt: "desc"
            },
            select: {
                MissionId: true,
                ReportId: true,
                MissionName: true,
                MissionStatus: true
            }
        });
    } catch (error) {
        console.error('[DeviceStatusService] Error fetching active mission:', error);
        return null;
    }
}

async function findOpenEmergencyMission(deviceCode) {
    try {
        return await prisma.missions.findFirst({
            where: {
                DeviceCode: deviceCode,
                MissionStatus: {
                    in: ["5", "6"]
                }
            },
            orderBy: {
                CreatedAt: "desc"
            },
            select: {
                MissionId: true,
                ReportId: true,
                MissionName: true,
                MissionStatus: true,
                StartTime: true,
                EndTime: true
            }
        });
    } catch (error) {
        console.error('[DeviceStatusService] Error fetching open emergency mission:', error);
        return null;
    }
}

async function refreshEmergencyMissionTime(mission, openedAt = new Date(), location = null) {
    if (!mission?.ReportId) {
        return mission;
    }

    const nextTimes = {
        StartTime: openedAt,
        EndTime: new Date(openedAt.getTime() + 1 * 60 * 1000)
    };
    const locationData = location
        ? {
            LocationCode: location.LocationCode || null,
            Latitude: location.Latitude ?? null,
            Longitude: location.Longitude ?? null
        }
        : {};
    const missionData = {
        ...nextTimes,
        ...locationData
    };

    await prisma.missions.updateMany({
        where: { ReportId: mission.ReportId },
        data: missionData
    });

    return {
        ...mission,
        ...missionData
    };
}

async function refreshEmergencyMissionLocation(mission, location = null) {
    if (!mission?.ReportId || !location) {
        return mission;
    }

    const locationData = {
        LocationCode: location.LocationCode || null,
        Latitude: location.Latitude ?? null,
        Longitude: location.Longitude ?? null
    };

    await prisma.missions.updateMany({
        where: { ReportId: mission.ReportId },
        data: locationData
    });

    return {
        ...mission,
        ...locationData
    };
}

async function refreshOpenEmergencyMissionLocation(deviceCode) {
    const dbLocation = await getDeviceLocation(deviceCode);
    const dssLocation = await getDeviceDssLocation(deviceCode);
    const missionLocation = mergeDeviceLocation(dbLocation, dssLocation);
    const mission = await findOpenEmergencyMission(deviceCode);

    if (!mission) {
        return null;
    }

    return refreshEmergencyMissionLocation(mission, missionLocation);
}

async function createDeviceStatusEventLog({ device, locationName, mission, scenario, mismatchStartedAt }) {
    const isOfflineWhileActive = scenario === DEVICE_STATUS_SCENARIOS.OFFLINE_ACTIVE;

    return prisma.eventLog.create({
        data: {
            TypeKey: getEventLogTypeKey(scenario),
            OfficerName: isOfflineWhileActive ? 'System' : 'Emergency-System',
            EventTime: new Date(),
            Severity: isOfflineWhileActive ? 'HIGH' : 'WARNING',
            LocationName: locationName,
            DeviceCode: device.DeviceCode,
            MissionId: mission?.MissionId || null,
            Details: isOfflineWhileActive
                ? `อุปกรณ์ ${device.DeviceName || device.DeviceCode} (${device.DeviceCode}) ออฟไลน์ระหว่างปฏิบัติงาน | ประเภท: ${device.DeviceType || '-'} | Serial: ${device.SerialNo || '-'} | ReportId: ${mission?.ReportId || '-'}`
                : `อุปกรณ์ ${device.DeviceName || device.DeviceCode} (${device.DeviceCode}) ออนไลน์แต่ยังไม่ได้เปิดใช้งาน | ประเภท: ${device.DeviceType || '-'} | Serial: ${device.SerialNo || '-'} | ReportId: ${mission?.ReportId || '-'}`,
            IsRead: false
        }
    });
}

/**
 * เช็คเมื่อ device online (Status=true) แต่ไม่ได้เปิดใช้งาน (Active=false)
 * และบันทึก EventLog + สร้าง Emergency Mission
 * @param {string} deviceCode - รหัสอุปกรณ์ที่ต้องการเช็ค
 */
async function checkDeviceOnlineStatus(deviceCode) {
    try {
        console.log(`[DeviceStatusService] Checking device: ${deviceCode}`);

        const device = await prisma.devices.findUnique({
            where: { DeviceCode: deviceCode }
        });

        if (!device) {
            console.log(`[DeviceStatusService] Device ${deviceCode} not found`);
            return { logged: false, reason: 'Device not found' };
        }

        console.log(`[DeviceStatusService] Device found - Status: ${device.Status}, Active: ${device.Active}`);

        const scenarioInfo = getDeviceStatusScenario(device);
        if (!scenarioInfo) {
            return { logged: false, reason: 'No matching status scenario' };
        }

        const { scenario, mismatchStartedAt } = scenarioInfo;
        const logKey = getDeviceLogKey(deviceCode, scenario);
        // เช็คว่าเคย log scenario นี้ไปแล้วหรือยัง (ป้องกัน log ซ้ำ)
        if (scenario !== DEVICE_STATUS_SCENARIOS.OFFLINE_ACTIVE && loggedDevices.has(logKey)) {
            if (scenario === DEVICE_STATUS_SCENARIOS.ONLINE_INACTIVE) {
                await refreshOpenEmergencyMissionLocation(deviceCode);
            }
            console.log(`[DeviceStatusService] Device ${deviceCode} already logged for ${scenario}, skipping`);
            return { logged: false, reason: 'Already logged' };
        }

        const hasExistingLog = await hasRecentEventLog({
            device,
            scenario
        });

        if (hasExistingLog) {
            if (scenario !== DEVICE_STATUS_SCENARIOS.OFFLINE_ACTIVE) {
                loggedDevices.add(logKey);
            }
            if (scenario === DEVICE_STATUS_SCENARIOS.ONLINE_INACTIVE) {
                await refreshOpenEmergencyMissionLocation(deviceCode);
            }
            console.log(`[DeviceStatusService] Device ${deviceCode} already has event log for ${scenario}, skipping`);
            return { logged: false, reason: 'Already logged in database' };
        }

        // ดึง Location ของ device
        const dbLocation = await getDeviceLocation(deviceCode);
        let missionLocation = dbLocation;
        const locationName = dbLocation?.LocationName || null;

        let mission = null;
        if (scenario === DEVICE_STATUS_SCENARIOS.ONLINE_INACTIVE) {
            // ดึงหรือสร้าง Emergency Officer
            const officer = await getOrCreateEmergencyOfficer();
            const dssLocation = await getDeviceDssLocation(deviceCode);
            missionLocation = mergeDeviceLocation(dbLocation, dssLocation);

            // สร้าง Emergency Mission เฉพาะเคส online แต่ยังไม่ active
            mission = await findOpenEmergencyMission(deviceCode);
            if (!mission) {
                mission = await createEmergencyMission(device, missionLocation, officer);
            } else {
                mission = await refreshEmergencyMissionTime(mission, new Date(), missionLocation);
            }
        } else {
            mission = await findActiveMission(deviceCode);
        }

        const logEntry = await createDeviceStatusEventLog({
            device,
            locationName,
            mission,
            scenario,
            mismatchStartedAt
        });

        if (scenario !== DEVICE_STATUS_SCENARIOS.OFFLINE_ACTIVE) {
            loggedDevices.add(logKey);
        }

        console.log(`[DeviceStatusService] ✅ Logged ${scenario} warning for device: ${deviceCode}`);
        return { logged: true, logEntry, mission, scenario };

    } catch (error) {
        console.error('[DeviceStatusService] ❌ Error:', error);
        return { logged: false, error: error.message };
    }
}

/**
 * เช็ค devices ทั้งหมดที่ online แต่ไม่ได้เปิดใช้งาน
 */
async function checkAllOnlineDevices() {
    try {
        const devices = await prisma.devices.findMany({
            where: {
                OR: [
                    {
                        Status: true,
                        Active: false
                    },
                    {
                        Status: false,
                        Active: true
                    }
                ]
            }
        });

        const results = [];
        for (const device of devices) {
            const result = await checkDeviceOnlineStatus(device.DeviceCode);
            if (result.logged) {
                results.push(result.logEntry);
            }
        }

        return { success: true, logsCreated: results.length, logs: results };

    } catch (error) {
        console.error('[DeviceStatusService] Error checking all devices:', error);
        return { success: false, error: error.message };
    }
}

/**
 * ล้าง cache ของ device ที่เคย log (สำหรับ reset)
 */
function clearLoggedDevicesCache() {
    loggedDevices.clear();
}

module.exports = {
    checkDeviceOnlineStatus,
    checkAllOnlineDevices,
    clearLoggedDevicesCache
};
