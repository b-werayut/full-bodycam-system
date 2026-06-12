export interface EventLogNotification {
  id: number;
  typeKey: string;
  officer?: string;
  time?: string | null;
  date?: string | null;
  severity?: string;
  location?: string;
  details?: string;
  deviceName?: string;
  deviceCode?: string;
}
