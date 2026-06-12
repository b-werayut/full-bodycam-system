import { type ReactNode } from 'react';
import { Toaster } from 'sonner';
import { useAuth } from '../../contexts/useAuth';
import { useEventLogNotifications } from '../../features/notifications/hooks/useEventLogNotifications';
import { useSessionTimeout } from '../../features/notifications/hooks/useSessionTimeout';
import { Footer } from '../../components/layout/Footer';
import { Header } from '../../components/layout/Header';
import { useAppStore } from '../../stores/appStore';

interface AuthenticatedLayoutProps {
  children: ReactNode;
}

export const AuthenticatedLayout = ({ children }: AuthenticatedLayoutProps) => {
  const { logout } = useAuth();
  const language = useAppStore((state) => state.language);
  const setLanguage = useAppStore((state) => state.setLanguage);
  const darkMode = useAppStore((state) => state.darkMode);
  const setDarkMode = useAppStore((state) => state.setDarkMode);

  useSessionTimeout({ enabled: true, language, onTimeout: logout });
  useEventLogNotifications({ enabled: true, darkMode });

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <Header
        language={language}
        setLanguage={setLanguage}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        onLogout={logout}
      />

      <main className="flex-1 p-6 max-w-1600px w-full mx-auto relative">
        {children}
      </main>

      <Footer language={language} darkMode={darkMode} />

      <Toaster
        closeButton={false}
        duration={6500}
        gap={10}
        offset={18}
        position="bottom-right"
        toastOptions={{
          unstyled: true,
        }}
      />

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out forwards;
        }
        @keyframes notificationToastIn {
          from { opacity: 0; transform: translate3d(20px, 14px, 0) scale(0.98); }
          to { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
        }
        @keyframes notificationToastPing {
          0% { transform: scale(0.8); opacity: 0.9; }
          70% { transform: scale(1.9); opacity: 0; }
          100% { transform: scale(1.9); opacity: 0; }
        }
        .notification-toast-card {
          animation: notificationToastIn 220ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .notification-toast-ping {
          animation: notificationToastPing 1.4s cubic-bezier(0.16, 1, 0.3, 1) infinite;
        }
      `}</style>
    </div>
  );
};
