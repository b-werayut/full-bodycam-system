export interface LiveFeedSqlData {
  id: string;
  deviceId: string;
  missionId: string | null;
  missionName: string | null;
  officerId: string;
  officerName: string;
  location: string;
  startTime: string;
  deviceStatus: 'online' | 'offline' | 'maintenance';
  isLive: boolean;
}
