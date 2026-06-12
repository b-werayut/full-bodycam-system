export interface SpotCheckItem {
  id: string;
  missionId: string;
  reportId?: string;
  missionName: string;
  status:
    | 'waiting'
    | 'accepted'
    | 'in-progress'
    | 'completed'
    | 'cancelled'
    | 'emergency'
    | 'emergency-in-progress'
    | 'emergency-completed'
    | 'emergency-cancelled';
  statusText: string;
  startTime: string;
  endTime?: string;
  location: string;
  address: string;
  coordinates: string;
  officerId: string;
  officerName: string;
  cameraId: string;
  deviceName?: string;
  priority: 'low' | 'medium' | 'high';
  reportType: 'daily' | 'incident' | 'inspection' | 'training';
  description?: string;
  locationId?: number;
  locationCode?: string;
  deviceCode?: string;
  latitude?: string;
  longitude?: string;
  duration?: number;
  note?: string;
}
