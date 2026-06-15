import { useEffect } from 'react';
import { X, FileText, Clock, User, Calendar, AlertTriangle, Trash2, MapPin, Hash } from 'lucide-react';
import type { ReportSqlData } from '../../pages/Reports';
import { reportTranslations } from '../../locales/reportTranslations';

type TranslationsType = Record<string, string>;

interface BaseProps {
  darkMode: boolean;
  language: 'th' | 'en';
  translations: TranslationsType;
}

interface ReportInfoCardProps extends BaseProps {
  report: ReportSqlData;
}

interface ReportDetailModalProps {
  report: ReportSqlData;
  darkMode: boolean;
  language: 'th' | 'en';
  onClose: () => void;
}

interface DeleteReportModalProps {
  show: boolean;
  reportId: string | null;
  onClose: () => void;
  onConfirm: () => void;
  language: 'th' | 'en';
  darkMode: boolean;
}

const buildTheme = (darkMode: boolean) => ({
  surface: darkMode ? 'bg-slate-900 ring-1 ring-white/10' : 'bg-white ring-1 ring-slate-200',
  sectionHead: darkMode ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-slate-50 border-slate-200/80',
  hairline: darkMode ? 'border-white/[0.06]' : 'border-slate-200/80',
  divider: darkMode ? 'divide-white/[0.06]' : 'divide-slate-200/80',
  gridLines: darkMode ? 'bg-white/[0.06]' : 'bg-slate-200/80',
  cellBg: darkMode ? 'bg-slate-900' : 'bg-white',
  title: darkMode ? 'text-white' : 'text-slate-900',
  body: darkMode ? 'text-slate-300' : 'text-slate-700',
  muted: darkMode ? 'text-slate-400' : 'text-slate-500',
  faint: darkMode ? 'text-slate-500' : 'text-slate-400',
});

