export interface CameraData {
  id: number;
  name: string;
  status: 'online' | 'offline';
  serialNo?: string;
  battery?: number;
  signal?: 'Strong' | 'Weak';
  deviceCode?: string;
  locationName?: string;
}
