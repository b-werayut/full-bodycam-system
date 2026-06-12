import { useState, useEffect } from 'react';
import { 
  Bell, Sun, Moon, LogOut, KeyRound,
  Menu, X, AlertCircle, Clock, ChevronDown,
  LayoutDashboard, Activity, FileText, Video, FileVideo, Users, ClipboardList, CheckCircle2, CircleDot, LoaderCircle
} from 'lucide-react';
import Swal from 'sweetalert2';
import camLogo from '../../assets/cam-logo.png';
import { translations, type Language } from '../../locales/translations';
import { Sidebar } from './Sidebar';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/useAuth';
import { canAccessUserManagement } from '../../lib/permissions';
import { getUserDisplayName, getUserRoleName } from '../../lib/userDisplay';
import { ChangePasswordModal } from '../modals/ChangePasswordModal';
import { getEventLogs, markEventLogRead } from '../../services/eventLogService';
import { changeCurrentUserPassword } from '../../services/userService';

interface ApiErrorLike {
  response?: {
    status?: number;
    data?: {
      message?: unknown;
    };
  };
  message?: unknown;
}

interface HeaderProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  darkMode: boolean;
  setDarkMode: (mode: boolean) => void;
  onLogout: () => void;
}

interface NotificationItem {
  id: number;
  typeKey: string;
  officer?: string;
  time?: string | null;
  date?: string | null;
  severity?: string;
  location?: string;
  details?: string;
  isRead?: boolean | null;
  deviceName?: string;
  deviceCode?: string;
  mission?: {
    missionId: number;
    reportId?: string | null;
    missionName?: string | null;
    missionStatus?: string | null;
  } | null;
}

const getSeverityTone = (severity?: string, darkMode?: boolean) => {
  const normalized = severity?.toLowerCase();

  if (normalized === 'high' || normalized === 'critical') {
    return {
      icon: darkMode ? 'bg-red-500/15 text-red-300' : 'bg-red-50 text-red-600',
      badge: darkMode ? 'bg-red-500/20 text-red-200' : 'bg-red-100 text-red-700',
    };
  }

  if (normalized === 'low' || normalized === 'info') {
    return {
      icon: darkMode ? 'bg-blue-500/15 text-blue-300' : 'bg-blue-50 text-blue-600',
      badge: darkMode ? 'bg-blue-500/20 text-blue-200' : 'bg-blue-100 text-blue-700',
    };
  }

  return {
    icon: darkMode ? 'bg-amber-500/15 text-amber-300' : 'bg-amber-50 text-amber-600',
    badge: darkMode ? 'bg-amber-500/20 text-amber-200' : 'bg-amber-100 text-amber-700',
  };
};

