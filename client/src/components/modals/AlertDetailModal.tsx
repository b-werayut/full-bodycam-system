import {
  TriangleAlert,
  MapPinned,
  Timer,
  X,
  UserCircle,
  FileText,
  ClipboardList,
  CircleCheckBig,
  CircleDot,
  Cpu,
  Hash,
} from 'lucide-react';
import { type SupportedLanguage, dashboardTranslations } from '../../locales/dashboardTranslations';

interface AlertMission {
  missionId: number;
  reportId?: string | null;
  missionName?: string | null;
  missionStatus?: string | null;
  deviceCode?: string | null;
  startTime?: string | null;
  endTime?: string | null;
}

interface AlertData {
  id: number;
  typeKey: string;
  officer: string;
  time: string;
  severity: string;
  location: string;
  details: string;
  date?: string;
  isRead?: boolean;
  deviceName?: string;
  deviceCode?: string;
  mission?: AlertMission | null;
}

interface AlertDetailModalProps {
  alert: AlertData;
  language: SupportedLanguage;
  darkMode: boolean;
  onClose: () => void;
  onOpenMission: (mission?: AlertMission | null, alertId?: number) => void;
}

export function AlertDetailModal({
  alert,
  language,
  darkMode,
  onClose,
  onOpenMission,
}: AlertDetailModalProps) {
  const t = dashboardTranslations[language];
  const readLabel = language === 'th' ? 'อ่านแล้ว' : 'Read';
  const unreadLabel = language === 'th' ? 'ยังไม่อ่าน' : 'Unread';

  const getMissionStatusLabel = (status: string | null | undefined): string => {
    if (!status) return '';
    const statusMap: Record<string, { th: string; en: string }> = {
      '1': { th: 'รอเริ่มงาน / รอรับงาน', en: 'Pending' },
      '2': { th: 'กำลังดำเนินการ', en: 'In Progress' },
      '3': { th: 'เสร็จสิ้น', en: 'Completed' },
      '4': { th: 'ยกเลิก', en: 'Cancelled' },
      '5': { th: 'งานฉุกเฉินรอเริ่ม', en: 'Emergency' },
      '6': { th: 'งานฉุกเฉินกำลังดำเนินการ', en: 'Emergency In Progress' },
      '7': { th: 'งานฉุกเฉินเสร็จสิ้น', en: 'Emergency Completed' },
      '8': { th: 'งานฉุกเฉินยกเลิก', en: 'Emergency Cancelled' },
    };
    const entry = statusMap[status];
    if (entry) return language === 'th' ? entry.th : entry.en;
    return status;
  };

  const severity = (alert.severity || 'medium').toLowerCase();
  const accent =
    severity === 'high'
      ? {
          tile: darkMode ? 'bg-rose-500/15 text-rose-300' : 'bg-rose-50 text-rose-600',
          chip: darkMode ? 'bg-rose-500/15 text-rose-200 ring-rose-500/25' : 'bg-rose-50 text-rose-700 ring-rose-600/20',
          rail: 'bg-rose-500',
        }
      : severity === 'low'
        ? {
            tile: darkMode ? 'bg-sky-500/15 text-sky-300' : 'bg-sky-50 text-sky-600',
            chip: darkMode ? 'bg-sky-500/15 text-sky-200 ring-sky-500/25' : 'bg-sky-50 text-sky-700 ring-sky-600/20',
            rail: 'bg-sky-500',
          }
        : {
            tile: darkMode ? 'bg-amber-500/15 text-amber-300' : 'bg-amber-50 text-amber-600',
            chip: darkMode ? 'bg-amber-500/15 text-amber-200 ring-amber-500/25' : 'bg-amber-50 text-amber-700 ring-amber-600/20',
            rail: 'bg-amber-500',
          };

  const shell = darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
  const chromeBorder = darkMode ? 'border-slate-800' : 'border-slate-200';
  const titleColor = darkMode ? 'text-white' : 'text-slate-950';
  const mutedColor = darkMode ? 'text-slate-400' : 'text-slate-500';
  const valueColor = darkMode ? 'text-white' : 'text-slate-900';
  const panel = darkMode ? 'bg-slate-800/40 border-slate-800' : 'bg-white border-slate-200';
  const cellBorder = darkMode ? 'border-slate-800' : 'border-slate-200';

  const readChip = alert.isRead
    ? darkMode
      ? 'bg-slate-800 text-slate-300 ring-slate-700'
      : 'bg-slate-100 text-slate-600 ring-slate-200'
    : darkMode
      ? 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/25'
      : 'bg-emerald-50 text-emerald-700 ring-emerald-600/20';

  const metaItems = [
    {
      icon: UserCircle,
      label: t.officer,
      value: alert.officer || (language === 'th' ? 'ระบบ' : 'System'),
    },
    {
      icon: Timer,
      label: t.time,
      value: `${alert.date ? `${alert.date} ` : ''}${alert.time || '--:--'}`,
    },
    {
      icon: MapPinned,
      label: language === 'th' ? 'สถานที่' : 'Location',
      value: alert.location || '-',
      full: true,
    },
  ];

  const infoItems = [
    { icon: TriangleAlert, label: t.type, value: alert.typeKey },
    { icon: Cpu, label: language === 'th' ? 'ชื่ออุปกรณ์' : 'Device Name', value: alert.deviceName || '-' },
    { icon: Hash, label: language === 'th' ? 'รหัสอุปกรณ์' : 'Device Code', value: alert.deviceCode || '-', mono: true },
  ];

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200 ${darkMode ? 'bg-slate-950/80' : 'bg-slate-900/50'}`}
      onClick={onClose}
    >
      <div
        className={`flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border shadow-2xl animate-in zoom-in-95 duration-200 ${shell}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex shrink-0 items-start justify-between gap-4 border-b px-6 py-5 ${chromeBorder}`}>
          <div className="flex min-w-0 items-start gap-4">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${accent.tile}`}>
              <TriangleAlert className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold uppercase ring-1 ${accent.chip}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${accent.rail}`} />
                  {alert.severity || 'medium'}
                </span>
                <span
                  title={alert.isRead ? readLabel : unreadLabel}
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${readChip}`}
                >
                  {alert.isRead ? <CircleCheckBig className="h-3.5 w-3.5" /> : <CircleDot className="h-3.5 w-3.5" />}
                  {alert.isRead ? readLabel : unreadLabel}
                </span>
              </div>
              <h2 className={`text-xl font-bold leading-tight sm:text-2xl ${titleColor}`}>
                {t[alert.typeKey as keyof typeof t] || alert.typeKey}
              </h2>
              <p className={`mt-1 inline-flex items-center gap-1 text-sm ${mutedColor}`}>
                <Hash className="h-3.5 w-3.5" />
                Alert {alert.id}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            title={t.close}
            className={`flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg transition-colors ${darkMode ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-5 px-6 py-5">
            {/* Meta definition grid */}
            <dl className={`grid grid-cols-1 overflow-hidden rounded-xl border sm:grid-cols-2 ${panel}`}>
              {metaItems.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className={`px-4 py-3.5 ${item.full ? 'sm:col-span-2' : 'sm:odd:border-r'} ${index > 0 ? 'border-t sm:border-t' : ''} ${cellBorder} ${!item.full && index === 1 ? 'sm:border-t-0' : ''}`}
                  >
                    <dt className={`mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide ${mutedColor}`}>
                      <Icon className="h-3.5 w-3.5" />
                      {item.label}
                    </dt>
                    <dd className={`break-words text-base font-semibold ${valueColor}`}>{item.value}</dd>
                  </div>
                );
              })}
            </dl>

            {/* Related mission */}
            {alert.mission && (
              <div className={`rounded-xl border p-4 ${darkMode ? 'border-sky-500/25 bg-sky-500/10' : 'border-sky-100 bg-sky-50'}`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="mb-1.5 flex items-center gap-1.5">
                      <ClipboardList className={`h-4 w-4 ${darkMode ? 'text-sky-300' : 'text-sky-700'}`} />
                      <span className={`text-xs font-bold uppercase tracking-wide ${darkMode ? 'text-sky-300' : 'text-sky-700'}`}>
                        {language === 'th' ? 'ใบงานที่เกี่ยวข้อง' : 'Related Mission'}
                      </span>
                    </div>
                    <p className={`truncate text-base font-bold ${darkMode ? 'text-white' : 'text-slate-950'}`}>
                      {alert.mission.missionName || `${language === 'th' ? 'ใบงาน' : 'Mission'} #${alert.mission.missionId}`}
                    </p>
                    <div className={`mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs ${darkMode ? 'text-sky-100/75' : 'text-sky-800/80'}`}>
                      <span className="font-mono">#{alert.mission.missionId}</span>
                      {alert.mission.reportId && (
                        <>
                          <span className="opacity-40">|</span>
                          <span className="font-mono">{alert.mission.reportId}</span>
                        </>
                      )}
                      {alert.mission.missionStatus && (
                        <>
                          <span className="opacity-40">|</span>
                          <span>{getMissionStatusLabel(alert.mission.missionStatus)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Alert information */}
            <div className={`overflow-hidden rounded-xl border ${panel}`}>
              <div className={`flex items-center gap-2 border-b px-5 py-3.5 ${cellBorder}`}>
                <FileText className={`h-4 w-4 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`} />
                <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-950'}`}>
                  {language === 'th' ? 'รายละเอียดข้อมูลแจ้งเตือน' : 'Alert Information'}
                </h3>
              </div>
              <div className="space-y-4 p-5">
                <p className={`text-sm leading-6 ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                  {alert.details || '-'}
                </p>

                <dl className={`grid grid-cols-1 gap-4 border-t pt-4 sm:grid-cols-3 ${cellBorder}`}>
                  {infoItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.label} className="min-w-0">
                        <dt className={`mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                          <Icon className="h-3.5 w-3.5" />
                          {item.label}
                        </dt>
                        <dd className={`break-words text-sm font-semibold ${item.mono ? 'font-mono' : ''} ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                          {item.value}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`flex shrink-0 items-center justify-end gap-2 border-t px-6 py-3.5 ${chromeBorder}`}>
          {alert.mission && (
            <button
              type="button"
              onClick={() => void onOpenMission(alert.mission, alert.id)}
              className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
            >
              <ClipboardList className="h-4 w-4" />
              {language === 'th' ? 'เปิดดูใบงาน' : 'Open Mission'}
            </button>
          )}
          <button
            onClick={onClose}
            className={`inline-flex h-9 cursor-pointer items-center justify-center rounded-lg px-5 text-sm font-semibold transition-colors ${darkMode ? 'bg-slate-800 text-slate-100 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
}
