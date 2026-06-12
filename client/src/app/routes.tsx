import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import { canAccessUserManagement } from '../lib/permissions';
import { useAppStore } from '../stores/appStore';
import { RouteLoading } from './layout/RouteLoading';
import { UnderConstruction } from './layout/UnderConstruction';

const Dashboard = lazy(() => import('../pages/Dashboard').then((module) => ({ default: module.Dashboard })));
const SpotCheck = lazy(() => import('../pages/SpotCheck').then((module) => ({ default: module.SpotCheck })));
const Reports = lazy(() => import('../pages/Reports').then((module) => ({ default: module.Reports })));
const LiveFeed = lazy(() => import('../pages/LiveFeed').then((module) => ({ default: module.LiveFeed })));
const VideoLibrary = lazy(() => import('../pages/VideoLibrary').then((module) => ({ default: module.VideoLibrary })));
const UserManagement = lazy(() => import('../pages/UserManagement').then((module) => ({ default: module.UserManagement })));

const NotificationNavigationBridge = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleOpenNotifications = () => {
      navigate('/dashboard#event-alerts');

      window.setTimeout(() => {
        window.dispatchEvent(new Event('eventlog:scroll-to-table'));
      }, 80);
    };

    window.addEventListener('eventlog:open-notifications', handleOpenNotifications);
    return () => window.removeEventListener('eventlog:open-notifications', handleOpenNotifications);
  }, [navigate]);

  return null;
};

export const AppRoutes = () => {
  const { user } = useAuth();
  const language = useAppStore((state) => state.language);
  const darkMode = useAppStore((state) => state.darkMode);

  return (
    <>
      <NotificationNavigationBridge />
      <Suspense fallback={<RouteLoading language={language} darkMode={darkMode} />}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard language={language} darkMode={darkMode} />} />
          <Route path="/activities" element={<SpotCheck language={language} darkMode={darkMode} />} />
          <Route path="/reports" element={<Reports language={language} darkMode={darkMode} />} />
          <Route path="/live" element={<LiveFeed language={language} darkMode={darkMode} />} />
          <Route path="/videos" element={<VideoLibrary language={language} darkMode={darkMode} />} />
          <Route
            path="/users"
            element={
              canAccessUserManagement(user)
                ? <UserManagement language={language} darkMode={darkMode} />
                : <Navigate to="/dashboard" replace />
            }
          />
          <Route path="*" element={<UnderConstruction language={language} darkMode={darkMode} />} />
        </Routes>
      </Suspense>
    </>
  );
};
