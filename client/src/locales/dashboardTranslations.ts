export type SupportedLanguage = 'th' | 'en';
export interface DashboardTranslationData {
  [key: string]: string;
  onlineCameras: string;
  totalCameras: string;
  gpsDevices: string;
  tracking: string;
  alerts: string;
  pending: string;
  cameraList: string;
  cameraListDesc: string;
  online: string;
  offline: string;
  gpsMap: string;
  gpsMapDesc: string;
  viewMap: string;
  close: string;
  onlineDevices: string;
  trackingStatus: string;
  accuracy: string;
  highPrecision: string;
  lastUpdate: string;
  updateTimeUnit: string;
  updateAgo: string;
  speed: string;
  speedUnit: string;
  updatedAt: string;
  justNow: string;
  trackBtn: string;
  detailsBtn: string;
  alertsSection: string;
  alertsSectionDesc: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  showingResults: string;
  ofTotal: string;
  items: string;
  clearFilter: string;
  noAlertsFound: string;
  tryAdjustFilter: string;
  type: string;
  officer: string;
  time: string;
  timeUnit: string;
  alertDetails: string;
  liveFeed: string;
  playVideo: string;
  download: string;
  gpsInfo: string;
  coordinates: string;
  address: string;
  distance: string;
  actionCompleted: string;
  sendOfficer: string;
  emergency: string;
  addressValue: string;
  distanceValue: string;
  sos_panic: string;
  connection_lost: string;
  battery_low: string;
  storage_full: string;
  page: string;
  of: string;
  prev: string;
  next: string;
  devices: string;
}

export const dashboardTranslations: Record<SupportedLanguage, DashboardTranslationData> = {
  th: {
    onlineCameras: 'กล้องออนไลน์',
    totalCameras: 'กล้องที่เปิดใช้งานทั้งหมด',
    gpsDevices: 'อุปกรณ์ GPS',
    tracking: 'กำลังติดตาม',
    alerts: 'การแจ้งเตือน',
    pending: 'รอดำเนินการ',
    cameraList: 'รายการกล้องที่เปิดใช้งาน',
    cameraListDesc: 'สถานะการเชื่อมต่อกล้องที่เปิดใช้งาน',
    online: 'ออนไลน์',
    offline: 'ออฟไลน์',
    gpsMap: 'GPS กล้อง',
    gpsMapDesc: 'ตำแหน่งอุปกรณ์แบบเรียลไทม์',
    viewMap: 'ดูแผนที่',
    close: 'ปิด',
    onlineDevices: 'อุปกรณ์ออนไลน์',
    trackingStatus: 'กำลังติดตาม',
    accuracy: 'ความแม่นยำ',
    highPrecision: 'ความแม่นยำสูง',
    lastUpdate: 'อัพเดทล่าสุด',
    updateTimeUnit: 'วิ',
    updateAgo: 'ที่แล้ว',
    speed: 'ความเร็ว',
    speedUnit: 'กม./ชม.',
    updatedAt: 'อัพเดท',
    justNow: 'เมื่อสักครู่',
    trackBtn: 'ติดตาม',
    detailsBtn: 'รายละเอียด',
    alertsSection: 'การแจ้งเตือนระบบ',
    alertsSectionDesc: 'รายการแจ้งเตือนสถานะอุปกรณ์ล่าสุด',
    startDate: 'วันที่เริ่มต้น',
    startTime: 'เวลาเริ่มต้น',
    endDate: 'วันที่สิ้นสุด',
    endTime: 'เวลาสิ้นสุด',
    showingResults: 'แสดงผล',
    ofTotal: 'จาก',
    items: 'รายการ',
    clearFilter: 'ล้างตัวกรอง',
    noAlertsFound: 'ไม่พบรายการแจ้งเตือน',
    tryAdjustFilter: 'ลองปรับเปลี่ยนตัวกรองเพื่อดูรายการอื่น',
    type: 'ประเภท',
    officer: 'เจ้าหน้าที่',
    time: 'เวลา',
    timeUnit: 'น.',
    alertDetails: 'รายละเอียดการแจ้งเตือน',
    liveFeed: 'ภาพสดจากกล้อง',
    playVideo: 'เล่นวิดีโอ',
    download: 'ดาวน์โหลด',
    gpsInfo: 'ข้อมูลพิกัด GPS',
    coordinates: 'พิกัด',
    address: 'ที่อยู่',
    distance: 'ระยะทาง',
    actionCompleted: 'รับทราบแล้ว',
    sendOfficer: 'ส่งเจ้าหน้าที่',
    emergency: 'ประสานงานด่วน',
    addressValue: 'ถนนสุขุมวิท กรุงเทพมหานคร',
    distanceValue: '1.2 กม. จากศูนย์ควบคุม',
    sos_panic: 'กดปุ่มฉุกเฉิน (SOS)',
    connection_lost: 'สัญญาณเน็ตหลุด',
    battery_low: 'แบตเตอรี่ต่ำ',
    storage_full: 'พื้นที่จัดเก็บเต็ม',
    page: 'หน้า',
    of: 'จาก',
    prev: 'ก่อนหน้า',
    next: 'ถัดไป',
    devices: 'อุปกรณ์',
  },
  en: {
    onlineCameras: 'Online Cameras',
    totalCameras: 'All cameras that are enabled.',
    gpsDevices: 'GPS Devices',
    tracking: 'Tracking Active',
    alerts: 'System Alerts',
    pending: 'Pending Action',
    cameraList: 'Camera List',
    cameraListDesc: 'Recent camera connection status',
    online: 'Online',
    offline: 'Offline',
    gpsMap: 'GPS Map',
    gpsMapDesc: 'Real-time device locations',
    viewMap: 'View Map',
    close: 'Close',
    onlineDevices: 'Online Devices',
    trackingStatus: 'Tracking',
    accuracy: 'Accuracy',
    highPrecision: 'High Precision',
    lastUpdate: 'Last Update',
    updateTimeUnit: 's',
    updateAgo: 'ago',
    speed: 'Speed',
    speedUnit: 'km/h',
    updatedAt: 'Updated',
    justNow: 'Just now',
    trackBtn: 'Track',
    detailsBtn: 'Details',
    alertsSection: 'System Alerts',
    alertsSectionDesc: 'Recent device status notifications',
    startDate: 'Start Date',
    startTime: 'Start Time',
    endDate: 'End Date',
    endTime: 'End Time',
    showingResults: 'Showing',
    ofTotal: 'of',
    items: 'items',
    clearFilter: 'Clear Filters',
    noAlertsFound: 'No alerts found',
    tryAdjustFilter: 'Try adjusting the filters to see other items',
    type: 'Type',
    officer: 'Officer',
    time: 'Time',
    timeUnit: '',
    alertDetails: 'Alert Details',
    liveFeed: 'Live Camera Feed',
    playVideo: 'Play Video',
    download: 'Download',
    gpsInfo: 'GPS Information',
    coordinates: 'Coordinates',
    address: 'Address',
    distance: 'Distance',
    actionCompleted: 'Acknowledged',
    sendOfficer: 'Dispatch Officer',
    emergency: 'Emergency Dispatch',
    addressValue: 'Sukhumvit Rd, Bangkok',
    distanceValue: '1.2 km from command center',
    sos_panic: 'SOS Button Pressed',
    connection_lost: 'Connection Lost',
    battery_low: 'Low Battery',
    storage_full: 'Storage Full',
    page: 'Page',
    of: 'of',
    prev: 'Prev',
    next: 'Next',
    devices: 'devices',
  }
};