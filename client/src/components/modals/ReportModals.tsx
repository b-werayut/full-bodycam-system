import { useEffect } from 'react';
import { X, Play, FileText, Clock, User, Calendar } from 'lucide-react';
import type { ReportSqlData } from '../../pages/Reports';
import { ImageWithFallback } from '../../components/ui/ImageWithFallback';

type TranslationsType = Record<string, string>;

interface BaseProps {
  darkMode: boolean;
  language: 'th' | 'en';
  translations: TranslationsType;
}

interface ReportInfoCardProps extends BaseProps {
  report: ReportSqlData;
}

interface ReportVideoSectionProps extends BaseProps {
  mainVideoImage: string;
  thumbnailImages: string[];
}

interface ReportDetailModalProps {
  report: ReportSqlData;
  darkMode: boolean;
  language: 'th' | 'en';
  onClose: () => void;
}

function ReportInfoCard({ report, darkMode, language, translations }: ReportInfoCardProps) {
  // ฟังก์ชันคำนวณและแสดงเวลาสิ้นสุด
  const getEndTimeStr = (startStr: string) => {
    if (!startStr || !startStr.includes('T')) return "-";
    // ถ้ามี endTime จาก SQL ให้ใช้เลย
    if (report.endTime && report.endTime.includes('T')) {
      return report.endTime.split('T')[1].substring(0, 5);
    }
    // ถ้าไม่มี จำลองบวกเวลา 2 ชม.
    const timeParts = startStr.split('T')[1].split(':');
    const hour = (parseInt(timeParts[0], 10) + 2).toString().padStart(2, '0');
    return `${hour}:${timeParts[1].substring(0, 2)}`;
  };

  // ฟังก์ชันดึงเฉพาะ HH:mm
  const formatTimeOnly = (isoString: string) => {
    if (!isoString || !isoString.includes('T')) return isoString || "-";
    return isoString.split('T')[1].substring(0, 5);
  };

  // ดึงคำแปลกรณีไม่มีข้อมูลจาก props หลัก หรือ fallback ค่า
  const unassignedText = language === 'th' ? 'รอผูกแผนงาน' : 'Unassigned';

  return (
    <div className={`rounded-2xl shadow-xl overflow-hidden border-2 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
      <div className={`px-5 py-3 border-b ${darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-linear-to-r from-gray-50 to-gray-100 border-gray-200'}`}>
        <h3 className={`font-bold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-[#0c274b]'}`}>
          <FileText className="w-5 h-5 text-[#fcd500]" />
          {language === 'th' ? 'ข้อมูลรายงาน' : 'Report Information'}
        </h3>
      </div>
      
      <div className="p-5 space-y-4">
        {/* Report Number (Mission ID) */}
        <div className="flex items-start gap-3">
          <div className="shrink-0 mt-1">
            <div className={`w-2 h-2 rounded-full ${darkMode ? 'bg-[#fcd500]' : 'bg-[#0c274b]'}`}></div>
          </div>
          <div className="flex-1">
            <p className={`text-xs font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{translations.reportNumber}</p>
            {/* 🚀 เช็คค่า null */}
            {report.missionId ? (
              <p className={`text-lg font-bold ${darkMode ? 'text-[#fcd500]' : 'text-[#0c274b]'}`}>{report.missionId}</p>
            ) : (
              <span className="inline-block px-2.5 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-md border border-red-200 mt-1">
                {unassignedText}
              </span>
            )}
          </div>
        </div>

        {/* Date */}
        <div className="flex items-start gap-3">
          <div className="shrink-0 mt-1">
            <Calendar className={`w-4 h-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
          </div>
          <div className="flex-1">
            <p className={`text-xs font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{translations.date}</p>
            <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {report.startTime?.includes('T') ? new Date(report.startTime).toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US') : report.startTime}
            </p>
          </div>
        </div>

        {/* Officer & Mission */}
        <div className="flex items-start gap-3">
          <div className="shrink-0 mt-1">
            <User className={`w-4 h-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
          </div>
          <div className="flex-1">
            <p className={`text-xs font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{translations.officer}</p>
            <p className={`font-semibold mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{report.officerName}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{translations.mission}:</span>
              {/* 🚀 เช็คค่า null */}
              <span className={`text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} ${!report.missionName ? 'text-red-500 italic' : ''}`}>
                {report.missionName || unassignedText}
              </span>
            </div>
          </div>
        </div>

        <div className={`border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}></div>

        {/* Time Information */}
        <div className="flex items-start gap-3">
          <div className="shrink-0 mt-1">
            <Clock className={`w-4 h-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{translations.startRecordTime}:</span>
              <span className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {formatTimeOnly(report.startTime)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{translations.endTime}:</span>
              <span className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {getEndTimeStr(report.startTime)}
              </span>
            </div>
            
            <div className={`mt-3 p-3 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-100'}`}>
              <div className="text-center">
                <p className={`text-xs mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{translations.recordedDuration}:</p>
                <p className={`font-bold text-lg ${darkMode ? 'text-[#fcd500]' : 'text-[#0c274b]'}`}>{report.startTime}</p>
              </div>
            </div>
          </div>
        </div>

        <div className={`border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}></div>

        {/* Usage Log */}
        <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-700/30' : 'bg-blue-50'}`}>
          <p className={`text-xs font-medium mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{translations.usageLog}</p>
          <p className={`text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {translations.openedBy} <span className="font-bold text-[#fcd500]">Admin</span> {translations.at} <span className="font-bold">12:10</span>
          </p>
        </div>
      </div>
    </div>
  );
}

function ReportVideoSection({ darkMode, language, translations, mainVideoImage, thumbnailImages }: ReportVideoSectionProps) {
  return (
    <div className="space-y-4">
      <div className={`rounded-2xl overflow-hidden shadow-xl border-2 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className={`px-5 py-3 border-b ${darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-linear-to-r from-gray-50 to-gray-100 border-gray-200'}`}>
          <h3 className={`font-bold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-[#0c274b]'}`}>
            <Play className="w-5 h-5 text-[#fcd500]" />
            {language === 'th' ? 'วิดีโอบันทึก' : 'Recorded Video'}
          </h3>
        </div>
        
        <div className="p-4">
          <div className={`rounded-xl overflow-hidden shadow-lg border ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>
            <div className="aspect-video relative overflow-hidden group cursor-pointer bg-black flex items-center justify-center">
              <ImageWithFallback src={mainVideoImage} alt={translations.videoPlayer} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center">
                <div className="bg-white/20 backdrop-blur-sm p-8 rounded-full group-hover:scale-110 transition-all duration-300 shadow-2xl">
                  <Play className="w-16 h-16 text-white drop-shadow-lg" fill="currentColor" />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-4">
            {thumbnailImages.map((image, index) => (
              <div key={index} className={`rounded-lg overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl border-2 ${index === 0 ? 'border-[#fcd500] shadow-lg' : darkMode ? 'border-gray-600 hover:border-[#fcd500]' : 'border-gray-300 hover:border-[#fcd500]'}`}>
                <div className="aspect-video relative overflow-hidden group bg-gray-900 flex items-center justify-center">
                  <ImageWithFallback src={image} alt={`${translations.thumbnail} ${index + 1}`} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center">
                    <div className="bg-white/20 backdrop-blur-sm p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play className="w-5 h-5 text-white" fill="currentColor" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <button className="w-full px-6 py-4 bg-linear-to-r from-black via-gray-900 to-black hover:from-gray-900 hover:via-black hover:to-gray-900 text-white rounded-xl transition-all duration-300 font-bold shadow-xl hover:shadow-2xl hover:scale-[1.02] flex items-center justify-center gap-3 border-2 border-gray-700 hover:border-gray-600 group cursor-pointer">
        <FileText className="w-6 h-6 group-hover:scale-110 transition-transform" />
        <span className="text-lg">{translations.export}</span>
      </button>
    </div>
  );
}

export function ReportDetailModal({ report, darkMode, language, onClose }: ReportDetailModalProps) {
  useEffect(() => {
    const scrollY = window.scrollY;
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, scrollY);
    };
  }, []);

  const t: Record<string, TranslationsType> = {
    th: {
      title: 'รายละเอียดรายงานวิดีโอ', 
      reportNumber: 'รหัสภารกิจ', 
      date: 'วันที่', 
      officer: 'เจ้าหน้าที่', 
      mission: 'ภารกิจ', 
      startRecordTime: 'เวลาเริ่มบันทึก', 
      endTime: 'เวลาสิ้นสุด', 
      recordedDuration: 'ระยะเวลาทั้งหมด', 
      usageLog: 'บันทึกการใช้งาน', 
      openedBy: 'เปิดโดย', 
      at: 'เวลา', 
      export: 'ส่งออก', 
      videoPlayer: 'ตัวเล่นวิดีโอ', 
      thumbnail: 'รูปภาพ', 
      hour: 'ชม.', 
      minute: 'นาที', 
      location: 'สถานที่',
    },
    en: {
      title: 'Video Record Details', 
      reportNumber: 'Mission ID', 
      date: 'Date', 
      officer: 'Officer', 
      mission: 'Mission', 
      startRecordTime: 'Start Time', 
      endTime: 'End Time', 
      recordedDuration: 'Total Duration', 
      usageLog: 'Usage Log', 
      openedBy: 'Opened by', 
      at: 'at', 
      export: 'Export', 
      videoPlayer: 'Video Player', 
      thumbnail: 'Thumbnail', 
      hour: 'hr.', 
      minute: 'min.', 
      location: 'Location',
    },
  };

  const translations = t[language];

  const thumbnailImages = [
    'https://images.unsplash.com/photo-1678137613402-02f744ef4bef?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwb2xpY2UlMjBib2R5JTIwY2FtZXJhJTIwZm9vdGFnZSUyMHNjcmVlbnxlbnwxfHx8fDE3NzIxODc4Mjd8MA&ixlib=rb-4.1.0&q=80&w=1080',
    'https://images.unsplash.com/photo-1665848383782-1ea74efde68f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzZWN1cml0eSUyMGNhbWVyYSUyMG1vbml0b3IlMjBzdXJ2ZWlsbGFuY2V8ZW58MXx8fHwxNzcyMTg3ODI3fDA&ixlib=rb-4.1.0&q=80&w=1080',
    'https://images.unsplash.com/photo-1628582235908-b73cd85ceecc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx2aWRlbyUyMHN1cnZlaWxsYW5jZSUyMHNjcmVlbiUyMHJlY29yZGluZ3xlbnwxfHx8fDE3NzIxODc4Mjh8MA&ixlib=rb-4.1.0&q=80&w=1080',
  ];
  const mainVideoImage = 'https://images.unsplash.com/photo-1599350686877-382a54114d2f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzZWN1cml0eSUyMGZvb3RhZ2UlMjBtb25pdG9yfGVufDF8fHx8MTc3MjE5MTUwM3ww&ixlib=rb-4.1.0&q=80&w=1080';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
      <div className={`w-full max-w-7xl max-h-[95vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden ${darkMode ? 'bg-gray-900 border border-gray-700' : 'bg-white'}`}>
        
        <div className="bg-linear-to-r from-[#0c274b] via-[#0c274b] to-[#0a1f3a] px-6 py-5 flex items-center justify-between shrink-0 border-b border-[#fcd500]/20">
          <div className="flex items-center gap-3">
            <div className="bg-linear-to-br from-[#fcd500] to-[#fed300] p-2.5 rounded-xl shadow-lg">
              <FileText className="w-7 h-7 text-[#0c274b]" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{translations.title}</h2>
              {/* 🚀 เช็คค่า null บน Header (ไม่พึ่งพา translation จากนอกไฟล์) */}
              <p className={`text-sm mt-0.5 ${report.missionId ? 'text-[#fcd500]/80' : 'text-red-400 font-medium'}`}>
                {report.missionId || (language === 'th' ? 'เหตุฉุกเฉิน (รอผูกแผนงาน)' : 'Emergency (Unassigned)')}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white transition-all p-2.5 hover:bg-white/10 rounded-xl group cursor-pointer">
            <X className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className={`p-6 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ReportInfoCard report={report} darkMode={darkMode} language={language} translations={translations} />
              <ReportVideoSection darkMode={darkMode} language={language} translations={translations} mainVideoImage={mainVideoImage} thumbnailImages={thumbnailImages} />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}