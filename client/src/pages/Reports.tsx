import { useState, useEffect, useMemo } from 'react';
import { Calendar, Search, FileText, Download, Eye, X, ChevronLeft, ChevronRight, Trash2, User, Clock, AlertTriangle, ClipboardList, CheckCircle2 } from 'lucide-react';
import Swal from 'sweetalert2';
import axios from 'axios';
import { ReportDetailModal, DeleteReportModal } from '../components/modals/ReportDetailModal';
import { reportTranslations, type ReportLanguage, type ReportTranslationData } from '../locales/reportTranslations';
import { useAuth } from '../contexts/useAuth';
import { canUseReportTools } from '../lib/permissions';
import {
  buildReportDeleteRequest,
  buildReportDeleteSuccessAlert,
  buildReportFilterDateRangeAlert,
  isReportFilterEndBeforeStart,
  sortReportsByLatestTime,
} from '../features/reports/reportTable';
import { deleteMission, getReports } from '../services/missionService';
import { localizeMissionDeleteError } from '../features/missionDeleteError';

export interface ReportSqlData {
  reportId: string;
  missionId: string | null;
  missionName: string | null;
  startTime: string;
  endTime: string;
  description?: string;
  officerId: string;
  locationId?: string;
  officerName: string;
  locationName: string;
  missionStatus?: string;
  priority?: string;
  duration?: number;
  note?: string;
  latitude?: number;
  longitude?: number;
  deviceCode?: string;
  deviceName?: string;
  deviceType?: string;
  serialNo?: string;
  active?: boolean;
}

interface ReportsProps {
  darkMode: boolean;
  language: ReportLanguage;
}

type ExportFormat = 'pdf' | 'excel';
type ExportScope = 'all' | 'page' | 'single';
type ExportRow = Record<string, string | number>;
type ReportStatusTone = 'red' | 'amber' | 'blue' | 'green' | 'slate';

interface ReportStatusBadge {
  label: string;
  tone: ReportStatusTone;
}

interface ExportPreviewState {
  format: ExportFormat;
  scope: ExportScope;
  rows: ExportRow[];
  title: string;
  fileName: string;
  reportId?: string;
}

function normalizeSearchText(value: unknown) {
  return String(value ?? '').toLowerCase();
}

