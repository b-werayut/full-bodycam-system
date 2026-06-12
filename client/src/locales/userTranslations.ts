export type UserLanguage = 'th' | 'en';

export interface UserTranslationData {
  [key: string]: string;
  title: string;
  subtitle: string;
  listTitle: string;
  addUser: string;
  totalUsers: string;
  activeUsers: string;
  inactiveUsers: string;
  filteredUsers: string;
  userDirectory: string;
  search: string;
  filterByRole: string;
  filterByStatus: string;
  reset: string;
  tableNo: string;
  tableUsername: string;
  tableName: string;
  tableRole: string;
  tableStatus: string;
  tableActions: string;
  edit: string;
  resetPassword: string;
  resetPasswordMessage: string;
  newPassword: string;
  confirmPassword: string;
  passwordMinLength: string;
  passwordMismatch: string;
  saving: string;
  active: string;
  inactive: string;
  allRoles: string;
  allStatuses: string;
  roleHigh: string;
  roleMedium: string;
  roleLow: string;
  searchPlaceholder: string;
  showingItems: string;
  items: string;
  itemsPerPage: string;
  previous: string;
  next: string;
  noData: string;
  showing: string;
  to: string;
  of: string;
  editUser: string;
  username: string;
  fullName: string;
  password: string;
  role: string;
  roleUser: string;
  roleSuperAdmin: string;
  roleAdmin: string;
  roleOfficer: string;
  roleSupervisor: string;
  roleManager: string;
  roleViewer: string;
  department: string;
  security: string;
  securityHigh: string;
  securityMedium: string;
  securityNormal: string;
  securityLow: string;
  permissions: string;
  permDashboard: string;
  permActivities: string;
  permLive: string;
  permVideo: string;
  permReports: string;
  permUsers: string;
  save: string;
  cancel: string;
  backToMain: string;
  delete: string;
  deleteConfirmTitle: string;
  deleteConfirmMessage: string;
  confirmDelete: string;
  alertCreateSuccess: string;
  alertCreateSuccessDesc: string;
  alertUpdateSuccess: string;
  alertUpdateSuccessDesc: string;
  alertDeleteSuccess: string;
  alertDeleteSuccessDesc: string;
  alertResetPasswordSuccess: string;
  alertResetPasswordSuccessDesc: string;
  alertResetPasswordError: string;
  alertError: string;
  alertConfirm: string;
  usernameExists: string;
  usernameFormatError: string;
  passwordFormatError: string;
  showPassword: string;
  hidePassword: string;
}

