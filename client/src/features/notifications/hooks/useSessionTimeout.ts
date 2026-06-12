import { useEffect } from 'react';
import type { Language } from '../../../locales/translations';

interface UseSessionTimeoutOptions {
  enabled: boolean;
  language: Language;
  onTimeout: () => void;
}

const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
const IDLE_EVENTS = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];

export function useSessionTimeout({ enabled, language, onTimeout }: UseSessionTimeoutOptions) {
  useEffect(() => {
    if (!enabled) return;

    let timeoutId: ReturnType<typeof setTimeout>;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        alert(
          language === 'th'
            ? 'หมดเวลาการเชื่อมต่อ กรุณาเข้าสู่ระบบใหม่'
            : 'Session expired. Please login again.',
        );
        onTimeout();
      }, SESSION_TIMEOUT_MS);
    };

    IDLE_EVENTS.forEach((event) => document.addEventListener(event, resetTimer));
    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      IDLE_EVENTS.forEach((event) => document.removeEventListener(event, resetTimer));
    };
  }, [enabled, language, onTimeout]);
}
