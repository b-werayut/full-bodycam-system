export interface ReportTableEntry {
  reportId?: string | null;
  startTime?: string | Date | null;
  missionStatus?: string | number | null;
  priority?: string | number | null;
  deviceCode?: string | null;
  deviceName?: string | null;
}

export interface ReportDeleteRequest {
  endpoint: '/deletecancelledmission' | '/deletemission';
  payload: {
    reportId?: string;
    deviceCode?: string;
    deviceName?: string;
  };
}

export type ReportAlertLanguage = 'th' | 'en';

function getReportTimestamp(report: ReportTableEntry) {
  const value = report.startTime;
  const timestamp = value instanceof Date ? value.getTime() : new Date(value || '').getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

function normalizeReportStatus(value: unknown) {
  const status = String(value ?? '').toLowerCase().trim();
  const statusMap: Record<string, string> = {
    '4': 'cancelled',
    '8': 'emergency-cancelled',
  };

  return statusMap[status] || status;
}

function isCancelledReport(report: ReportTableEntry) {
  const status = normalizeReportStatus(report.missionStatus ?? report.priority);
  return status.includes('cancel');
}

function getFilterDateTimestamp(value: string) {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

function escapeAlertHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function sortReportsByLatestTime(a: ReportTableEntry, b: ReportTableEntry) {
  const timeA = getReportTimestamp(a);
  const timeB = getReportTimestamp(b);

  if (timeA !== null && timeB !== null && timeA !== timeB) {
    return timeB - timeA;
  }

  if (timeA !== null && timeB === null) return -1;
  if (timeA === null && timeB !== null) return 1;

  return String(b.reportId || '').localeCompare(String(a.reportId || ''));
}

export function isReportFilterEndBeforeStart(startDate: string, endDate: string) {
  const start = getFilterDateTimestamp(startDate);
  const end = getFilterDateTimestamp(endDate);

  if (start === null || end === null) return false;
  return end < start;
}

export function buildReportDeleteRequest(report: ReportTableEntry): ReportDeleteRequest {
  if (isCancelledReport(report)) {
    return {
      endpoint: '/deletecancelledmission',
      payload: { reportId: report.reportId || undefined },
    };
  }

  const payload: ReportDeleteRequest['payload'] = {
    reportId: report.reportId || undefined,
  };

  if (report.deviceCode) {
    payload.deviceCode = report.deviceCode;
  } else if (report.deviceName) {
    payload.deviceName = report.deviceName;
  }

  return {
    endpoint: '/deletemission',
    payload,
  };
}

export function buildReportDeleteSuccessAlert(
  report: ReportTableEntry,
  language: ReportAlertLanguage,
  message?: string,
) {
  const isThai = language === 'th';
  const fallbackMessage = isThai
    ? 'ลบรายงานออกจากระบบเรียบร้อยแล้ว'
    : 'Report has been removed from the system.';
  const reportLabel = isThai ? 'รหัสรายงานที่ลบ' : 'Deleted report ID';

  return {
    icon: 'success' as const,
    title: `<span style="color: #0c274b;">${isThai ? 'ลบรายงานสำเร็จ!' : 'Report deleted successfully!'}</span>`,
    html: `
      <div style="text-align: center;">
        <p style="color: #666; margin-bottom: 16px;">${escapeAlertHtml(message || fallbackMessage)}</p>
        <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); padding: 16px; border-radius: 12px; border: 1px solid #bbf7d0;">
          <p style="color: #166534; font-size: 12px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 1px;">${reportLabel}</p>
          <p style="color: #15803d; font-size: 20px; font-weight: 700; font-family: 'Monaco', 'Consolas', monospace; margin: 0;">${escapeAlertHtml(report.reportId || '-')}</p>
        </div>
      </div>
    `,
    confirmButtonText: isThai ? 'ตกลง' : 'OK',
    confirmButtonColor: '#22c55e',
    background: '#ffffff',
  };
}

export function buildReportFilterDateRangeAlert(language: ReportAlertLanguage) {
  const isThai = language === 'th';

  return {
    icon: 'warning' as const,
    title: isThai ? 'ช่วงวันที่ไม่ถูกต้อง' : 'Invalid date range',
    text: isThai
      ? 'วันที่สิ้นสุดต้องไม่อยู่ก่อนวันที่เริ่มต้น'
      : 'End date cannot be earlier than start date',
    confirmButtonText: isThai ? 'ตกลง' : 'OK',
    confirmButtonColor: '#ef4444',
    background: '#ffffff',
  };
}
