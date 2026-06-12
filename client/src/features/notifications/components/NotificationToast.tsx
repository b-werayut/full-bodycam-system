import { AlertTriangle, BellRing, Clock, MapPin, X } from 'lucide-react';
import type { EventLogNotification } from '../types';

const getNotificationTone = (severity?: string) => {
  const normalized = severity?.toLowerCase();

  if (normalized === 'high' || normalized === 'critical') {
    return {
      icon: AlertTriangle,
      accentClass: 'bg-red-500',
      glowClass: 'shadow-red-500/20',
      iconClass: 'bg-red-50 text-red-600 ring-red-100',
      badgeClass: 'bg-red-50 text-red-700 ring-red-100',
      pulseClass: 'bg-red-500',
      label: 'High',
    };
  }

  if (normalized === 'medium' || normalized === 'warning') {
    return {
      icon: AlertTriangle,
      accentClass: 'bg-amber-500',
      glowClass: 'shadow-amber-500/20',
      iconClass: 'bg-amber-50 text-amber-600 ring-amber-100',
      badgeClass: 'bg-amber-50 text-amber-700 ring-amber-100',
      pulseClass: 'bg-amber-500',
      label: 'Warning',
    };
  }

  return {
    icon: BellRing,
    accentClass: 'bg-blue-500',
    glowClass: 'shadow-blue-500/20',
    iconClass: 'bg-blue-50 text-blue-600 ring-blue-100',
    badgeClass: 'bg-blue-50 text-blue-700 ring-blue-100',
    pulseClass: 'bg-blue-500',
    label: severity || 'Info',
  };
};

interface NotificationToastProps {
  notification: EventLogNotification;
  darkMode: boolean;
  onClose: () => void;
  onOpen: () => void;
}

export const NotificationToast = ({ notification, darkMode, onClose, onOpen }: NotificationToastProps) => {
  const tone = getNotificationTone(notification.severity);
  const Icon = tone.icon;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen();
        }
      }}
      className={`notification-toast-card w-[min(calc(100vw-1.5rem),440px)] overflow-hidden rounded-lg border shadow-2xl ${tone.glowClass} ${
        darkMode
          ? 'border-gray-700 bg-gray-900 text-gray-100 shadow-black/40'
          : 'border-gray-200 bg-white text-gray-900 shadow-gray-950/10'
      } cursor-pointer transition-transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[#fcd500] focus:ring-offset-2 ${
        darkMode ? 'focus:ring-offset-gray-950' : 'focus:ring-offset-white'
      }`}
      aria-label="Open notification table"
    >
      <div className={`h-1.5 w-full ${tone.accentClass}`} />
      <div className={`px-4 py-2 text-xs font-bold ${darkMode ? 'bg-gray-950/70 text-gray-300' : 'bg-[#0c274b] text-[#fcd500]'}`}>
        SYSTEM NOTIFICATION
      </div>
      <div className="flex gap-3 p-4">
        <div className={`relative mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ring-1 ${tone.iconClass}`}>
          <span className={`notification-toast-ping absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full ${tone.pulseClass} ring-2 ${darkMode ? 'ring-gray-900' : 'ring-white'}`} />
          <Icon className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-normal ring-1 ${tone.badgeClass}`}>
                  {tone.label}
                </span>
                <span className={`text-base font-bold ${darkMode ? 'text-white' : 'text-[#0c274b]'}`}>
                  {notification.typeKey || 'New notification'}
                </span>
              </div>
              {notification.officer && (
                <p className={`mt-1 truncate text-sm font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                  {notification.officer}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onClose();
              }}
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors ${
                darkMode ? 'text-gray-400 hover:bg-gray-800 hover:text-white' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
              }`}
              aria-label="Close notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {notification.details && (
            <p className={`line-clamp-2 text-sm leading-5 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              {notification.details}
            </p>
          )}

          <div className={`mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {notification.location && (
              <span className="flex min-w-0 items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{notification.location}</span>
              </span>
            )}
            {(notification.date || notification.time) && (
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {[notification.date, notification.time].filter(Boolean).join(' ')}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
