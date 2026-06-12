import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import { Login } from '../pages/Login';
import { useAppStore } from '../stores/appStore';
import { AppProviders } from './AppProviders';
import { AuthenticatedLayout } from './layout/AuthenticatedLayout';
import { AppRoutes } from './routes';

const AppContent = () => {
  const { isAuthenticated, isLoading, logout } = useAuth();
  const language = useAppStore((state) => state.language);
  const setLanguage = useAppStore((state) => state.setLanguage);
  const darkMode = useAppStore((state) => state.darkMode);
  const setDarkMode = useAppStore((state) => state.setDarkMode);

  useEffect(() => {
    const handleForceLogout = () => {
      logout();
    };
    window.addEventListener('auth:logout', handleForceLogout);
    return () => window.removeEventListener('auth:logout', handleForceLogout);
  }, [logout]);

  if (isLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#0c274b] border-t-transparent rounded-full animate-spin"></div>
          <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
            {language === 'th' ? 'กำลังตรวจสอบสิทธิ์...' : 'Checking authentication...'}
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Login
        language={language}
        setLanguage={setLanguage}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />
    );
  }

  return (
    <BrowserRouter>
      <AuthenticatedLayout>
        <AppRoutes />
      </AuthenticatedLayout>
    </BrowserRouter>
  );
};

export default function App() {
  return (
    <AppProviders>
      <AppContent />
    </AppProviders>
  );
}
