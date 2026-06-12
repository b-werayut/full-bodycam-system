export type VideoLibraryLanguage = 'th' | 'en';

export interface VideoLibraryTranslationData {
  title: string;
  listTitle: string;
  videoArchive: string;
  totalVideos: string;
  completedVideos: string;
  emergencyVideos: string;
  archivedVideos: string;
  filters: string;
  refresh: string;
  loadingVideos: string;
  filterDate: string;
  filterOfficer: string;
  filterSpotCheck: string;
  filterEvent: string;
  searchPlaceholder: string;
  search: string;
  reset: string;
  tableNo: string;
  tableCode: string;
  tableTitle: string;
  tableOfficer: string;
  tableStatus: string;
  tableActions: string;
  play: string;
  archive: string;
  archived: string;
  download: string;
  close: string;
  aiAlert: string;
  normal: string;
  allOfficers: string;
  allSpotChecks: string;
  allEvents: string;
  videoDetails: string;
  location: string;
  dateTime: string;
  duration: string;
  itemsPerPage: string;
  showing: string;
  of: string;
  items: string;
  to: string;
  startDate: string;
  endDate: string;
  noData: string;
  noDataMessage: string;
  additionalInfo: string;
  mission: string;
  time: string;
  usageLog: string;
  viewedBy: string;
  sendCase: string;
  backToMain: string;
  showingAllItems: string;
  videoPlayerScreen: string;
  videoTimeline: string;
  start: string;
  middle: string;
  end: string;
  recordingInfo: string;
  recordingDate: string;
  startTime: string;
  totalDuration: string;
  fileSize: string;
  playbackTitle: string;
  deviceCode: string;
  channelId: string;
  selectStartTime: string;
  selectEndTime: string;
  requestPlayback: string;
  loadingPlayback: string;
  playbackError: string;
  noPlaybackData: string;
}