export function Header({ 
  language, setLanguage, darkMode, setDarkMode, onLogout 
}: HeaderProps) {
  
  const t = translations[language];
  const location = useLocation();
  const { user } = useAuth();
  const userDisplayName = getUserDisplayName(user);
  const userRoleName = getUserRoleName(user, language);
  const readLabel = language === 'th' ? 'อ่านแล้ว' : 'Read';
  const unreadLabel = language === 'th' ? 'ยังไม่อ่าน' : 'Unread';
  
  // States สำหรับเปิด-ปิดเมนูต่างๆ ใน Header
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // อัปเดตเวลาทุกวินาที
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 🚀 เปลี่ยนจาก id เป็น path เพื่อใช้กับ URL
  const navItems = [
    { path: '/dashboard', label: t.dashboard, icon: LayoutDashboard },
    { path: '/activities', label: t.activities, icon: Activity },
    { path: '/reports', label: t.reports, icon: FileText },
    { path: '/live', label: t.live, icon: Video },
    { path: '/videos', label: t.videos, icon: FileVideo },
    ...(canAccessUserManagement(user) ? [{ path: '/users', label: t.users, icon: Users }] : []),
  ];

  const alerts = notifications.slice(0, 4);
  const unreadCount = Math.min(notifications.filter((alert) => alert.isRead !== true).length, 99);

  const getNotificationTarget = (alert: NotificationItem) => {
    if (!alert.mission) {
      return '/dashboard#event-alerts';
    }

    const params = new URLSearchParams();
    if (alert.mission.reportId) {
      params.set('reportId', alert.mission.reportId);
    } else if (alert.mission.missionId) {
      params.set('missionId', String(alert.mission.missionId));
    }

    return params.toString() ? `/activities?${params.toString()}` : '/dashboard#event-alerts';
  };

  const handleNotificationOpen = (alert: NotificationItem) => {
    setShowNotifications(false);

    if (alert.isRead === true) {
      return;
    }

    setNotifications((prev) =>
      prev.map((item) => (item.id === alert.id ? { ...item, isRead: true } : item)),
    );
    window.dispatchEvent(new CustomEvent('eventlog:read', { detail: { id: alert.id } }));
    void markEventLogRead(alert.id).catch((error) => {
      console.error('Failed to mark notification read from header:', error);
    });
  };

  const getPasswordMessage = (thai: string, english: string) => (language === 'th' ? thai : english);

  const handleChangePassword = async (currentPassword: string, newPassword: string) => {
    try {
      await changeCurrentUserPassword(currentPassword, newPassword);
      setShowChangePasswordModal(false);
      await Swal.fire({
        icon: 'success',
        title: `<span style="color: #0c274b;">${getPasswordMessage('เปลี่ยนรหัสผ่านสำเร็จ!', 'Password Changed Successfully!')}</span>`,
        html: `
          <div style="text-align: center; padding: 10px;">
            <p style="font-size: 16px; color: #374151; margin-bottom: 8px;">
              <strong>${t.username}:</strong> ${user?.username ?? userDisplayName}
            </p>
            <p style="font-size: 14px; color: #6b7280;">
              ${getPasswordMessage('รหัสผ่านใหม่ถูกบันทึกเรียบร้อยแล้ว', 'Your new password has been saved.')}
            </p>
          </div>
        `,
        confirmButtonText: getPasswordMessage('ตกลง', 'OK'),
        confirmButtonColor: '#22c55e',
        background: '#ffffff',
      });
    } catch (error: unknown) {
      const apiError = error as ApiErrorLike;
      const status = apiError.response?.status;
      const responseMessage = String(apiError.response?.data?.message || '').toLowerCase();

      if (status === 401 || responseMessage.includes('current password')) {
        throw new Error(getPasswordMessage('รหัสผ่านเดิมไม่ถูกต้อง', 'Current password is incorrect.'));
      }

      throw new Error(getPasswordMessage('ไม่สามารถเปลี่ยนรหัสผ่านได้', 'Failed to change password.'));
    }
  };

  useEffect(() => {
    const fetchNotifications = async () => {
      setNotificationsLoading(true);
      try {
        setNotifications(await getEventLogs({ limit: 50 }));
      } catch (error) {
        console.error('Failed to fetch header notifications:', error);
      } finally {
        setNotificationsLoading(false);
      }
    };

    fetchNotifications();
  }, []);

  useEffect(() => {
    const handleEventLogNotification = (event: Event) => {
      const customEvent = event as CustomEvent<NotificationItem[]>;
      const incoming = Array.isArray(customEvent.detail) ? customEvent.detail : [];

      if (incoming.length === 0) {
        return;
      }

      setNotifications((prev) => {
        const byId = new Map<number, NotificationItem>();

        [...incoming, ...prev].forEach((item) => {
          if (item.id && !byId.has(item.id)) {
            byId.set(item.id, item);
          }
        });

        return Array.from(byId.values())
          .sort((a, b) => b.id - a.id)
          .slice(0, 50);
      });
    };

    window.addEventListener('eventlog:notification', handleEventLogNotification);
    return () => window.removeEventListener('eventlog:notification', handleEventLogNotification);
  }, []);

  useEffect(() => {
    const handleEventLogRead = (event: Event) => {
      const customEvent = event as CustomEvent<{ id?: number }>;
      const id = customEvent.detail?.id;

      if (!id) {
        return;
      }

      setNotifications((prev) =>
        prev.map((item) => (item.id === id ? { ...item, isRead: true } : item)),
      );
    };

    window.addEventListener('eventlog:read', handleEventLogRead);
    return () => window.removeEventListener('eventlog:read', handleEventLogRead);
  }, []);

  // ปิดเมนูเมื่อคลิกข้างนอก
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (showNotifications && !target.closest('[data-notification-panel]') && !target.closest('[data-notification-button]')) {
        setShowNotifications(false);
      }
      if (showUserMenu && !target.closest('[data-user-panel]') && !target.closest('[data-user-button]')) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifications, showUserMenu]);

  return (
    <>
      <header className={`sticky top-0 z-40 ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'} border-b`}>
        <div className="px-4 lg:px-8 h-16 flex items-center justify-between gap-6">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 shrink-0">
            <img src={camLogo} alt="Bodycam Logo" className="w-10 h-10 object-contain" />
            <span className={`text-lg font-semibold tracking-tight ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Bodycam
            </span>
          </div>

          {/* Desktop Navigation - Center */}
          <nav className={`hidden lg:flex items-center gap-0.5 px-1.5 py-1.5 rounded-full ${darkMode ? 'bg-gray-800/60' : 'bg-gray-100/80'}`}>
            {navItems.map((item) => {
              const isActive = location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-4 py-1.5 text-sm font-medium rounded-full transition-all duration-200 ${
                    isActive
                      ? 'bg-[#2563EB] text-white shadow-sm'
                      : darkMode
                        ? 'text-gray-400 hover:text-white'
                        : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-1">

            {/* Notification Button */}
            <div className="relative">
              <button 
                data-notification-button
                onClick={(e) => { e.stopPropagation(); setShowNotifications(!showNotifications); }}
                className={`h-9 w-9 flex items-center justify-center rounded-full transition-colors ${darkMode ? 'bg-gray-800 text-gray-300 hover:text-white' : 'bg-gray-100 text-gray-600 hover:text-gray-900'}`}
              >
                <Bell className="w-[18px] h-[18px]" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1.5 flex items-center justify-center rounded-full text-[11px] font-medium bg-red-500 text-white leading-none">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Panel */}
              {showNotifications && (
                <div data-notification-panel className={`absolute right-0 top-full mt-3 w-[calc(100vw-1.5rem)] sm:w-96 rounded-2xl shadow-2xl border z-50 max-h-[85vh] sm:max-h-[600px] overflow-hidden ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                  <div className={`p-4 border-b ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-100 bg-gray-50'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bell className={`w-5 h-5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                        <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{t.notificationTitle}</h3>
                      </div>
                      <button onClick={() => setShowNotifications(false)} className={`p-1.5 rounded-lg transition-colors ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}>
                        <X className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                      </button>
                    </div>
                  </div>
                  <div className={`divide-y overflow-y-auto max-h-[400px] ${darkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
                    {notificationsLoading ? (
                      <div className="px-5 py-10 text-center">
                        <div className={`mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-lg ring-1 ${darkMode ? 'bg-gray-700 text-[#fcd500] ring-gray-600' : 'bg-gray-50 text-[#0c274b] ring-gray-200'}`}>
                          <LoaderCircle className="h-5 w-5 animate-spin" />
                        </div>
                        <p className={`text-sm font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                          {language === 'th' ? 'กำลังโหลดการแจ้งเตือน...' : 'Loading notifications...'}
                        </p>
                      </div>
                    ) : alerts.length === 0 ? (
                      <div className="px-5 py-10 text-center">
                        <div className={`mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-lg ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-500'}`}>
                          <Bell className="h-5 w-5" />
                        </div>
                        <p className={`text-sm font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                          {language === 'th' ? 'ยังไม่มีการแจ้งเตือน' : 'No notifications yet'}
                        </p>
                      </div>
                    ) : (
                      alerts.map((alert) => {
                        const tone = getSeverityTone(alert.severity, darkMode);

                        return (
                          <Link
                            key={alert.id}
                            to={getNotificationTarget(alert)}
                            onClick={() => handleNotificationOpen(alert)}
                            className={`block p-4 transition-all cursor-pointer ${alert.isRead === true ? darkMode ? 'opacity-70 hover:bg-gray-700' : 'opacity-75 hover:bg-gray-50' : darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'}`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`p-2 rounded-lg shrink-0 ${tone.icon}`}>
                                <AlertCircle className="w-5 h-5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1 gap-3">
                                  <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${tone.badge}`}>
                                    {t[alert.typeKey as keyof typeof t] || alert.typeKey}
                                  </span>
                                  <span
                                    title={alert.isRead === true ? readLabel : unreadLabel}
                                    aria-label={alert.isRead === true ? readLabel : unreadLabel}
                                    className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full ring-1 ${alert.isRead === true ? darkMode ? 'bg-gray-700 text-emerald-300 ring-gray-600' : 'bg-emerald-50 text-emerald-600 ring-emerald-100' : darkMode ? 'bg-[#fcd500] text-[#0c274b] ring-[#fcd500]/40' : 'bg-[#0c274b] text-[#fcd500] ring-[#0c274b]/10'}`}
                                  >
                                    {alert.isRead === true ? <CheckCircle2 className="h-3.5 w-3.5" /> : <CircleDot className="h-3.5 w-3.5" />}
                                  </span>
                                  <div className="flex items-center gap-1 text-xs text-gray-500 shrink-0">
                                    <Clock className="w-3 h-3" /> {[alert.date, alert.time].filter(Boolean).join(' ') || '--:--'}
                                  </div>
                                </div>
                                <p className={`text-sm font-bold truncate ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                  {alert.officer || (language === 'th' ? 'ระบบ' : 'System')}
                                </p>
                                <p className={`text-xs mt-1 line-clamp-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                  {alert.details || alert.location || '-'}
                                </p>
                                {alert.mission && (
                                  <div className={`mt-2 inline-flex max-w-full items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-bold ${darkMode ? 'bg-cyan-500/15 text-cyan-200' : 'bg-cyan-50 text-cyan-800'}`}>
                                    <ClipboardList className="h-3.5 w-3.5 shrink-0" />
                                    <span className="truncate">
                                      {language === 'th' ? 'ใบงาน' : 'Mission'} #{alert.mission.missionId}
                                      {alert.mission.reportId ? ` (${alert.mission.reportId})` : ''}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </Link>
                        );
                      })
                    )}
                  </div>
                  <div className={`p-3 border-t text-center ${darkMode ? 'bg-gray-700/50 border-gray-700' : 'bg-gray-50 border-gray-100'}`}>
                    <Link 
                      to="/dashboard#event-alerts" 
                      onClick={() => setShowNotifications(false)} 
                      className="block w-full text-blue-600 text-sm font-medium hover:text-blue-700 transition-colors"
                    >
                      {language === 'th' ? 'ดูการแจ้งเตือนทั้งหมด' : 'View All Notifications'}
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Realtime Clock */}
            <div className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
              <span className={`text-sm font-medium tabular-nums ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {currentTime.toLocaleTimeString(language === 'th' ? 'th-TH' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {currentTime.toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US', { day: 'numeric', month: 'short' })}
              </span>
            </div>

            {/* Language Slide Toggle */}
            <button
              type="button"
              onClick={() => setLanguage(language === 'th' ? 'en' : 'th')}
              className={`relative w-14 h-8 rounded-full transition-colors duration-300 ${darkMode ? 'bg-gray-800' : 'bg-gray-200'}`}
              title={language === 'th' ? 'Switch to English' : 'เปลี่ยนเป็นภาษาไทย'}
              aria-label={language === 'th' ? 'Switch to English' : 'เปลี่ยนเป็นภาษาไทย'}
            >
              <span className={`absolute inset-y-0 ${language === 'th' ? 'right-0' : 'left-0'} w-7 flex items-center justify-center text-[10px] font-bold uppercase leading-none tracking-wide ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                {language === 'th' ? 'en' : 'th'}
              </span>
              <div className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-md flex items-center justify-center transition-all duration-300 ${language === 'th' ? 'left-1' : 'left-7'}`}>
                <span className="text-[10px] font-bold uppercase leading-none tracking-wide text-[#2563EB]">
                  {language}
                </span>
              </div>
            </button>

            {/* Dark Mode Slide Toggle */}
            <button 
              onClick={() => setDarkMode(!darkMode)} 
              className={`relative w-14 h-8 rounded-full transition-colors duration-300 ${darkMode ? 'bg-blue-600' : 'bg-gray-200'}`}
              title={darkMode ? 'Light Mode' : 'Dark Mode'}
            >
              <div className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-md flex items-center justify-center transition-all duration-300 ${darkMode ? 'left-7' : 'left-1'}`}>
                {darkMode ? (
                  <Moon className="w-3.5 h-3.5 text-blue-600" />
                ) : (
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                )}
              </div>
            </button>

            {/* Divider */}
            <div className={`hidden sm:block w-px h-6 mx-2 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />

            {/* User Profile with Dropdown */}
            <div className="relative hidden sm:block">
              <button
                data-user-button
                onClick={(e) => { e.stopPropagation(); setShowUserMenu(!showUserMenu); }}
                className={`flex items-center gap-2.5 pl-1 pr-3 py-1 rounded-full transition-colors group ${
                  darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
                }`}
                title={`${userDisplayName} (${userRoleName})`}
              >
                <div className="w-8 h-8 rounded-full bg-[#2563EB] flex items-center justify-center text-white text-sm font-medium">
                  {userDisplayName.charAt(0).toUpperCase()}
                </div>
                <div className="hidden lg:flex flex-col items-start text-left">
                  <span className={`text-sm font-medium leading-tight ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {userDisplayName}
                  </span>
                  <span className={`text-xs leading-tight ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {userRoleName}
                  </span>
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''} ${darkMode ? 'text-gray-500' : 'text-gray-400'} group-hover:text-gray-600`} />
              </button>

              {/* User Dropdown Menu */}
              {showUserMenu && (
                <div 
                  data-user-panel
                  className={`absolute right-0 top-full mt-2 w-56 rounded-xl shadow-lg border py-1.5 z-50 ${
                    darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                  }`}
                >
                  <div className={`px-4 py-3 border-b ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                    <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{userDisplayName}</p>
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{userRoleName}</p>
                  </div>
                  <div className="py-1">
                    <button
                      onClick={() => { setShowUserMenu(false); setShowChangePasswordModal(true); }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                        darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <KeyRound className="w-4 h-4" />
                      <span>{t.changePassword}</span>
                    </button>
                  </div>
                  <div className={`border-t ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                    <button
                      onClick={() => { setShowUserMenu(false); onLogout(); }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                        darkMode ? 'text-red-400 hover:bg-gray-700' : 'text-red-600 hover:bg-red-50'
                      }`}
                    >
                      <LogOut className="w-4 h-4" />
                      <span>{t.logout}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button 
              onClick={() => setShowMobileMenu(true)} 
              className={`lg:hidden h-9 w-9 flex items-center justify-center rounded-full transition-colors ${darkMode ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <Sidebar 
        isOpen={showMobileMenu} 
        onClose={() => setShowMobileMenu(false)} 
        language={language}
        setLanguage={setLanguage}
        darkMode={darkMode}
        onLogout={onLogout}
      />

      {showChangePasswordModal && (
        <ChangePasswordModal
          username={user?.username ?? userDisplayName}
          language={language}
          darkMode={darkMode}
          onClose={() => setShowChangePasswordModal(false)}
          onSave={handleChangePassword}
        />
      )}

    </>
  );
}
