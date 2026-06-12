import { Link } from 'react-router-dom';
import type { Language } from '../../locales/translations';

interface UnderConstructionProps {
  language: Language;
  darkMode: boolean;
}

export const UnderConstruction = ({ language, darkMode }: UnderConstructionProps) => (
  <div className="flex items-center justify-center min-h-[60vh] animate-fadeIn">
    <div className={`text-center p-12 max-w-lg mx-auto rounded-3xl shadow-2xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
      <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-linear-to-br from-[#0c274b] to-[#1a3a5c] shadow-lg mb-8 border-4 border-[#fcd500]/20 relative">
        <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#fcd500]">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
        </svg>
      </div>

      <h2 className={`text-3xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-[#0c274b]'}`}>
        {language === 'th' ? 'ไม่พบหน้าเว็บ หรือ ระบบกำลังพัฒนา' : 'Page Not Found / Under Construction'}
      </h2>

      <p className={`text-lg mb-8 leading-relaxed ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
        {language === 'th'
          ? 'ขออภัย หน้าที่คุณต้องการเข้าถึงไม่มีอยู่ หรือกำลังอยู่ระหว่างการจัดทำ'
          : 'Sorry, the page you are looking for does not exist or is currently under development.'}
      </p>

      <Link
        to="/dashboard"
        className="inline-block px-8 py-3.5 bg-linear-to-r from-[#fcd500] to-[#fed300] hover:from-[#fed300] hover:to-[#fcd500] text-[#0c274b] font-bold rounded-xl transition-all shadow-md hover:shadow-lg hover:-translate-y-1 cursor-pointer"
      >
        {language === 'th' ? 'กลับสู่หน้าหลัก (Dashboard)' : 'Back to Dashboard'}
      </Link>
    </div>
  </div>
);