export const videoLibraryTranslations: Record<VideoLibraryLanguage, VideoLibraryTranslationData> = {
  th: { 
    title: 'คลังวิดีโอ', 
    listTitle: 'รายการวิดีโอ', 
    videoArchive: 'ค้นหา ตรวจสอบ และเปิดดูวิดีโอย้อนหลังจากภารกิจที่เสร็จสิ้น',
    totalVideos: 'วิดีโอทั้งหมด',
    completedVideos: 'ภารกิจปกติ',
    emergencyVideos: 'ภารกิจฉุกเฉิน',
    archivedVideos: 'จัดเก็บแล้ว',
    filters: 'ตัวกรอง',
    refresh: 'รีเฟรช',
    loadingVideos: 'กำลังโหลดวิดีโอ...',
    filterDate: 'วันที่', 
    filterOfficer: 'เจ้าหน้าที่', 
    filterSpotCheck: 'Spot Check', 
    filterEvent: 'เหตุการณ์', 
    searchPlaceholder: 'ค้นหา รหัส, เจ้าหน้าที่, สถานที่...', 
    search: 'ค้นหา', 
    reset: 'รีเซ็ต', 
    tableNo: 'ลำดับ', 
    tableCode: 'รหัส', 
    tableTitle: 'รายการ', 
    tableOfficer: 'เจ้าหน้าที่', 
    tableStatus: 'สถานะ', 
    tableActions: 'เครื่องมือ', 
    play: 'เล่น', 
    archive: 'จัดเก็บ', 
    archived: 'จัดเก็บแล้ว', 
    download: 'ดาวน์โหลด', 
    close: 'ปิด', 
    aiAlert: 'เตือนจาก AI', 
    normal: 'ปกติ', 
    allOfficers: 'ทั้งหมด', 
    allSpotChecks: 'ทั้งหมด', 
    allEvents: 'ทั้งหมด', 
    videoDetails: 'รายละเอียดวิดีโอ', 
    location: 'สถานที่', 
    dateTime: 'วันที่-เวลา', 
    duration: 'ระยะเวลา', 
    itemsPerPage: 'แสดงต่อหน้า', 
    showing: 'แสดง', 
    of: 'จาก', 
    items: 'รายการ', 
    to: 'ถึง', 
    startDate: 'วันที่เริ่มต้น', 
    endDate: 'วันที่สิ้นสุด', 
    noData: 'ไม่พบข้อมูล', 
    noDataMessage: 'ไม่พบข้อมูลที่ตรงกับการค้นหา กรุณาลองใหม่อีกครั้ง', 
    additionalInfo: 'ข้อมูลกำกับ', 
    mission: 'ภารกิจ', 
    time: 'เวลา', 
    usageLog: 'บันทึกการใช้งาน', 
    viewedBy: 'เปิดดูโดย', 
    sendCase: 'ส่งออก', 
    backToMain: 'ปิด',
    showingAllItems: 'แสดงข้อมูลทั้งหมด',
    videoPlayerScreen: 'หน้าจอเล่นวิดีโอ',
    videoTimeline: 'ไทม์ไลน์วิดีโอ',
    start: 'เริ่มต้น',
    middle: 'กลางวิดีโอ',
    end: 'สิ้นสุด',
    recordingInfo: 'ข้อมูลการบันทึก',
    recordingDate: 'วันที่บันทึก',
    startTime: 'เวลาเริ่มต้น',
    totalDuration: 'ระยะเวลาทั้งหมด',
    fileSize: 'ขนาดไฟล์',
    playbackTitle: 'ดูวิดีโอย้อนหลัง',
    deviceCode: 'รหัสอุปกรณ์',
    channelId: 'รหัสช่อง',
    selectStartTime: 'เวลาเริ่มต้น',
    selectEndTime: 'เวลาสิ้นสุด',
    requestPlayback: 'ดูวิดีโอ',
    loadingPlayback: 'กำลังโหลด...',
    playbackError: 'เกิดข้อผิดพลาดในการโหลดวิดีโอ',
    noPlaybackData: 'ไม่พบข้อมูลวิดีโอในช่วงเวลาที่เลือก',
  },
  en: { 
    title: 'Video Library', 
    listTitle: 'Video List', 
    videoArchive: 'Search, review, and play recorded videos from completed missions.',
    totalVideos: 'Total Videos',
    completedVideos: 'Completed',
    emergencyVideos: 'Emergency',
    archivedVideos: 'Archived',
    filters: 'Filters',
    refresh: 'Refresh',
    loadingVideos: 'Loading videos...',
    filterDate: 'Date', 
    filterOfficer: 'Officer', 
    filterSpotCheck: 'Spot Check', 
    filterEvent: 'Event', 
    searchPlaceholder: 'Search code, officer, location...', 
    search: 'Search', 
    reset: 'Reset', 
    tableNo: 'No.', 
    tableCode: 'Code', 
    tableTitle: 'Title', 
    tableOfficer: 'Officer', 
    tableStatus: 'Status', 
    tableActions: 'Actions', 
    play: 'Play', 
    archive: 'Archive', 
    archived: 'Archived', 
    download: 'Download', 
    close: 'Close', 
    aiAlert: 'AI Alert', 
    normal: 'Normal', 
    allOfficers: 'All', 
    allSpotChecks: 'All', 
    allEvents: 'All', 
    videoDetails: 'Video Details', 
    location: 'Location', 
    dateTime: 'Date-Time', 
    duration: 'Duration', 
    itemsPerPage: 'Items per page', 
    showing: 'Showing', 
    of: 'of', 
    items: 'items', 
    to: 'to', 
    startDate: 'Start Date', 
    endDate: 'End Date', 
    noData: 'No Data', 
    noDataMessage: 'No data found matching your search, please try again.', 
    additionalInfo: 'Additional Information', 
    mission: 'Mission', 
    time: 'Time', 
    usageLog: 'Usage Log', 
    viewedBy: 'Viewed by', 
    sendCase: 'Send Case', 
    backToMain: 'Back to Main',
    showingAllItems: 'Showing',
    videoPlayerScreen: 'Video Player Screen',
    videoTimeline: 'Video Timeline',
    start: 'Start',
    middle: 'Middle',
    end: 'End',
    recordingInfo: 'Recording Information',
    recordingDate: 'Recording Date',
    startTime: 'Start Time',
    totalDuration: 'Total Duration',
    fileSize: 'File Size',
    playbackTitle: 'Video Playback',
    deviceCode: 'Device Code',
    channelId: 'Channel ID',
    selectStartTime: 'Start Time',
    selectEndTime: 'End Time',
    requestPlayback: 'Watch Video',
    loadingPlayback: 'Loading...',
    playbackError: 'Error loading video',
    noPlaybackData: 'No video found for selected time range',
  },
};
