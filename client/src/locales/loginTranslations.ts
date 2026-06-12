export type Language = 'th' | 'en';

export interface LoginTranslationData {
  appName: string;
  appSubtitle: string;
  username: string;
  usernamePlaceholder: string;
  password: string;
  passwordPlaceholder: string;
  errorTitle: string;
  errorInvalid: string;
  errorDisabled: string;
  errorServer: string;
  login: string;
  forgotPassword: string;
  copyright: string;
  resetPasswordTitle: string;
  resetPasswordMessage: string;
  usernameOrEmail: string;
  newPassword: string;
  confirmPassword: string;
  cancel: string;
  resetPassword: string;
}

export const loginTranslations: Record<Language, LoginTranslationData> = {
  th: {
    appName: 'Body Worn Camera', 
    appSubtitle: 'Control System',
    
    username: 'ชื่อผู้ใช้งาน',
    usernamePlaceholder: 'กรอกชื่อผู้ใช้งาน',
    password: 'รหัสผ่าน',
    passwordPlaceholder: 'กรอกรหัสผ่าน',
    errorTitle: 'ไม่สามารถเข้าสู่ระบบได้',
    errorInvalid: 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง',
    errorDisabled: 'บัญชีนี้ถูกระงับการใช้งาน',
    errorServer: 'ระบบไม่สามารถตรวจสอบข้อมูลเข้าสู่ระบบได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง',
    login: 'เข้าสู่ระบบ',
    forgotPassword: 'ลืมรหัสผ่าน?',
    copyright: '© 2026 Centre Cities. All rights reserved.',
    resetPasswordTitle: 'รีเซ็ตรหัสผ่าน',
    resetPasswordMessage: 'กรุณากรอกข้อมูลด้านล่างเพื่อรีเซ็ตรหัสผ่านของคุณ',
    usernameOrEmail: 'ชื่อผู้ใช้งาน หรือ อีเมล',
    newPassword: 'รหัสผ่านใหม่',
    confirmPassword: 'ยืนยันรหัสผ่านใหม่',
    cancel: 'ยกเลิก',
    resetPassword: 'รีเซ็ตรหัสผ่าน'
  },
  en: {
    appName: 'Body Worn Camera',
    appSubtitle: 'Control System',
    
    username: 'Username',
    usernamePlaceholder: 'Enter your username',
    password: 'Password',
    passwordPlaceholder: 'Enter your password',
    errorTitle: 'Login Failed',
    errorInvalid: 'Invalid username or password',
    errorDisabled: 'This account has been disabled',
    errorServer: 'Unable to verify your login right now. Please try again.',
    login: 'Sign In',
    forgotPassword: 'Forgot Password?',
    copyright: '© 2026 Centre Cities. All rights reserved.',
    resetPasswordTitle: 'Reset Password',
    resetPasswordMessage: 'Please enter your details below to reset your password.',
    usernameOrEmail: 'Username or Email',
    newPassword: 'New Password',
    confirmPassword: 'Confirm New Password',
    cancel: 'Cancel',
    resetPassword: 'Reset Password'
  }
};
