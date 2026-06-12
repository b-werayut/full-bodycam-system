import { translations, type Language } from '../../locales/translations';

interface FooterProps {
  language: Language;
  darkMode: boolean;
}

export function Footer({ language, darkMode }: FooterProps) {
  const t = translations[language];

  return (
    <footer className={`mt-auto border-t ${darkMode ? 'bg-gray-900/50 border-gray-800' : 'bg-gray-50/80 border-gray-100'}`}>
      <div className="max-w-[1600px] mx-auto px-6 py-4">
        <p className={`text-xs text-center ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          {t.copyright}
        </p>
      </div>
    </footer>
  );
}