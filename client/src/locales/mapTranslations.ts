// กำหนดภาษาที่ระบบรองรับ
export type SupportedLanguage = 'th' | 'en';

// กำหนดโครงสร้างของคำแปล
export interface MapTranslationData {
  openFullMap: string;
  onlineLatest: string;
  updated: string;
  realTimeMap: string;
  deviceTracked: string;
  connecting: string;
  gpsLost: string;
}

// ใช้ Record ผูกภาษาเข้ากับโครงสร้าง
export const mapTranslations: Record<SupportedLanguage, MapTranslationData> = {
  th: {
    openFullMap: 'เปิดแผนที่เต็ม',
    onlineLatest: 'ออนไลน์ (พิกัดล่าสุด)',
    updated: 'อัปเดต:',
    realTimeMap: 'แผนที่เรียลไทม์',
    deviceTracked: 'อุปกรณ์กำลังติดตาม',
    connecting: 'กำลังเชื่อมต่อสัญญาณ GPS...',
    gpsLost: 'ขาดการเชื่อมต่อ GPS'
  },
  en: {
    openFullMap: 'Open Full Map',
    onlineLatest: 'Online (Latest Location)',
    updated: 'Updated:',
    realTimeMap: 'Real-time Map (Polling 10s)',
    deviceTracked: 'Device tracked',
    connecting: 'Connecting to GPS signal...',
    gpsLost: 'GPS Connection Lost'
  }
};