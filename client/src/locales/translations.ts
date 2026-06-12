export type Language = 'th' | 'en';

export interface TranslationData {
  [key: string]: string;
  appName: string;
  appSubtitle: string;
  username: string;
  password: string;
  usernamePlaceholder: string;
  passwordPlaceholder: string;
  login: string;
  forgotPassword: string;
  errorTitle: string;
  errorInvalid: string;
  errorDisabled: string;
  copyright: string;
  dashboard: string;
  activities: string;
  live: string;
  videos: string;
  reports: string;
  users: string;
  notifications: string;
  admin: string;
  onlineCameras: string;
  totalCameras: string;
  gpsDevices: string;
  tracking: string;
  alerts: string;
  pending: string;
  cameraList: string;
  cameraListDesc: string;
  gpsMap: string;
  gpsMapDesc: string;
  alertsSection: string;
  alertsSectionDesc: string;
  viewMap: string;
  viewDetails: string;
  online: string;
  offline: string;
  notificationTitle: string;
  newItems: string;
  today: string;
  close: string;
  officer: string;
  alertDetails: string;
  type: string;
  time: string;
  liveFeed: string;
  playVideo: string;
  download: string;
  gpsInfo: string;
  coordinates: string;
  address: string;
  addressValue: string;
  distance: string;
  distanceValue: string;
  actionCompleted: string;
  sendOfficer: string;
  emergency: string;
  developmentPage: string;
  logout: string;
  changePassword: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  savePassword: string;
  cancel: string;
  resetPassword: string;
  resetPasswordTitle: string;
  resetPasswordMessage: string;
  usernameOrEmail: string;
  sendResetLink: string;
  categoryReport: string;
  categoryEvent: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  clearFilter: string;
  showingResults: string;
  ofTotal: string;
  items: string;
  sos_panic: string;
  connection_lost: string;
  battery_low: string;
  storage_full: string;
}

