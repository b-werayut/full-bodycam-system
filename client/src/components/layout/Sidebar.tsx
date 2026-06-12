import { 
  Camera, Globe, User, LogOut, X, 
  LayoutDashboard, Activity, FileText, Video, FileVideo, Users 
} from 'lucide-react';
import { translations, type Language } from '../../locales/translations';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/useAuth';
import { canAccessUserManagement } from '../../lib/permissions';
import { getUserDisplayName, getUserRoleName } from '../../lib/userDisplay';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  darkMode: boolean;
  onLogout: () => void;
}

export function Sidebar({ 
  isOpen, onClose, language, setLanguage, darkMode, onLogout 
}: SidebarProps) {
  
  const t = translations[language];
  const location = useLocation();
  const { user } = useAuth();
  const userDisplayName = getUserDisplayName(user);
  const userRoleName = getUserRoleName(user, language);

  const navItems = [
    { path: '/dashboard', label: t.dashboard, icon: LayoutDashboard },
    { path: '/activities', label: t.activities, icon: Activity },
    { path: '/reports', label: t.reports, icon: FileText },
    { path: '/live', label: t.live, icon: Video },
    { path: '/videos', label: t.videos, icon: FileVideo },
    ...(canAccessUserManagement(user) ? [{ path: '/users', label: t.users, icon: Users }] : []),
  ];

  if (!isOpen) return null;

  return (
    <div className="lg:hidden fixed inset-0 z-50 flex">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" 
        onClick={onClose}
      ></div>

      {/* ตัว Sidebar panel */}
      <div className={`relative w-80 max-w-[85vw] h-full shadow-2xl flex flex-col animate-in slide-in-from-left duration-300 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        
        {/* ส่วนหัว Sidebar */}
        <div className="p-6 border-b bg-linear-to-r from-[#fcd500] to-[#fed300] shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#0c274b] rounded-xl flex items-center justify-center">
                <Camera className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-[#0c274b] font-bold text-lg leading-tight">Body Worn Camera</h2>
                <p className="text-[#0c274b]/70 text-xs">Control System</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 bg-white/20 hover:bg-white/40 rounded-xl transition-all cursor-pointer">
              <X className="w-5 h-5 text-[#0c274b]" />
            </button>
          </div>
        </div>

        {/* รายการเมนู */}
        <div className="p-4 space-y-2 flex-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            // เช็คความ Active จาก URL
            const isActive = location.pathname.startsWith(item.path);
            
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose} // ปิดเมนูมือถือเวลาเลือกเสร็จ
                className={`w-full flex items-center gap-3 px-5 py-4 rounded-xl font-medium transition-all text-left cursor-pointer ${
                  isActive
                    ? 'bg-linear-to-r from-emerald-500 to-teal-500 text-white shadow-lg'
                    : darkMode
                      ? 'text-gray-300 hover:bg-gray-700'
                      : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="flex-1">{item.label}</span>
                {isActive && <div className="w-2 h-2 bg-white rounded-full"></div>}
              </Link>
            );
          })}

          <div className={`my-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}></div>

          {/* การตั้งค่าเพิ่มเติม (เปลี่ยนภาษา / โปรไฟล์ / ออกจากระบบ) */}
          <div className="space-y-2 pb-4">
            <button
              onClick={() => setLanguage(language === 'th' ? 'en' : 'th')}
              className={`w-full flex items-center gap-3 px-5 py-4 rounded-xl font-medium transition-all text-left cursor-pointer ${
                darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Globe className="w-5 h-5" />
              <span className="flex-1">{language === 'th' ? 'ภาษา' : 'Language'}</span>
              <span className={`px-3 py-1 rounded-lg text-sm font-bold ${
                darkMode ? 'bg-gray-700 text-white' : 'bg-gray-200 text-[#0c274b]'
              }`}>
                {language.toUpperCase()}
              </span>
            </button>

            <div className={`w-full flex items-center gap-3 px-5 py-4 rounded-xl ${
              darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
            }`}>
              <User className="w-5 h-5" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{userDisplayName}</p>
                <p className={`truncate text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{userRoleName}</p>
              </div>
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            </div>

            <button
              onClick={() => {
                onLogout();
                onClose();
              }}
              className="w-full flex items-center gap-3 px-5 py-4 rounded-xl font-medium transition-all text-left bg-linear-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 shadow-lg hover:shadow-xl cursor-pointer"
            >
              <LogOut className="w-5 h-5" />
              <span className="flex-1">{t.logout}</span>
            </button>
          </div>
        </div>

        {/* ลิขสิทธิ์ด้านล่างสุด */}
        <div className={`p-4 border-t text-center shrink-0 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
          <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {t.copyright}
          </p>
        </div>

      </div>
    </div>
  );
}
