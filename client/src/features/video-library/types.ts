export interface VideoLibrarySqlData {
  id: string;
  deviceId: string;
  missionId: string | null;
  missionName: string | null;
  officerId: string;
  officerName: string;
  startTime: string;
  endTime: string;
  duration: string;
  filePath: string;
  location: string;
  isArchived: boolean;
  cameraCode?: string;
  deviceName?: string;
  missionStatus?: string;
  description?: string;
  reportId?: string;
}