function ReportInfoCard({ report, darkMode, language, translations }: ReportInfoCardProps) {
  const theme = buildTheme(darkMode);

  const formatDuration = (startStr: string, endStr: string) => {
    const start = new Date(startStr);
    const end = new Date(endStr);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return "-";
    }

    const diffMs = end.getTime() - start.getTime();
    if (diffMs < 0) return "-";

    const totalMinutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0) {
      return `${hours} ${language === 'th' ? 'ชม.' : 'hr'} ${minutes} ${language === 'th' ? 'นาที' : 'min'}`;
    }

    return `${minutes} ${language === 'th' ? 'นาที' : 'min'}`;
  };

  const getEndTimeStr = (startStr: string) => {
    if (!startStr || !startStr.includes('T')) return "-";
    if (report.endTime && report.endTime.includes('T')) {
      return report.endTime.split('T')[1].substring(0, 5);
    }
    const timeParts = startStr.split('T')[1].split(':');
    const hour = (parseInt(timeParts[0], 10) + 2).toString().padStart(2, '0');
    return `${hour}:${timeParts[1].substring(0, 2)}`;
  };

  const formatTimeOnly = (isoString: string) => {
    if (!isoString || !isoString.includes('T')) return isoString || "-";
    return isoString.split('T')[1].substring(0, 5);
  };

  return (
    <div className={`overflow-hidden rounded-xl ${theme.surface}`}>
      <div className={`flex items-center gap-2.5 border-b px-5 py-4 ${theme.sectionHead}`}>
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${darkMode ? 'bg-sky-500/15 text-sky-300' : 'bg-sky-50 text-sky-600'}`}>
          <FileText className="h-4 w-4" />
        </span>
        <h3 className={`text-sm font-bold ${theme.title}`}>
          {language === 'th' ? 'ข้อมูลรายงาน' : 'Report Information'}
        </h3>
      </div>

      <div className="p-5">
        <div className={`relative overflow-hidden rounded-xl px-4 py-3.5 ring-1 ${darkMode ? 'bg-gradient-to-br from-sky-500/15 to-sky-500/[0.02] ring-sky-400/20' : 'bg-gradient-to-br from-sky-50 to-white ring-sky-100'}`}>
          <FileText className={`pointer-events-none absolute -right-3 -top-3 h-20 w-20 ${darkMode ? 'text-sky-400/10' : 'text-sky-500/[0.08]'}`} />
          <p className={`relative text-[11px] font-semibold uppercase tracking-wider ${theme.muted}`}>{translations.reportNumber}</p>
          {report.missionId ? (
            <p className={`relative mt-1 font-mono text-2xl font-bold tracking-tight ${darkMode ? 'text-sky-300' : 'text-sky-700'}`}>{report.missionId}</p>
          ) : (
            <span className="relative mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-500 ring-1 ring-rose-500/25">
              <AlertTriangle className="h-3.5 w-3.5" />
              {translations.unassigned}
            </span>
          )}
        </div>

        <dl className={`mt-4 divide-y ${theme.divider}`}>
          <div className="flex items-start gap-3 py-3">
            <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${darkMode ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
              <Calendar className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <dt className={`text-[11px] font-semibold uppercase tracking-wide ${theme.muted}`}>{translations.date}</dt>
              <dd className={`mt-0.5 text-sm font-semibold ${theme.title}`}>
                {report.startTime?.includes('T') ? new Date(report.startTime).toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US', { calendar: 'gregory' }) : report.startTime}
              </dd>
            </div>
          </div>

          <div className="flex items-start gap-3 py-3">
            <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${darkMode ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
              <User className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <dt className={`text-[11px] font-semibold uppercase tracking-wide ${theme.muted}`}>{translations.officer}</dt>
              <dd className={`mt-0.5 text-sm font-semibold ${theme.title}`}>{report.officerName}</dd>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <span className={`text-xs font-medium ${theme.muted}`}>{translations.mission}:</span>
                <span className={`text-xs font-medium ${!report.missionName ? 'italic text-rose-500' : theme.body}`}>
                  {report.missionName || translations.unassigned}
                </span>
              </div>
              {report.locationName && (
                <div className="mt-1.5 flex items-center gap-1.5">
                  <MapPin className={`h-3.5 w-3.5 ${theme.faint}`} />
                  <span className={`text-xs ${theme.muted}`}>{report.locationName}</span>
                </div>
              )}
            </div>
          </div>
        </dl>

        <div className={`mt-4 overflow-hidden rounded-xl ring-1 ${darkMode ? 'ring-white/10' : 'ring-slate-200'}`}>
          <div className="grid grid-cols-2">
            <div className="px-4 py-3">
              <p className={`text-[11px] font-semibold uppercase tracking-wide ${theme.muted}`}>{translations.startRecordTime}</p>
              <p className={`mt-1 font-mono text-base font-bold ${theme.title}`}>{formatTimeOnly(report.startTime)}</p>
            </div>
            <div className={`border-l px-4 py-3 ${theme.hairline}`}>
              <p className={`text-[11px] font-semibold uppercase tracking-wide ${theme.muted}`}>{translations.endTime}</p>
              <p className={`mt-1 font-mono text-base font-bold ${theme.title}`}>{getEndTimeStr(report.startTime)}</p>
            </div>
          </div>
          <div className={`flex items-center justify-between gap-3 border-t px-4 py-2.5 ${theme.hairline} ${darkMode ? 'bg-sky-500/10' : 'bg-sky-50'}`}>
            <span className={`flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide ${theme.muted}`}>
              <Clock className="h-3.5 w-3.5" />
              {translations.recordedDuration}
            </span>
            <span className={`font-mono text-sm font-bold ${darkMode ? 'text-sky-300' : 'text-sky-700'}`}>{formatDuration(report.startTime, report.endTime)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ReferenceInfoCardProps extends BaseProps {
  report: ReportSqlData;
}

function ReferenceInfoCard({ report, darkMode, language }: ReferenceInfoCardProps) {
  const theme = buildTheme(darkMode);
  const emptyValue = language === 'th' ? 'ไม่มีข้อมูล' : 'N/A';
  const refItems = [
    { label: language === 'th' ? 'รหัสอ้างอิงรายงาน' : 'Report Reference', value: report.reportId },
    { label: language === 'th' ? 'รหัสภารกิจ' : 'Mission Reference', value: report.missionId },
    { label: language === 'th' ? 'รหัสเจ้าหน้าที่' : 'Officer Reference', value: report.officerId },
    { label: language === 'th' ? 'ชื่อสถานที่' : 'Location Name', value: report.locationName },
    { label: language === 'th' ? 'ชื่อกล้อง' : 'Device Name', value: report.deviceName },
    { label: language === 'th' ? 'รหัสกล้อง' : 'Device Code', value: report.deviceCode },
    { label: language === 'th' ? 'Serial No.' : 'Serial No.', value: report.serialNo },
  ];

  return (
    <div className={`overflow-hidden rounded-xl ${theme.surface}`}>
      <div className={`flex items-center gap-2.5 border-b px-5 py-4 ${theme.sectionHead}`}>
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${darkMode ? 'bg-sky-500/15 text-sky-300' : 'bg-sky-50 text-sky-600'}`}>
          <Hash className="h-4 w-4" />
        </span>
        <h3 className={`text-sm font-bold ${theme.title}`}>
          {language === 'th' ? 'ข้อมูลอ้างอิง' : 'Reference Information'}
        </h3>
      </div>

      <dl className={`divide-y ${theme.divider}`}>
        {refItems.map((item) => (
          <div key={item.label} className={`flex items-center justify-between gap-4 px-5 py-2.5 transition-colors ${darkMode ? 'hover:bg-white/[0.03]' : 'hover:bg-slate-50'}`}>
            <dt className={`text-xs font-medium ${theme.muted}`}>{item.label}</dt>
            {item.value ? (
              <dd className={`min-w-0 break-all rounded-md px-2 py-0.5 text-right font-mono text-sm font-semibold ${darkMode ? 'bg-white/5 text-slate-100' : 'bg-slate-100 text-slate-800'}`}>
                {item.value}
              </dd>
            ) : (
              <dd className={`text-right text-sm italic ${theme.faint}`}>{emptyValue}</dd>
            )}
          </div>
        ))}
      </dl>
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

  const translations = reportTranslations[language];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className={`flex max-h-[95vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl shadow-2xl ${darkMode ? 'bg-slate-900 ring-1 ring-white/10' : 'bg-white ring-1 ring-slate-200'}`}>

        <div className={`h-1 w-full shrink-0 ${darkMode ? 'bg-sky-500/70' : 'bg-sky-500'}`} />

        <div className={`flex shrink-0 items-center justify-between gap-4 border-b px-6 py-5 ${darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'}`}>
          <div className="flex min-w-0 items-center gap-4">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${darkMode ? 'bg-gradient-to-br from-sky-500/25 to-sky-500/10 text-sky-300 ring-1 ring-sky-400/25' : 'bg-gradient-to-br from-sky-100 to-sky-50 text-sky-600 ring-1 ring-sky-200/70'}`}>
              <FileText className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                {language === 'th' ? 'รายละเอียดรายงาน' : 'Report Detail'}
              </p>
              <h2 className={`mt-0.5 truncate text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-950'}`}>{translations.modalTitle}</h2>
              {report.missionId ? (
                <p className={`mt-0.5 font-mono text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{report.missionId}</p>
              ) : (
                <div className="mt-1 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
                  <p className="text-xs font-medium text-rose-500">{translations.unassigned}</p>
                </div>
              )}
            </div>
          </div>
          <button onClick={onClose} aria-label={translations.deleteCancel} className={`flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg transition-colors ${darkMode ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className={`p-5 sm:p-6 ${darkMode ? 'bg-slate-950' : 'bg-gradient-to-b from-slate-50 to-slate-100'}`}>
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <ReportInfoCard report={report} darkMode={darkMode} language={language} translations={translations} />
              <ReferenceInfoCard report={report} darkMode={darkMode} language={language} translations={translations} />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export function DeleteReportModal({ show, reportId, onClose, onConfirm, language, darkMode }: DeleteReportModalProps) {
  if (!show) return null;

  const t = reportTranslations[language];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className={`flex w-full max-w-md flex-col overflow-hidden rounded-2xl shadow-2xl duration-200 animate-in zoom-in-95 ${darkMode ? 'bg-slate-900 ring-1 ring-white/10' : 'bg-white ring-1 ring-slate-200'}`}>
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-rose-500/20 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/15 text-rose-500">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <h2 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{t.deleteConfirmTitle}</h2>
          </div>
          <button onClick={onClose} aria-label={t.deleteCancel} className={`shrink-0 cursor-pointer rounded-lg p-2 transition-colors ${darkMode ? 'text-slate-400 hover:bg-white/10 hover:text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-6">
          <div className={`rounded-xl border p-4 ${darkMode ? 'border-rose-500/30 bg-rose-500/10' : 'border-rose-200 bg-rose-50'}`}>
            <p className={`text-base font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{t.deleteConfirmMsg}</p>
            <p className={`mt-3 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              {t.deleteReportNo} <span className="font-mono font-bold text-rose-500">{reportId || t.unassigned}</span>
            </p>
          </div>

          <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>* {t.deleteWarning}</p>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={onClose} className={`flex cursor-pointer items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-colors ${darkMode ? 'bg-white/5 text-slate-100 ring-1 ring-white/15 hover:bg-white/10' : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50'}`}>
              {t.deleteCancel}
            </button>
            <button onClick={onConfirm} className="flex cursor-pointer items-center gap-2 rounded-lg bg-rose-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-rose-600/20 transition-colors hover:bg-rose-500">
              <Trash2 className="h-5 w-5" />
              {t.deleteConfirmBtn}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
