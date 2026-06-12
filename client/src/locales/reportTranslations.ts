export type ReportLanguage = 'th' | 'en';

export interface ReportTranslationData {
  [key: string]: string;
  title: string;
  listTitle: string;
  reportArchive: string;
  totalReports: string;
  completedReports: string;
  unassignedReports: string;
  totalDuration: string;
  filters: string;
  loadingReports: string;
  errorTitle: string;
  filterDate: string;
  filterOfficer: string;
  filterMission: string;
  filterStatus: string;
  search: string;
  reset: string;
  tableNo: string;
  tableCode: string;
  tableDate: string;
  tableOfficer: string;
  tableMission: string;
  tableUsageTime: string;
  tableStatus: string;
  tableActions: string;
  tableDescription: string;
  tableDuration: string;
  tableLocation: string;
  viewDetails: string;
  exportPDF: string;
  exportExcel: string;
  passed: string;
  failed: string;
  allOfficers: string;
  allStatuses: string;
  startDate: string;
  endDate: string;
  missionPlaceholder: string;
  showing: string;
  to: string;
  of: string;
  items: string;
  itemsPerPage: string;
  noData: string;
  noDataMessage: string;
  delete: string;
  moreActions: string;
  showingAll: string;
  itemsTotal: string;
  unassigned: string;
  assignActivity: string;
  na: string;
  
  // เพิ่มคำแปลสำหรับ Modal รายละเอียดและการลบ
  unknownLocation: string;
  modalTitle: string;
  reportNumber: string;
  date: string;
  officer: string;
  mission: string;
  startRecordTime: string;
  endTime: string;
  recordedDuration: string;
  usageLog: string;
  openedBy: string;
  at: string;
  export: string;
  videoPlayer: string;
  thumbnail: string;
  location: string;
  deleteConfirmTitle: string;
  deleteConfirmMsg: string;
  deleteReportNo: string;
  deleteCancel: string;
  deleteConfirmBtn: string;
  deleteWarning: string;
}

