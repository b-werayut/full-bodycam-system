import api from './apiClient';

export interface DeviceData {
  deviceCode: string;
  deviceName: string;
  serialNo?: string;
  status: boolean;
  active: boolean;
  locationId?: number;
  latitude?: string;
  longitude?: string;
  locationName?: string | null;
  recordedAt?: string;
}

interface RawDevice {
  DeviceCode: string;
  DeviceName: string;
  SerialNo?: string;
  Status: boolean;
  Active?: boolean;
  LocationId?: number;
  Latitude?: string;
  Longitude?: string;
  Locations?: Array<{ LocationName?: string }>;
  RegisteredAt?: string;
}

export const mapDevice = (device: RawDevice): DeviceData => ({
  deviceCode: device.DeviceCode,
  deviceName: device.DeviceName,
  serialNo: device.SerialNo,
  status: device.Status,
  active: device.Active ?? false,
  locationId: device.LocationId,
  latitude: device.Latitude,
  longitude: device.Longitude,
  locationName: device.Locations?.[0]?.LocationName || null,
  recordedAt: device.RegisteredAt,
});

export async function getAllDevices() {
  const response = await api.get(`/getalldevices?_t=${Date.now()}`);
  return Array.isArray(response.data) ? (response.data as RawDevice[]).map(mapDevice) : [];
}

export async function getOnlineDevices() {
  const response = await api.get(`/getonlinedevices?_t=${Date.now()}`);
  return Array.isArray(response.data) ? (response.data as RawDevice[]).map(mapDevice) : [];
}

export async function getDevicesWithFallback() {
  try {
    return await getAllDevices();
  } catch {
    return getOnlineDevices();
  }
}

export async function requestCameraStream(deviceCode: string, includeUserFlag = false) {
  const response = await api.post('/getstream?_t=' + Date.now(), {
    ...(includeUserFlag ? { User: 'true' } : {}),
    deviceCode,
    channelId: `${deviceCode}$1$0$0`,
  });

  return response.data;
}

export async function requestLegacyLiveFeedStream(deviceCode: string) {
  const response = await api.post('/api/v1/stream', {
    User: 'true',
    deviceCode,
    channelId: `${deviceCode}$1$0$0`,
  });

  return response.data;
}
