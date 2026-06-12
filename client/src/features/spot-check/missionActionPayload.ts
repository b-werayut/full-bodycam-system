import type { SpotCheckItem } from './types';

type MissionDeviceReference = Pick<
  SpotCheckItem,
  'reportId' | 'deviceCode' | 'deviceName' | 'cameraId'
>;

export interface MissionActionPayload {
  reportId?: string;
  deviceCode?: string;
  deviceName?: string;
}

export function buildMissionActionPayload(item: MissionDeviceReference): MissionActionPayload {
  const payload: MissionActionPayload = {
    reportId: item.reportId,
  };

  if (item.deviceCode) {
    payload.deviceCode = item.deviceCode;
    return payload;
  }

  payload.deviceName = item.deviceName || item.cameraId;
  return payload;
}
