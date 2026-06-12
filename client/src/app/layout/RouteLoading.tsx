import type { Language } from '../../locales/translations';

interface RouteLoadingProps {
  language: Language;
  darkMode: boolean;
}

export const RouteLoading = ({ language, darkMode }: RouteLoadingProps) => (
  <div className="min-h-[50vh] flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="w-10 h-10 border-4 border-[#0c274b] border-t-transparent rounded-full animate-spin"></div>
      <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
        {language === 'th' ? 'กำลังโหลดหน้า...' : 'Loading page...'}
      </p>
    </div>
  </div>
);