function formatDateTime(value: string | undefined, language: ReportLanguage) {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString(language === 'th' ? 'th-TH' : 'en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getDurationMinutes(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return 0;
  const diffMs = e.getTime() - s.getTime();
  if (diffMs < 0) return 0;
  return Math.floor(diffMs / 60000);
}

function formatDurationLabel(start: string, end: string, language: ReportLanguage) {
  const totalMinutes = getDurationMinutes(start, end);
  if (totalMinutes <= 0) return '-';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours} ${language === 'th' ? 'ชม.' : 'hr'} ${minutes} ${language === 'th' ? 'นาที' : 'min'}`;
  return `${minutes} ${language === 'th' ? 'นาที' : 'min'}`;
}

function normalizeMissionStatus(value: unknown) {
  const status = normalizeSearchText(value).trim();
  const statusMap: Record<string, string> = {
    '1': 'waiting',
    '2': 'in-progress',
    '3': 'completed',
    '4': 'cancelled',
    '5': 'emergency',
    '6': 'emergency-in-progress',
    '7': 'emergency-completed',
    '8': 'emergency-cancelled',
  };

  return statusMap[status] || status;
}

function getNormalizedReportStatus(report: ReportSqlData) {
  return normalizeMissionStatus(report.missionStatus || report.priority);
}

function getReportStatusBadge(report: ReportSqlData, language: ReportLanguage): ReportStatusBadge | null {
  const rawStatus = getNormalizedReportStatus(report);

  if (!rawStatus) return null;

  if (rawStatus.includes('emergency-completed')) {
    return { label: language === 'th' ? 'ฉุกเฉินเสร็จสิ้น' : 'Emergency Completed', tone: 'green' };
  }

  if (rawStatus.includes('emergency-cancelled')) {
    return { label: language === 'th' ? 'ฉุกเฉินยกเลิก' : 'Emergency Cancelled', tone: 'slate' };
  }

  if (rawStatus.includes('emergency-in-progress')) {
    return { label: language === 'th' ? 'ฉุกเฉินกำลังดำเนินการ' : 'Emergency In Progress', tone: 'red' };
  }

  const isEmergency = normalizeSearchText(report.reportId).startsWith('emer') ||
    rawStatus.includes('emergency') ||
    rawStatus.includes('urgent') ||
    rawStatus.includes('critical') ||
    rawStatus.includes('high') ||
    rawStatus.includes('ฉุกเฉิน') ||
    rawStatus.includes('ด่วน');

  if (isEmergency) {
    return { label: language === 'th' ? 'ฉุกเฉิน' : 'Emergency', tone: 'red' };
  }

  if (rawStatus.includes('complete') || rawStatus.includes('success') || rawStatus.includes('done') || rawStatus.includes('เสร็จ')) {
    return { label: language === 'th' ? 'เสร็จสิ้น' : 'Completed', tone: 'green' };
  }

  if (rawStatus.includes('cancel')) {
    return { label: language === 'th' ? 'ยกเลิก' : 'Cancelled', tone: 'slate' };
  }

  if (rawStatus.includes('active') || rawStatus.includes('progress') || rawStatus.includes('กำลัง')) {
    return { label: language === 'th' ? 'กำลังดำเนินการ' : 'In Progress', tone: 'blue' };
  }

  if (rawStatus.includes('wait') || rawStatus.includes('pending') || rawStatus.includes('รอ')) {
    return { label: language === 'th' ? 'รอดำเนินการ' : 'Pending', tone: 'amber' };
  }

  return {
    label: String(report.missionStatus || report.priority),
    tone: 'slate',
  };
}

function getStatusBadgeClass(tone: ReportStatusTone, darkMode: boolean) {
  const classes: Record<ReportStatusTone, string> = {
    red: darkMode ? 'bg-red-950/50 text-red-200 ring-red-800/70' : 'bg-red-50 text-red-700 ring-red-200',
    amber: darkMode ? 'bg-amber-950/50 text-amber-200 ring-amber-800/70' : 'bg-amber-50 text-amber-700 ring-amber-200',
    blue: darkMode ? 'bg-sky-950/50 text-sky-200 ring-sky-800/70' : 'bg-sky-50 text-sky-700 ring-sky-200',
    green: darkMode ? 'bg-emerald-950/50 text-emerald-200 ring-emerald-800/70' : 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    slate: darkMode ? 'bg-slate-800 text-slate-300 ring-slate-700' : 'bg-slate-100 text-slate-600 ring-slate-200',
  };

  return classes[tone];
}

function getExportRows(reports: ReportSqlData[], language: ReportLanguage, t: ReportTranslationData): ExportRow[] {
  return reports.map((report, index) => ({
    [t.tableNo]: index + 1,
    [t.tableCode]: report.reportId || t.na,
    [t.tableDate]: formatDateTime(report.startTime, language),
    [language === 'th' ? 'สถานะงาน' : 'Work Status']: getReportStatusBadge(report, language)?.label || '-',
    [t.tableOfficer]: report.officerName || t.na,
    [t.tableMission]: report.missionName || t.unassigned,
    [t.tableDescription]: report.description || '-',
    [t.tableDuration]: formatDurationLabel(report.startTime, report.endTime, language),
    [t.tableLocation]: report.locationName || t.unknownLocation,
    [language === 'th' ? 'รหัสภารกิจ' : 'Mission ID']: report.missionId || '-',
    [language === 'th' ? 'เวลาเริ่มต้น' : 'Start Time']: formatDateTime(report.startTime, language),
    [language === 'th' ? 'เวลาสิ้นสุด' : 'End Time']: formatDateTime(report.endTime, language),
    [language === 'th' ? 'อุปกรณ์' : 'Device']: report.deviceName || report.deviceCode || '-',
    [language === 'th' ? 'หมายเหตุ' : 'Note']: report.note || '-',
  }));
}

function buildExportFileName(format: ExportFormat, scope: ExportScope, reportId?: string) {
  const timestamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
  const extension = format === 'pdf' ? 'pdf' : 'xlsx';
  const scopeName = reportId || scope;
  return `reports-${scopeName}-${timestamp}.${extension}`;
}

function escapeHtml(value: string | number) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function exportReportsToPdf(
  rows: ReturnType<typeof getExportRows>,
  title: string,
  fileName: string,
  language: ReportLanguage,
) {
  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);
  const headers = Object.keys(rows[0] || {});
  const maxRowsPerPage = 10;
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-10000px';
  container.style.top = '0';
  container.style.width = '1120px';
  container.style.padding = '28px';
  container.style.background = '#f9fafb';
  container.style.color = '#111827';
  container.style.fontFamily = "'Sarabun', Arial, sans-serif";

  const renderPageMarkup = (pageRows: ReturnType<typeof getExportRows>, pageNumber: number, startRowNumber: number) => `
    <div style="background:#ffffff;border:1px solid #d1d5db;border-radius:8px;overflow:hidden;">
      <div style="padding:20px 22px;border-bottom:1px solid #e5e7eb;">
        <div style="font-size:22px;font-weight:800;color:#0c274b;">${escapeHtml(title)}</div>
        <div style="display:flex;justify-content:space-between;gap:16px;font-size:12px;color:#4b5563;margin-top:4px;">
          <span>${language === 'th' ? 'วันที่ส่งออก' : 'Exported at'} ${escapeHtml(formatDateTime(new Date().toISOString(), language))}</span>
          <span>${language === 'th' ? 'หน้า' : 'Page'} ${pageNumber}</span>
        </div>
      </div>
      <table style="width:100%;border-collapse:collapse;table-layout:fixed;font-size:10.5px;line-height:1.35;">
        <thead>
          <tr style="background:#0c274b;color:#f9fafb;">
            ${headers.map((header) => `<th style="padding:8px 7px;text-align:left;border-right:1px solid rgba(255,255,255,.18);font-weight:700;word-break:break-word;">${escapeHtml(header)}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${pageRows.map((row, rowIndex) => `
            <tr style="background:${(startRowNumber + rowIndex) % 2 === 0 ? '#ffffff' : '#f3f4f6'};">
              ${headers.map((header) => `<td style="padding:7px;border:1px solid #e5e7eb;vertical-align:top;word-break:break-word;">${escapeHtml(row[header] ?? '-')}</td>`).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  document.body.appendChild(container);
  try {
    const pdf = new jsPDF('l', 'pt', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imageWidth = pageWidth - 24;
    const pageLimit = pageHeight - 24;
    let rowIndex = 0;
    let pageNumber = 1;

    while (rowIndex < rows.length) {
      let rowsOnPage = Math.min(maxRowsPerPage, rows.length - rowIndex);
      let sourceCanvas: HTMLCanvasElement | null = null;
      let imageHeight = 0;

      while (rowsOnPage > 0) {
        const pageRows = rows.slice(rowIndex, rowIndex + rowsOnPage);
        container.innerHTML = renderPageMarkup(pageRows, pageNumber, rowIndex);
        sourceCanvas = await html2canvas(container, {
          scale: 2,
          backgroundColor: '#f9fafb',
          useCORS: true,
        });
        imageHeight = (sourceCanvas.height * imageWidth) / sourceCanvas.width;

        if (imageHeight <= pageLimit || rowsOnPage === 1) break;
        rowsOnPage -= 1;
      }

      if (pageNumber > 1) pdf.addPage();
      if (sourceCanvas) {
        pdf.addImage(sourceCanvas.toDataURL('image/png'), 'PNG', 12, 12, imageWidth, Math.min(imageHeight, pageLimit));
      }
      rowIndex += rowsOnPage;
      pageNumber += 1;
    }

    pdf.save(fileName);
  } finally {
    container.remove();
  }
}

async function exportReportsToExcel(rows: ReturnType<typeof getExportRows>, title: string, fileName: string) {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(title.slice(0, 31));
  const headers = Object.keys(rows[0] || {});

  worksheet.columns = headers.map((header) => ({
    header,
    key: header,
    width: Math.max(14, Math.min(34, header.length + 8)),
  }));
  worksheet.addRows(rows);
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0C274B' },
  };
  worksheet.views = [{ state: 'frozen', ySplit: 1 }];

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function Reports({ darkMode, language = 'th' }: ReportsProps) {
  const t = reportTranslations[language];
  const { user } = useAuth();
  const canUseTools = canUseReportTools(user);

  const [reports, setReports] = useState<ReportSqlData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedOfficer, setSelectedOfficer] = useState('all');
  const [missionQuery, setMissionQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Modals & Dropdowns
  const [showModal, setShowModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ReportSqlData | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<ReportSqlData | null>(null);
  const [exportPreview, setExportPreview] = useState<ExportPreviewState | null>(null);

  const uniqueOfficers = useMemo(() => {
    const officersMap = new Map();
    reports.forEach(report => {
      if (!officersMap.has(report.officerId)) {
        officersMap.set(report.officerId, report.officerName);
      }
    });
    return Array.from(officersMap.entries()).map(([id, name]) => ({ id, name }));
  }, [reports]);

  // --- Filtering ---
  const filteredData = useMemo(() => {
    const query = normalizeSearchText(missionQuery);

    return reports.filter((report) => {
      const matchesOfficer = selectedOfficer === 'all' || normalizeSearchText(report.officerId) === normalizeSearchText(selectedOfficer);

      const matchesMission = normalizeSearchText(report.missionName).includes(query) ||
        normalizeSearchText(report.reportId).includes(query) ||
        normalizeSearchText(report.missionId).includes(query);

      // Date Logic
      const reportDate = new Date(report.startTime);
      let matchesDate = true;
      if (startDate && endDate && !isNaN(reportDate.getTime())) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        matchesDate = reportDate >= start && reportDate <= end;
      }
      return matchesOfficer && matchesMission && matchesDate;
    }).sort(sortReportsByLatestTime);
  }, [reports, selectedOfficer, missionQuery, startDate, endDate]);

  const fetchReports = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const rawReports = await getReports<ReportSqlData>();
      const data = [...rawReports].sort(sortReportsByLatestTime);
      setReports(data);
    } catch (err: unknown) {
      console.error("Failed to fetch reports:", err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // Auto-refresh ทุก 5 วินาที
  useEffect(() => {
    const intervalId = setInterval(() => {
      fetchReports(false);
    }, 5000);

    return () => clearInterval(intervalId);
  }, []);

  // --- Pagination ---
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = filteredData.slice(startIndex, endIndex);

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // --- Handlers ---
  const handlePageChange = (page: number) => setCurrentPage(page);

  const handleReset = () => {
    setStartDate('');
    setEndDate('');
    setSelectedOfficer('all');
    setMissionQuery('');
    setCurrentPage(1);
  };

  const showFilterDateRangeAlert = () => {
    void Swal.fire(buildReportFilterDateRangeAlert(language));
  };

  const handleStartDateChange = (value: string) => {
    if (isReportFilterEndBeforeStart(value, endDate)) {
      showFilterDateRangeAlert();
      return;
    }

    setStartDate(value);
    setCurrentPage(1);
  };

  const handleEndDateChange = (value: string) => {
    if (isReportFilterEndBeforeStart(startDate, value)) {
      showFilterDateRangeAlert();
      return;
    }

    setEndDate(value);
    setCurrentPage(1);
  };

  const openExportPreview = (format: ExportFormat, scope: ExportScope, data: ReportSqlData[], reportId?: string) => {
    if (!canUseTools) return;
    if (data.length === 0) return;

    const rows = getExportRows(data, language, t);
    const scopeLabel = scope === 'single'
      ? reportId || t.tableCode
      : scope === 'page'
        ? (language === 'th' ? 'หน้าปัจจุบัน' : 'Current Page')
        : (language === 'th' ? 'ทั้งหมดตามผลค้นหา' : 'All Filtered Results');
    const title = `${t.listTitle} - ${scopeLabel}`;
    const fileName = buildExportFileName(format, scope, reportId);

    setExportPreview({ format, scope, rows, title, fileName, reportId });
  };

  const confirmExportDownload = async () => {
    if (!exportPreview) return;

    if (exportPreview.format === 'pdf') {
      await exportReportsToPdf(exportPreview.rows, exportPreview.title, exportPreview.fileName, language);
    } else {
      await exportReportsToExcel(exportPreview.rows, exportPreview.title, exportPreview.fileName);
    }

    setExportPreview(null);
  };

  const handleExportPDF = (reportId: string) => {
    const report = reports.find((r) => r.reportId === reportId);
    if (report) openExportPreview('pdf', 'single', [report], report.reportId);
  };

  const handleExportExcel = (reportId: string) => {
    const report = reports.find((r) => r.reportId === reportId);
    if (report) openExportPreview('excel', 'single', [report], report.reportId);
  };

  const handleViewDetails = (reportId: string) => {
    const report = reports.find((r) => r.reportId === reportId);
    if (report) {
      setSelectedReport(report);
      setShowModal(true);
    }
  };

  const handleDeleteReport = (reportId: string) => {
    if (!canUseTools) return;
    const report = reports.find((r) => r.reportId === reportId);
    if (!report) return;
    setReportToDelete(report);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteReport = async () => {
    if (!canUseTools) return;
    if (!reportToDelete) return;

    const { endpoint, payload } = buildReportDeleteRequest(reportToDelete);
    const deletedReport = reportToDelete;

    // Close the confirm modal up-front so the success/error dialog never sits
    // stacked on top of it.
    setReportToDelete(null);
    setShowDeleteConfirm(false);

    try {
      const result = await deleteMission<{ message?: string }>(endpoint, payload);
      setReports(prev => prev.filter(r => r.reportId !== deletedReport.reportId));
      await fetchReports(false);
      void Swal.fire(buildReportDeleteSuccessAlert(deletedReport, language, result.message));
    } catch (error) {
      console.error('Failed to delete report:', error);
      const serverMessage = axios.isAxiosError(error)
        ? (error.response?.data as { message?: string } | undefined)?.message
        : undefined;
      void Swal.fire({
        icon: 'error',
        title: language === 'th' ? 'เกิดข้อผิดพลาด!' : 'Error!',
        text: localizeMissionDeleteError(serverMessage, language),
        confirmButtonColor: '#ef4444',
      });
    }
  };

  const formatDuration = (start: string, end: string) => {
    try {
      const s = new Date(start);
      const e = new Date(end);
      if (isNaN(s.getTime()) || isNaN(e.getTime())) return '-';
      const diffMs = e.getTime() - s.getTime();
      if (diffMs < 0) return '-';
      const totalMinutes = Math.floor(diffMs / 60000);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      if (hours > 0) return `${hours} ${language === 'th' ? 'ชม.' : 'hr'} ${minutes} ${language === 'th' ? 'นาที' : 'min'}`;
      return `${minutes} ${language === 'th' ? 'นาที' : 'min'}`;
    } catch {
      return '-';
    }
  };

  const activeFilterCount = [
    missionQuery,
    startDate,
    endDate,
    selectedOfficer !== 'all' ? selectedOfficer : '',
  ].filter(Boolean).length;

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      const startPage = Math.max(2, currentPage - 1);
      const endPage = Math.min(totalPages - 1, currentPage + 1);
      for (let i = startPage; i <= endPage; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  // Stats counts
  const totalCount = reports.length;
  const waitingCount = reports.filter((report) => getNormalizedReportStatus(report) === 'waiting').length;
  const completedCount = reports.filter((report) => getNormalizedReportStatus(report).includes('completed')).length;
  const emergencyCount = reports.filter((report) => {
    const status = getNormalizedReportStatus(report);
    return normalizeSearchText(report.reportId).startsWith('emer') || status.includes('emergency');
  }).length;
  const todayCount = reports.filter(r => {
    const reportDate = new Date(r.startTime);
    const today = new Date();
    return reportDate.toDateString() === today.toDateString();
  }).length;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {[
          { label: t.totalReports, value: totalCount, icon: ClipboardList, iconBg: 'bg-sky-700', isEmergency: false },
          { label: language === 'th' ? 'รอดำเนินการ' : 'Pending', value: waitingCount, icon: Clock, iconBg: 'bg-amber-600', isEmergency: false },
          { label: language === 'th' ? 'เสร็จสิ้น' : 'Completed', value: completedCount, icon: CheckCircle2, iconBg: 'bg-emerald-600', isEmergency: false },
          { label: language === 'th' ? 'งานฉุกเฉิน' : 'Emergency', value: emergencyCount, icon: AlertTriangle, iconBg: 'bg-red-600', isEmergency: true },
          { label: language === 'th' ? 'วันนี้' : 'Today', value: todayCount, icon: Calendar, iconBg: 'bg-blue-600', isEmergency: false },
        ].map(({ label, value, icon: Icon, iconBg, isEmergency }) => (
          <div 
            key={label} 
            className={`rounded-lg border px-4 py-3 shadow-sm transition-shadow hover:shadow-md flex items-center gap-3 ${
              isEmergency && value > 0
                ? darkMode 
                  ? 'bg-red-950/30 border-red-800/50' 
                  : 'bg-red-50 border-red-200 shadow-sm'
                : darkMode 
                  ? 'bg-slate-900 border-slate-800'
                  : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <div className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 ${iconBg}`}>
              <Icon className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className={`mb-1 text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{label}</p>
              <p className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      {(() => {
        const controlClass = `h-10 rounded-md border text-xs shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 ${darkMode ? 'bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-sky-500' : 'bg-white border-slate-200 text-slate-700 placeholder-slate-400 focus:border-sky-400'}`;
        const optionClass = darkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-900';

        return (
          <div className={`rounded-lg border px-4 py-3 shadow-sm ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="mb-3">
              <h2 className={`text-base font-bold leading-6 ${darkMode ? 'text-white' : 'text-slate-950'}`}>
                {t.listTitle}
              </h2>
              <p className={`text-xs leading-5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {t.reportArchive}
              </p>
            </div>

            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-1 flex-wrap items-center gap-2">
                <div className="relative w-full sm:w-[260px]">
                  <Search className={`absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                  <input
                    type="text"
                    placeholder={t.missionPlaceholder}
                    value={missionQuery}
                    onChange={(e) => {
                      setMissionQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className={`${controlClass} w-full pl-9 pr-8`}
                  />
                  {missionQuery && (
                    <button
                      onClick={() => {
                        setMissionQuery('');
                        setCurrentPage(1);
                      }}
                      className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 transition-colors ${darkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-400 hover:bg-slate-100'}`}
                      aria-label={t.reset}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <input
                  type="date"
                  aria-label={t.startDate}
                  value={startDate}
                  max={endDate || undefined}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  className={`${controlClass} w-[150px] px-3 ${darkMode ? 'scheme-dark' : ''}`}
                />

                <input
                  type="date"
                  aria-label={t.endDate}
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                  className={`${controlClass} w-[150px] px-3 ${darkMode ? 'scheme-dark' : ''}`}
                />

                <select
                  value={selectedOfficer}
                  onChange={(e) => {
                    setSelectedOfficer(e.target.value);
                    setCurrentPage(1);
                  }}
                  className={`${controlClass} w-[150px] cursor-pointer px-3`}
                  aria-label={t.filterOfficer}
                >
                  <option value="all" className={optionClass}>{t.filterOfficer}</option>
                  {uniqueOfficers.map((officer) => (
                    <option key={officer.id} value={officer.id} className={optionClass}>
                      {officer.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  onClick={handleReset}
                  disabled={activeFilterCount === 0}
                  className={`h-10 rounded-md border px-4 text-xs font-semibold shadow-sm transition-all ${
                    activeFilterCount > 0
                      ? darkMode
                        ? 'border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      : darkMode
                        ? 'cursor-not-allowed border-slate-800 bg-slate-900/60 text-slate-600'
                        : 'cursor-not-allowed border-slate-200 bg-white text-slate-300'
                  }`}
                >
                  {t.reset}
                  {activeFilterCount > 0 && <span className="ml-1">({activeFilterCount})</span>}
                </button>

                {canUseTools && (
                  <>
                    <button
                      onClick={() => openExportPreview('pdf', 'all', filteredData)}
                      disabled={filteredData.length === 0}
                      className={`flex h-10 items-center gap-2 rounded-md px-4 text-xs font-bold shadow-sm transition-all ${
                        filteredData.length === 0
                          ? darkMode ? 'cursor-not-allowed bg-slate-800 text-slate-600' : 'cursor-not-allowed bg-slate-100 text-slate-300'
                          : 'bg-rose-600 text-white hover:bg-rose-700'
                      }`}
                    >
                      <FileText className="h-3.5 w-3.5" />
                      <span>PDF</span>
                    </button>
                    <button
                      onClick={() => openExportPreview('excel', 'all', filteredData)}
                      disabled={filteredData.length === 0}
                      className={`flex h-10 items-center gap-2 rounded-md px-4 text-xs font-bold shadow-sm transition-all ${
                        filteredData.length === 0
                          ? darkMode ? 'cursor-not-allowed bg-slate-800 text-slate-600' : 'cursor-not-allowed bg-slate-100 text-slate-300'
                          : 'bg-emerald-600 text-white hover:bg-emerald-700'
                      }`}
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Excel</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Table Section */}
      <div className={`overflow-hidden rounded-lg border shadow-sm ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
        {error ? (
          <div className={`p-12 text-center ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className={`mx-auto mb-4 h-14 w-14 rounded-lg flex items-center justify-center ${darkMode ? 'bg-red-900/20' : 'bg-red-50'}`}>
              <AlertTriangle className="w-7 h-7 text-red-500" />
            </div>
            <h3 className={`text-xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{t.errorTitle}</h3>
            <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{error}</p>
          </div>
        ) : !loading && filteredData.length === 0 ? (
          <div className={`p-12 text-center ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className={`mx-auto mb-4 h-14 w-14 rounded-lg flex items-center justify-center ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <FileText className={`w-7 h-7 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
            </div>
            <h3 className={`text-xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{t.noData}</h3>
            <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{t.noDataMessage}</p>
          </div>
        ) : (
          <>
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full min-w-[1160px] table-fixed">
                <thead>
                  <tr className={darkMode ? 'bg-slate-800' : 'bg-slate-100'}>
                    <th className={`w-[72px] border-b px-6 py-4 text-center text-xs font-bold uppercase tracking-normal ${darkMode ? 'border-slate-700 text-slate-300' : 'border-slate-200 text-slate-500'}`}>{t.tableNo}</th>
                    <th className={`w-[150px] border-b px-6 py-4 text-left text-xs font-bold uppercase tracking-normal ${darkMode ? 'border-slate-700 text-slate-300' : 'border-slate-200 text-slate-500'}`}>{t.tableCode}</th>
                    <th className={`w-[150px] border-b px-6 py-4 text-left text-xs font-bold uppercase tracking-normal ${darkMode ? 'border-slate-700 text-slate-300' : 'border-slate-200 text-slate-500'}`}>{t.tableDate}</th>
                    <th className={`w-[190px] border-b px-6 py-4 text-left text-xs font-bold uppercase tracking-normal ${darkMode ? 'border-slate-700 text-slate-300' : 'border-slate-200 text-slate-500'}`}>{t.tableOfficer}</th>
                    <th className={`w-[220px] border-b px-6 py-4 text-left text-xs font-bold uppercase tracking-normal ${darkMode ? 'border-slate-700 text-slate-300' : 'border-slate-200 text-slate-500'}`}>{t.tableMission}</th>
                    <th className={`w-[220px] border-b px-6 py-4 text-left text-xs font-bold uppercase tracking-normal ${darkMode ? 'border-slate-700 text-slate-300' : 'border-slate-200 text-slate-500'}`}>{t.tableDescription}</th>
                    <th className={`w-[130px] border-b px-6 py-4 text-center text-xs font-bold uppercase tracking-normal ${darkMode ? 'border-slate-700 text-slate-300' : 'border-slate-200 text-slate-500'}`}>{t.tableDuration}</th>
                    <th className={`w-[160px] border-b px-6 py-4 text-center text-xs font-bold uppercase tracking-normal ${darkMode ? 'border-slate-700 text-slate-300' : 'border-slate-200 text-slate-500'}`}>{t.tableActions}</th>
                  </tr>
                </thead>
                <tbody className={darkMode ? 'divide-y divide-slate-800' : 'divide-y divide-slate-100'}>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, index) => (
                      <tr key={`loading-${index}`} className={darkMode ? 'border-b border-gray-700' : 'border-b border-gray-100'}>
                        <td className="px-4 py-4"><div className={`mx-auto h-4 w-6 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} animate-pulse`} /></td>
                        <td className="px-4 py-4"><div className={`h-4 w-32 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} animate-pulse`} /></td>
                        <td className="px-4 py-4"><div className={`h-4 w-28 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} animate-pulse`} /></td>
                        <td className="px-4 py-4"><div className={`h-4 w-32 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} animate-pulse`} /></td>
                        <td className="px-4 py-4"><div className={`h-4 w-40 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} animate-pulse`} /></td>
                        <td className="px-4 py-4"><div className={`h-4 w-44 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} animate-pulse`} /></td>
                        <td className="px-4 py-4"><div className={`mx-auto h-4 w-20 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} animate-pulse`} /></td>
                        <td className="px-4 py-4"><div className={`mx-auto h-9 w-28 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} animate-pulse`} /></td>
                      </tr>
                    ))
                  ) : currentData.map((report, index) => (
                    <tr key={report.reportId} className={`transition-colors ${darkMode ? 'hover:bg-slate-800/70' : 'hover:bg-slate-50/80'}`}>
                      {/* No. */}
                      <td className={`px-6 py-4 text-center text-sm font-semibold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {startIndex + index + 1}
                      </td>

                      {/* Report Code */}
                      <td className="px-6 py-4">
                        <div className="space-y-1.5">
                          {report.reportId ? (
                            <p className={`font-semibold text-sm ${darkMode ? 'text-slate-100' : 'text-slate-700'}`}>{report.reportId}</p>
                          ) : (
                            <p className="font-semibold text-sm text-red-500">{t.na}</p>
                          )}
                          <div className={`flex items-center gap-1.5 text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            <Clock className="w-3.5 h-3.5" />
                            <span>
                              {report.startTime?.includes('T') ? new Date(report.startTime).toLocaleTimeString(language === 'th' ? 'th-TH' : 'en-US', { hour: '2-digit', minute: '2-digit' }) : report.startTime}
                              {report.endTime && <> - {report.endTime?.includes('T') ? new Date(report.endTime).toLocaleTimeString(language === 'th' ? 'th-TH' : 'en-US', { hour: '2-digit', minute: '2-digit' }) : report.endTime}</>}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="px-6 py-4">
                        <div className="space-y-1.5 text-sm">
                          <div className={`flex items-center gap-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            <Calendar className="w-3.5 h-3.5 shrink-0" />
                            <span>
                              {report.startTime?.includes("T")
                                ? new Date(report.startTime).toLocaleDateString(language === "th" ? "th-TH" : "en-US", { day: '2-digit', month: 'short', year: 'numeric' })
                                : report.startTime}
                            </span>
                          </div>
                          {(() => {
                            const statusBadge = getReportStatusBadge(report, language);
                            if (!statusBadge) return null;

                            return (
                              <span className={`inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ${getStatusBadgeClass(statusBadge.tone, darkMode)}`}>
                                {statusBadge.label}
                              </span>
                            );
                          })()}
                        </div>
                      </td>

                      {/* Officer */}
                      <td className="px-6 py-4">
                        <div className={`flex min-w-0 items-center gap-2 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                          <User className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate text-sm font-semibold">{report.officerName}</span>
                        </div>
                      </td>

                      {/* Mission */}
                      <td className="px-6 py-4">
                        {report.missionName ? (
                          <p className={`line-clamp-2 text-sm font-semibold ${darkMode ? 'text-slate-100' : 'text-slate-700'}`}>{report.missionName}</p>
                        ) : (
                          <span className="px-2.5 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full border border-red-200 whitespace-nowrap">
                            {t.unassigned}
                          </span>
                        )}
                      </td>

                      {/* Description */}
                      <td className="px-6 py-4">
                        <p className={`text-sm leading-6 line-clamp-2 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{report.description || '-'}</p>
                      </td>

                      {/* Duration */}
                      <td className="px-6 py-4 text-center">
                        <div className={`flex items-center justify-center gap-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          <Clock className="w-3.5 h-3.5 shrink-0" />
                          <span className="text-sm">{formatDuration(report.startTime, report.endTime)}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleViewDetails(report.reportId)}
                            className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${darkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white' : 'bg-slate-100 text-slate-500 hover:bg-sky-50 hover:text-sky-600'}`}
                            title={t.viewDetails}
                            aria-label={`${t.viewDetails} ${report.reportId}`}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {canUseTools && (
                            <>
                              <button
                                onClick={() => handleExportPDF(report.reportId)}
                                className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${darkMode ? 'bg-rose-950/40 text-rose-300 hover:bg-rose-600 hover:text-white' : 'bg-rose-50 text-rose-600 hover:bg-rose-100'}`}
                                title={t.exportPDF}
                                aria-label={`${t.exportPDF} ${report.reportId}`}
                              >
                                <FileText className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleExportExcel(report.reportId)}
                                className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${darkMode ? 'bg-emerald-950/40 text-emerald-300 hover:bg-emerald-600 hover:text-white' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
                                title={t.exportExcel}
                                aria-label={`${t.exportExcel} ${report.reportId}`}
                              >
                                <Download className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteReport(report.reportId)}
                                className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${darkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-600 hover:text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                title={t.delete}
                                aria-label={`${t.delete} ${report.reportId}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className={`lg:hidden divide-y ${darkMode ? 'divide-slate-800' : 'divide-slate-100'}`}>
              {loading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <div key={`mobile-loading-${index}`} className={`p-4 ${darkMode ? 'bg-slate-900' : 'bg-white'}`}>
                    <div className={`h-4 w-36 rounded mb-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} animate-pulse`} />
                    <div className={`h-4 w-52 rounded mb-2 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} animate-pulse`} />
                    <div className={`h-3 w-28 rounded mb-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} animate-pulse`} />
                    <div className="flex gap-2">
                      <div className={`h-9 flex-1 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} animate-pulse`} />
                      <div className={`h-9 w-16 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} animate-pulse`} />
                      <div className={`h-9 w-16 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} animate-pulse`} />
                    </div>
                  </div>
                ))
              ) : currentData.map((report) => (
                <div key={report.reportId} className={`p-4 ${darkMode ? 'bg-slate-900' : 'bg-white'}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {report.reportId ? (
                          <span className={`text-sm font-bold ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>{report.reportId}</span>
                        ) : (
                          <span className="text-sm font-bold text-red-500">{t.na}</span>
                        )}
                        <span className={`text-xs flex items-center gap-1 rounded-full px-2 py-0.5 ${darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-500'}`}>
                          <Clock className="w-3 h-3" />
                          {formatDuration(report.startTime, report.endTime)}
                        </span>
                      </div>

                      {report.missionName ? (
                        <div className={`text-sm mb-1 font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{report.missionName}</div>
                      ) : (
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2.5 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">{t.unassigned}</span>
                          {canUseTools && <button className="text-xs text-blue-500 hover:underline cursor-pointer">{t.assignActivity}</button>}
                        </div>
                      )}

                      {report.description && (
                        <div className={`text-xs mt-1 line-clamp-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{report.description}</div>
                      )}

                      <div className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{report.officerName}</div>
                      <div className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                        {report.startTime?.includes('T') ? new Date(report.startTime).toLocaleString(language === 'th' ? 'th-TH' : 'en-US') : report.startTime}
                      </div>
                      {(() => {
                        const statusBadge = getReportStatusBadge(report, language);
                        if (!statusBadge) return null;

                        return (
                          <span className={`mt-2 inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ${getStatusBadgeClass(statusBadge.tone, darkMode)}`}>
                            {statusBadge.label}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleViewDetails(report.reportId)} className="flex-1 px-4 py-2.5 bg-[#4f46e5] hover:bg-[#4338ca] text-white rounded-lg transition-all font-medium flex items-center justify-center gap-2 cursor-pointer shadow-sm"><Eye className="w-4 h-4" /><span className="text-sm">{t.viewDetails}</span></button>
                    {canUseTools && (
                      <>
                        <button onClick={() => handleExportPDF(report.reportId)} className="px-3 py-2.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg transition-all font-medium cursor-pointer shadow-sm"><span className="text-sm">PDF</span></button>
                        <button onClick={() => handleExportExcel(report.reportId)} className="px-3 py-2.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-all font-medium cursor-pointer shadow-sm"><span className="text-sm">Excel</span></button>
                        <button onClick={() => handleDeleteReport(report.reportId)} className="px-3 py-2.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition-all font-medium cursor-pointer shadow-sm"><Trash2 className="w-4 h-4" /></button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {!loading && (
            <div className={`border-t px-6 py-4 ${darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-100 bg-white'}`}>
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="order-3 flex items-center gap-2">
                  <label className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{t.itemsPerPage}:</label>
                  <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className={`h-8 rounded-md border px-2 text-sm font-semibold cursor-pointer ${darkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-600'} focus:outline-none focus:ring-2 focus:ring-emerald-500/30`}>
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>
                <div className={`order-1 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{t.showing} {filteredData.length === 0 ? 0 : startIndex + 1} - {Math.min(endIndex, filteredData.length)} {t.of} {filteredData.length}</div>
                <div className="order-2 flex items-center gap-1">
                  <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className={`flex h-8 w-8 items-center justify-center rounded-md text-sm font-medium transition-all ${currentPage === 1 ? 'opacity-40 cursor-not-allowed' : darkMode ? 'cursor-pointer hover:bg-slate-800' : 'cursor-pointer hover:bg-slate-100'} ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}><ChevronLeft className="w-4 h-4" /></button>
                  {getPageNumbers().map((page, index) => {
                    if (page === '...') return <span key={`ellipsis-${index}`} className={`px-2 py-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>...</span>;
                    return (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page as number)}
                        className={`flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm font-bold transition-all cursor-pointer ${currentPage === page
                            ? darkMode ? 'bg-slate-800 text-slate-300 ring-1 ring-slate-700' : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'
                            : darkMode
                              ? 'text-slate-300 hover:bg-slate-800'
                              : 'text-slate-600 hover:bg-slate-100'
                          }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                  <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage >= totalPages} className={`flex h-8 w-8 items-center justify-center rounded-md text-sm font-medium transition-all ${currentPage >= totalPages ? 'opacity-40 cursor-not-allowed' : darkMode ? 'cursor-pointer hover:bg-slate-800' : 'cursor-pointer hover:bg-slate-100'} ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}><ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
            )}
          </>
        )}
      </div>

      {exportPreview && (() => {
        const previewHeaders = Object.keys(exportPreview.rows[0] || {});
        const previewRows = exportPreview.rows.slice(0, 25);
        const formatLabel = exportPreview.format === 'pdf' ? 'PDF' : 'Excel';
        const scopeLabel = exportPreview.scope === 'single'
          ? exportPreview.reportId || t.tableCode
          : exportPreview.scope === 'page'
            ? (language === 'th' ? 'หน้าปัจจุบัน' : 'Current page')
            : (language === 'th' ? 'ทั้งหมดตามผลค้นหา' : 'All filtered results');

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className={`w-full max-w-6xl max-h-[90vh] rounded-lg border shadow-2xl overflow-hidden flex flex-col ${
              darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            }`}>
              <div className={`px-5 py-4 border-b flex items-start justify-between gap-4 ${
                darkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-[oklch(0.985_0.006_255)]'
              }`}>
                <div>
                  <div className={`text-xs font-bold uppercase tracking-wide mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {language === 'th' ? 'ตัวอย่างก่อนดาวน์โหลด' : 'Export Preview'}
                  </div>
                  <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-[#0c274b]'}`}>
                    {formatLabel} · {scopeLabel}
                  </h3>
                  <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {language === 'th' ? 'จำนวนข้อมูล' : 'Rows'} {exportPreview.rows.length} {t.itemsTotal}
                    {exportPreview.rows.length > previewRows.length && (
                      <span> · {language === 'th' ? `แสดงตัวอย่าง ${previewRows.length} รายการแรก` : `Showing first ${previewRows.length} rows`}</span>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => setExportPreview(null)}
                  className={`h-9 w-9 rounded-lg inline-flex items-center justify-center transition-all ${
                    darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
                  }`}
                  aria-label={language === 'th' ? 'ปิดตัวอย่าง' : 'Close preview'}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className={`px-5 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className={`rounded-lg border overflow-auto max-h-[56vh] ${
                  darkMode ? 'border-gray-700' : 'border-gray-200'
                }`}>
                  <table className="w-full min-w-[1100px] text-sm">
                    <thead className={darkMode ? 'bg-slate-800' : 'bg-slate-100'}>
                      <tr>
                        {previewHeaders.map((header) => (
                          <th key={header} className={`border-r px-3 py-2 text-left text-xs font-bold uppercase tracking-wide ${darkMode ? 'border-slate-700 text-slate-300' : 'border-slate-200 text-slate-500'}`}>
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, rowIndex) => (
                        <tr key={`${exportPreview.fileName}-${rowIndex}`} className={`border-b ${
                          rowIndex % 2 === 0
                            ? darkMode ? 'bg-gray-800' : 'bg-white'
                            : darkMode ? 'bg-gray-800/80' : 'bg-[oklch(0.99_0.004_255)]'
                        } ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                          {previewHeaders.map((header) => (
                            <td key={`${header}-${rowIndex}`} className={`px-3 py-2 align-top border-r max-w-56 break-words ${
                              darkMode ? 'border-gray-700 text-gray-300' : 'border-gray-200 text-gray-700'
                            }`}>
                              {row[header] ?? '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className={`px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
                darkMode ? 'bg-gray-900' : 'bg-[oklch(0.985_0.006_255)]'
              }`}>
                <div className={`text-xs sm:text-sm break-all ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {exportPreview.fileName}
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => setExportPreview(null)}
                    className={`h-10 px-4 rounded-lg border text-sm font-bold transition-all ${
                      darkMode ? 'border-gray-600 text-gray-200 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-white'
                    }`}
                  >
                    {language === 'th' ? 'ยกเลิก' : 'Cancel'}
                  </button>
                  <button
                    onClick={() => void confirmExportDownload()}
                    className="h-10 px-4 rounded-lg bg-[#0c274b] hover:bg-[#153a67] text-white text-sm font-bold transition-all inline-flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>{language === 'th' ? `ดาวน์โหลด ${formatLabel}` : `Download ${formatLabel}`}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      <DeleteReportModal
        show={showDeleteConfirm}
        reportId={reportToDelete?.reportId ?? null}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDeleteReport}
        language={language}
        darkMode={darkMode}
      />

      {showModal && selectedReport && (
        <ReportDetailModal
          report={selectedReport}
          darkMode={darkMode}
          language={language}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