export const translations: Record<Language, TranslationData> = {
  th: {
    appName: 'Body Worn Camera',
    appSubtitle: 'Control System',
    username: 'ชื่อผู้ใช้งาน',
    password: 'รหัสผ่าน',
    usernamePlaceholder: 'กรอกชื่อผู้ใช้งาน',
    passwordPlaceholder: 'กรอกรหัสผ่าน',
    login: 'เข้าสู่ระบบ',
    forgotPassword: 'ลืมรหัสผ่าน?',
    errorTitle: 'ไม่สามารถเข้าสู่ระบบได้',
    errorInvalid: '• ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง',
    errorDisabled: '• บัญชีของคุณถูกระงับการใช้งาน',
    copyright: '© 2026 Network Link Co.,Ltd.',
    dashboard: 'แดชบอร์ด',
    activities: 'จัดการภารกิจ',
    live: 'ภาพสด',
    videos: 'คลังวิดีโอ',
    reports: 'รายงาน',
    users: 'ผู้ใช้งาน',
    notifications: 'แจ้งเตือน',
    admin: 'ผู้ดูแลระบบ',
    onlineCameras: 'กล้อง Online',
    totalCameras: 'จาก 3 กล้อง',
    gpsDevices: 'อุปกรณ์ GPS',
    tracking: 'กำลังติดตาม',
    alerts: 'แจ้งเตือน',
    pending: 'รอดำเนินการ',
    cameraList: 'รายการกล้อง / เจ้าหน้าที่',
    cameraListDesc: 'ตรวจสอบสถานะกล้องทั้งหมด',
    gpsMap: 'แผนที่ตำแหน่ง GPS RT',
    gpsMapDesc: 'ติดตามตำแหน่งแบบเรียลไทม์',
    alertsSection: 'แจ้งเตือน / เหตุการณ์',
    alertsSectionDesc: 'การแจ้งเตือนจากระบบ',
    viewMap: 'ดูแผนที่',
    viewDetails: 'เรียกดู',
    online: 'Online',
    offline: 'Offline',
    notificationTitle: 'รายการแจ้งเตือนระบบ',
    newItems: 'รายการใหม่',
    today: 'วันนี้',
    close: 'ปิด',
    officer: 'เจ้าหน้าที่',
    alertDetails: 'รายละเอียดแจ้งเตือน',
    type: 'ประเภท',
    time: 'เวลา',
    liveFeed: 'กล้อง Body Camera - Live Feed',
    playVideo: 'เล่นวิดีโอ',
    download: 'ดาวน์โหลด',
    gpsInfo: 'ข้อมูลตำแหน่ง GPS',
    coordinates: 'พิกัด',
    address: 'ที่อยู่',
    addressValue: 'ถนนสุขุมวิท แขวงคลองเตย กรุงเทพมหานคร',
    distance: 'ระยะทาง',
    distanceValue: '2.3 กม. จากสถานีตำรวจ',
    actionCompleted: 'รับทราบแล้ว',
    sendOfficer: 'ส่งเจ้าหน้าที่',
    emergency: 'แจ้งเหตุฉุกเฉิน',
    developmentPage: 'หน้านี้กำลังอยู่ระหว่างการพัฒนา',
    logout: 'ออกจากระบบ',
    changePassword: 'เปลี่ยนรหัสผ่าน',
    currentPassword: 'รหัสผ่านปัจจุบัน',
    newPassword: 'รหัสผ่านใหม่',
    confirmPassword: 'ยืนยันรหัสผ่านใหม่',
    savePassword: 'บันทึกรหัสผ่าน',
    cancel: 'ยกเลิก',
    resetPassword: 'รีเซ็ตรหัสผ่าน',
    resetPasswordTitle: 'รีเซ็ตรหัสผ่าน',
    resetPasswordMessage: 'กรอกชื่อผู้ใช้งานและรหัสผ่านใหม่เพื่อรีเซ็ตรหัสผ่าน',
    usernameOrEmail: 'ชื่อผู้ใช้งาน',
    sendResetLink: 'ส่งลิงก์รีเซ็ต',
    categoryReport: 'รายงาน',
    categoryEvent: 'เหตุการณ์',
    startDate: 'วันที่เริ่มต้น',
    endDate: 'วันที่สิ้นสุด',
    startTime: 'เวลาเริ่มต้น',
    endTime: 'เวลาสิ้นสุด',
    clearFilter: 'ล้างตัวกรอง',
    showingResults: 'แสดง',
    ofTotal: 'จากทั้งหมด',
    items: 'รายการ',
    sos_panic: 'กดปุ่มฉุกเฉิน (SOS)',
    connection_lost: 'สัญญาณเน็ตหลุด',
    battery_low: 'แบตเตอรี่ต่ำ',
    storage_full: 'พื้นที่จัดเก็บเต็ม',
  },
  en: {
    appName: 'Body Worn Camera',
    appSubtitle: 'Control System',
    username: 'Username',
    password: 'Password',
    usernamePlaceholder: 'Enter username',
    passwordPlaceholder: 'Enter password',
    login: 'Login',
    forgotPassword: 'Forgot Password?',
    errorTitle: 'Login Failed',
    errorInvalid: '• Invalid username or password',
    errorDisabled: '• Account disabled',
    copyright: '© 2026 Network Link Co.,Ltd.',
    dashboard: 'Dashboard',
    activities: 'Activities',
    live: 'Live Feed',
    videos: 'Video Library',
    reports: 'Reports',
    users: 'Users',
    notifications: 'Notifications',
    admin: 'Admin',
    onlineCameras: 'Online Cameras',
    totalCameras: 'of 3 cameras',
    gpsDevices: 'GPS Devices',
    tracking: 'Tracking',
    alerts: 'System Alerts',
    pending: 'Pending',
    cameraList: 'Camera / Officer List',
    cameraListDesc: 'Monitor all camera status',
    gpsMap: 'GPS Location Map RT',
    gpsMapDesc: 'Real-time location tracking',
    alertsSection: 'Alerts / Events',
    alertsSectionDesc: 'System notifications',
    viewMap: 'View Map',
    viewDetails: 'View',
    online: 'Online',
    offline: 'Offline',
    notificationTitle: 'System Alerts',
    newItems: 'new items',
    today: 'Today',
    close: 'Close',
    officer: 'Officer',
    alertDetails: 'Alert Details',
    type: 'Type',
    time: 'Time',
    liveFeed: 'Body Camera - Live Feed',
    playVideo: 'Play Video',
    download: 'Download',
    gpsInfo: 'GPS Location Info',
    coordinates: 'Coordinates',
    address: 'Address',
    addressValue: 'Sukhumvit Road, Khlong Toei, Bangkok',
    distance: 'Distance',
    distanceValue: '2.3 km from Police Station',
    actionCompleted: 'Acknowledged',
    sendOfficer: 'Dispatch Officer',
    emergency: 'Emergency Alert',
    developmentPage: 'This page is under development',
    logout: 'Logout',
    changePassword: 'Change Password',
    currentPassword: 'Current Password',
    newPassword: 'New Password',
    confirmPassword: 'Confirm New Password',
    savePassword: 'Save Password',
    cancel: 'Cancel',
    resetPassword: 'Reset Password',
    resetPasswordTitle: 'Reset Password',
    resetPasswordMessage: 'Enter your username and new password to reset your password',
    usernameOrEmail: 'Username',
    sendResetLink: 'Send Reset Link',
    categoryReport: 'Report',
    categoryEvent: 'Event',
    startDate: 'Start Date',
    endDate: 'End Date',
    startTime: 'Start Time',
    endTime: 'End Time',
    clearFilter: 'Clear Filter',
    showingResults: 'Showing',
    ofTotal: 'of',
    items: 'items',
    sos_panic: 'SOS Pressed',
    connection_lost: 'Connection Lost',
    battery_low: 'Low Battery',
    storage_full: 'Storage Full',
  },
};