export const userTranslations: Record<UserLanguage, UserTranslationData> = {
  th: { 
    title: 'ผู้ใช้งาน', 
    subtitle: 'จัดการผู้ใช้งาน (User Management)', 
    listTitle: 'รายการผู้ใช้งาน', 
    addUser: 'เพิ่มผู้ใช้งาน', 
    totalUsers: 'ผู้ใช้ทั้งหมด',
    activeUsers: 'กำลังใช้งาน',
    inactiveUsers: 'ระงับใช้งาน',
    filteredUsers: 'ตรงกับเงื่อนไข',
    userDirectory: 'จัดการบัญชีผู้ใช้งาน สิทธิ์ และสถานะการเข้าใช้งานระบบ',
    search: 'ค้นหา', 
    filterByRole: 'ระดับสิทธิ์',
    filterByStatus: 'สถานะ', 
    reset: 'รีเซ็ต', 
    tableNo: 'No.', 
    tableUsername: 'ชื่อผู้ใช้', 
    tableName: 'ชื่อ-สกุล', 
    tableRole: 'ระดับสิทธิ์ (Role)', 
    tableStatus: 'สถานะ', 
    tableActions: 'เครื่องมือ', 
    edit: 'แก้ไข', 
    resetPassword: 'รีเซ็ตรหัสผ่าน',
    resetPasswordMessage: 'กรอกรหัสผ่านใหม่และยืนยันรหัสผ่านสำหรับผู้ใช้งานนี้',
    newPassword: 'รหัสผ่านใหม่',
    confirmPassword: 'ยืนยันรหัสผ่าน',
    passwordMinLength: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร',
    passwordMismatch: 'รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน',
    saving: 'กำลังบันทึก...',
    active: 'ใช้งาน', 
    inactive: 'ระงับการใช้งาน',
    allRoles: 'ทั้งหมด', 
    allStatuses: 'ทั้งหมด', 
    roleHigh: 'สูงสุด', 
    roleMedium: 'สูง', 
    roleLow: 'ปกติ', 
    searchPlaceholder: 'ค้นหาชื่อผู้ใช้หรือนามสกุล...', 
    showingItems: 'แสดงข้อมูลทั้งหมด', 
    items: 'รายการ', 
    itemsPerPage: 'แสดงต่อหน้า', 
    previous: 'ก่อนหน้า', 
    next: 'ถัดไป',
    noData: 'ไม่พบข้อมูลผู้ใช้งาน',
    showing: 'แสดง',
    to: 'ถึง',
    of: 'จาก',
    editUser: 'แก้ไขผู้ใช้งาน',
    username: 'ชื่อผู้ใช้ Username (อย่างน้อย 3 ตัวอักษร)', 
    fullName: 'ชื่อ-นามสกุล',
    password: 'รหัสผ่าน Password (อย่างน้อย 6 ตัวอักษร)',
    role: 'บทบาท (Role)',
    roleUser: 'ผู้ใช้งาน',
    roleSuperAdmin: 'ผู้ดูแลระบบสูงสุด',
    roleAdmin: 'ผู้ดูแลระบบ',
    roleOfficer: 'เจ้าหน้าที่',
    roleSupervisor: 'หัวหน้างาน',
    roleManager: 'ผู้จัดการ',
    roleViewer: 'ผู้ชม',
    department: 'หน่วยงาน / สังกัด',
    security: 'ระดับความลับ',
    securityHigh: 'สูง',
    securityMedium: 'ปานกลาง',
    securityNormal: 'ปกติ',
    securityLow: 'ต่ำ',
    permissions: 'สิทธิ์การเข้าถึงระบบ',
    permDashboard: 'Dashboard',
    permActivities: 'จัดการภารกิจ',
    permLive: 'Live',
    permVideo: 'คลังวีดีโอ',
    permReports: 'รายงาน',
    permUsers: 'ผู้ใช้งาน',
    save: 'บันทึก',
    cancel: 'ยกเลิก',
    backToMain: 'กลับหน้าหลัก', 
    delete: 'ลบผู้ใช้งาน',
    deleteConfirmTitle: 'ยืนยันการลบผู้ใช้งาน',
    deleteConfirmMessage: 'คุณแน่ใจหรือไม่ที่จะลบผู้ใช้งานนี้? การดำเนินการนี้ไม่สามารถย้อนกลับได้',
    confirmDelete: 'ยืนยันการลบ',
    alertCreateSuccess: 'สร้างผู้ใช้งานสำเร็จ!',
    alertCreateSuccessDesc: 'ผู้ใช้งานใหม่ถูกเพิ่มเข้าสู่ระบบเรียบร้อยแล้ว',
    alertUpdateSuccess: 'แก้ไขข้อมูลสำเร็จ!',
    alertUpdateSuccessDesc: 'ข้อมูลผู้ใช้งานถูกอัปเดตเรียบร้อยแล้ว',
    alertDeleteSuccess: 'ลบผู้ใช้งานสำเร็จ!',
    alertDeleteSuccessDesc: 'ผู้ใช้งานถูกลบออกจากระบบเรียบร้อยแล้ว',
    alertResetPasswordSuccess: 'รีเซ็ตรหัสผ่านสำเร็จ!',
    alertResetPasswordSuccessDesc: 'รหัสผ่านใหม่ถูกบันทึกเรียบร้อยแล้ว',
    alertResetPasswordError: 'ไม่สามารถรีเซ็ตรหัสผ่านได้',
    alertError: 'เกิดข้อผิดพลาด!',
    alertConfirm: 'ตกลง',
    usernameExists: 'ชื่อผู้ใช้นี้มีอยู่ในระบบแล้ว',
    usernameFormatError: 'ชื่อผู้ใช้ใช้ได้เฉพาะตัวอักษรอังกฤษ A-Z/a-z และตัวเลข 0-9 เท่านั้น',
    passwordFormatError: 'รหัสผ่านใช้ได้เฉพาะตัวอักษรอังกฤษ A-Z/a-z และตัวเลข 0-9 เท่านั้น',
    showPassword: 'แสดงรหัสผ่าน',
    hidePassword: 'ซ่อนรหัสผ่าน',
  },
  en: { 
    title: 'Users', 
    subtitle: 'User Management', 
    listTitle: 'User List', 
    addUser: 'Add User', 
    totalUsers: 'Total Users',
    activeUsers: 'Active',
    inactiveUsers: 'Inactive',
    filteredUsers: 'Filtered',
    userDirectory: 'Manage user accounts, permissions, and access status.',
    search: 'Search', 
    filterByRole: 'Role', 
    filterByStatus: 'Status', 
    reset: 'Reset', 
    tableNo: 'No.', 
    tableUsername: 'Username', 
    tableName: 'Full Name', 
    tableRole: 'Role', 
    tableStatus: 'Status', 
    tableActions: 'Actions', 
    edit: 'Edit', 
    resetPassword: 'Reset Password',
    resetPasswordMessage: 'Enter and confirm a new password for this user.',
    newPassword: 'New Password',
    confirmPassword: 'Confirm Password',
    passwordMinLength: 'Password must be at least 6 characters.',
    passwordMismatch: 'Password and confirmation do not match.',
    saving: 'Saving...',
    active: 'Active', 
    inactive: 'Inactive', 
    allRoles: 'All', 
    allStatuses: 'All', 
    roleHigh: 'High', 
    roleMedium: 'Medium', 
    roleLow: 'Low', 
    searchPlaceholder: 'Search username or name...', 
    showingItems: 'Showing', 
    items: 'items', 
    itemsPerPage: 'Items per page', 
    previous: 'Previous', 
    next: 'Next',
    noData: 'No users found',
    showing: 'Showing',
    to: 'to',
    of: 'of',
    editUser: 'Edit User',
    username: 'Username (at least 3 characters)',
    fullName: 'Full Name',
    password: 'Password (at least 6 characters)',
    role: 'Role',
    roleUser: 'User',
    roleSuperAdmin: 'SuperAdmin',
    roleAdmin: 'Admin',
    roleOfficer: 'Officer',
    roleSupervisor: 'Supervisor',
    roleManager: 'Manager',
    roleViewer: 'Viewer',
    department: 'Department',
    security: 'Security Level',
    securityHigh: 'High',
    securityMedium: 'Medium',
    securityNormal: 'Normal',
    securityLow: 'Low',
    permissions: 'System Access Permissions',
    permDashboard: 'Dashboard',
    permActivities: 'Activities',
    permLive: 'Live',
    permVideo: 'Video Library',
    permReports: 'Reports',
    permUsers: 'Users',
    save: 'Save',
    cancel: 'Cancel',
    backToMain: 'Back to Main',
    delete: 'Delete User',
    deleteConfirmTitle: 'Confirm Delete',
    deleteConfirmMessage: 'Are you sure you want to delete this user? This action cannot be undone.',
    confirmDelete: 'Confirm Delete',
    alertCreateSuccess: 'User Created Successfully!',
    alertCreateSuccessDesc: 'New user has been added to the system.',
    alertUpdateSuccess: 'User Updated Successfully!',
    alertUpdateSuccessDesc: 'User information has been updated.',
    alertDeleteSuccess: 'User Deleted Successfully!',
    alertDeleteSuccessDesc: 'User has been removed from the system.',
    alertResetPasswordSuccess: 'Password Reset Successfully!',
    alertResetPasswordSuccessDesc: 'The new password has been saved.',
    alertResetPasswordError: 'Failed to reset password.',
    alertError: 'Error Occurred!',
    alertConfirm: 'OK',
    usernameExists: 'This username already exists',
    usernameFormatError: 'Username can use only English letters A-Z/a-z and numbers 0-9.',
    passwordFormatError: 'Password can use only English letters A-Z/a-z and numbers 0-9.',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
  },
};