export const reportTranslations: Record<ReportLanguage, ReportTranslationData> = {
  th: {
    title: 'รายงาน', 
    listTitle: 'รายการรายงาน', 
    reportArchive: 'ค้นหา ตรวจสอบ และส่งออกรายงานวิดีโอจากกล้องประจำตัว',
    totalReports: 'รายงานทั้งหมด',
    completedReports: 'ผูกภารกิจแล้ว',
    unassignedReports: 'รอผูกภารกิจ',
    totalDuration: 'เวลารวม',
    filters: 'ตัวกรอง',
    loadingReports: 'กำลังโหลดรายงาน...',
    errorTitle: 'ไม่สามารถโหลดรายงานได้',
    filterDate: 'วันที่', 
    filterOfficer: 'เจ้าหน้าที่', 
    filterMission: 'ภารกิจ', 
    filterStatus: 'สถานะ', 
    search: 'ค้นหา', 
    reset: 'รีเซ็ต', 
    tableNo: 'No.', 
    tableCode: 'เลขที่', 
    tableDate: 'วันที่', 
    tableOfficer: 'เจ้าหน้าที่', 
    tableMission: 'ภารกิจ', 
    tableUsageTime: 'เวลาที่ใช้งาน', 
    tableStatus: 'สถานะ', 
    tableActions: 'เครื่องมือ', 
    tableDescription: 'รายละเอียด',
    tableDuration: 'ระยะเวลา',
    tableLocation: 'สถานที่',
    viewDetails: 'ดูรายละเอียด', 
    exportPDF: 'Export PDF', 
    exportExcel: 'Export Excel', 
    passed: 'ผ่าน', 
    failed: 'ไม่ผ่าน', 
    allOfficers: 'ทั้งหมด', 
    allStatuses: 'ทั้งหมด', 
    startDate: 'วันที่เริ่มต้น', 
    endDate: 'วันที่สิ้นสุด', 
    missionPlaceholder: 'ค้นหาภารกิจ...', 
    showing: 'แสดง', 
    to: 'ถึง', 
    of: 'จาก', 
    items: 'รายการ', 
    itemsPerPage: 'แสดงต่อหน้า', 
    noData: 'ไม่พบข้อมูล', 
    noDataMessage: 'ไม่พบข้อมูลที่ตรงกับการค้นหา กรุณาลองใหม่อีกครั้ง', 
    delete: 'ลบ', 
    moreActions: 'เพิ่มเติม',
    showingAll: 'แสดงข้อมูลทั้งหมด',
    itemsTotal: 'รายการ',
    unassigned: 'เหตุฉุกเฉิน (รอผูกแผนงาน)',
    assignActivity: '+ ผูกแผนงาน',
    na: 'ไม่มีข้อมูล',

    // Modal
    unknownLocation: 'ไม่ทราบพิกัด (GPS Offline)',
    modalTitle: 'รายละเอียดรายงานวิดีโอ',
    reportNumber: 'รหัสอ้างอิง',
    date: 'วันที่',
    officer: 'เจ้าหน้าที่',
    mission: 'ชื่อภารกิจ',
    startRecordTime: 'เวลาเริ่มบันทึก',
    endTime: 'เวลาสิ้นสุด',
    recordedDuration: 'ระยะเวลาทั้งหมด',
    usageLog: 'บันทึกการใช้งาน (การเปิดดู)',
    openedBy: 'เปิดโดย',
    at: 'เวลา',
    export: 'ส่งออกรายงาน',
    videoPlayer: 'ตัวเล่นวิดีโอ',
    thumbnail: 'รูปภาพ',
    location: 'สถานที่',
    deleteConfirmTitle: 'ยืนยันการลบ',
    deleteConfirmMsg: 'คุณแน่ใจหรือไม่ว่าต้องการลบรายงานนี้?',
    deleteReportNo: 'รหัสอ้างอิง:',
    deleteCancel: 'ยกเลิก',
    deleteConfirmBtn: 'ยืนยันลบ',
    deleteWarning: 'การดำเนินการนี้ไม่สามารถย้อนคืนได้ ข้อมูลวิดีโอที่เกี่ยวข้องอาจถูกระงับการเข้าถึง'
  },
  en: {
    title: 'Reports', 
    listTitle: 'Report List', 
    reportArchive: 'Search, review, and export bodycam video reports.',
    totalReports: 'Total Reports',
    completedReports: 'Assigned',
    unassignedReports: 'Unassigned',
    totalDuration: 'Total Duration',
    filters: 'Filters',
    loadingReports: 'Loading reports...',
    errorTitle: 'Unable to load reports',
    filterDate: 'Date', 
    filterOfficer: 'Officer', 
    filterMission: 'Mission', 
    filterStatus: 'Spot-Check Status', 
    search: 'Search', 
    reset: 'Reset', 
    tableNo: 'No.', 
    tableCode: 'Code', 
    tableDate: 'Date', 
    tableOfficer: 'Officer', 
    tableMission: 'Mission', 
    tableUsageTime: 'Usage Time', 
    tableStatus: 'Status', 
    tableActions: 'Actions', 
    tableDescription: 'Description',
    tableDuration: 'Duration',
    tableLocation: 'Location',
    viewDetails: 'View Details', 
    exportPDF: 'Export PDF', 
    exportExcel: 'Export Excel', 
    passed: 'Passed', 
    failed: 'Failed', 
    allOfficers: 'All', 
    allStatuses: 'All', 
    startDate: 'Start Date', 
    endDate: 'End Date', 
    missionPlaceholder: 'Search mission...', 
    showing: 'Showing', 
    to: 'to', 
    of: 'of', 
    items: 'items', 
    itemsPerPage: 'Items per page', 
    noData: 'No Data', 
    noDataMessage: 'No data found matching your search, please try again.', 
    delete: 'Delete', 
    moreActions: 'More Actions',
    showingAll: 'Showing',
    itemsTotal: 'items',
    unassigned: 'Emergency (Unassigned)',
    assignActivity: '+ Assign Activity',
    na: 'N/A',

    // Modal
    unknownLocation: 'Unknown Location (GPS Offline)',
    modalTitle: 'Video Record Details',
    reportNumber: 'Reference ID',
    date: 'Date',
    officer: 'Officer',
    mission: 'Mission Name',
    startRecordTime: 'Start Time',
    endTime: 'End Time',
    recordedDuration: 'Total Duration',
    usageLog: 'Viewing Log',
    openedBy: 'Viewed by',
    at: 'at',
    export: 'Export Report',
    videoPlayer: 'Video Player',
    thumbnail: 'Thumbnail',
    location: 'Location',
    deleteConfirmTitle: 'Confirm Delete',
    deleteConfirmMsg: 'Are you sure you want to delete this report?',
    deleteReportNo: 'Reference ID:',
    deleteCancel: 'Cancel',
    deleteConfirmBtn: 'Delete',
    deleteWarning: 'This action cannot be undone. Associated video records may become inaccessible.'
  }
};
