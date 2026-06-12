import { useRef, useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Calendar, Eye, Edit, Trash2, Clock, User, ChevronLeft, ChevronRight, ClipboardList, MapPin, Hourglass, PlayCircle, CheckCircle2, Siren, AlertTriangle } from 'lucide-react';
import { type SpotCheckItem } from '../features/spot-check/types';
import { ViewModal, DeleteModal, ActionModal, SpotCheckFormModal, generateReportId } from '../components/modals/SpotCheckModals';
import Swal from 'sweetalert2';
import axios from 'axios';
import { SpotCheckFilters } from '../components/ui/SpotCheckFilters';
import { spotCheckTranslations, type SpotCheckLanguage } from '../locales/spotCheckTranslations';
import { useAuth } from '../contexts/useAuth';
import { canUseActivityTools, isSuperAdmin } from '../lib/permissions';
import { buildMissionLocationPayload } from '../features/spot-check/missionPayload';
import { buildMissionActionPayload } from '../features/spot-check/missionActionPayload';
import { localizeMissionDeleteError } from '../features/missionDeleteError';
import { isMissionEndTimeBeforeStartTime, isMissionStartTimeInFuture, isMissionEndTimePassed, isMissionStartDateInPast } from '../features/spot-check/missionTimeValidation';
import { applyOverlapAlertLayer } from '../features/spot-check/overlapAlertLayer';
import { isFilterEndBeforeStart } from '../features/dateRangeValidation';
import { sortReportsByLatestTime } from '../features/reports/reportTable';
import {
  createMission,
  deleteMission,
  getLocations,
  getOfficers,
  getReports,
  patchMissionAction,
  updateMission,
} from '../services/missionService';

export interface MissionSqlFormData {
  missionId: string;
  reportId: string;
  missionName: string;
  startTime: string;
  endTime: string;
  description: string;
  locationId: number | '';
  locationCode: string;
  locationName: string;
  latitude: string;
  longitude: string;
  officerId: number | '';
  officerName: string;
  deviceCode: string;
  priority: 'high' | 'medium' | 'low';
  status: string;
  duration: number;
  note: string;
}

interface SpotCheckProps {
  darkMode: boolean;
  language: SpotCheckLanguage;
}

interface MissionReportResponse {
  reportId: string;
  missionId: number;
  missionName: string;
  startTime: string;
  endTime: string;
  description: string;
  officerId: number;
  officerName: string;
  locationId?: number;
  LocationId?: number;
  locationName?: string;
  LocationName?: string;
  location_code?: string;
  locationCode?: string;
  locationcode?: string;
  LocationCode?: string;
  location?: {
    locationName?: string;
    LocationName?: string;
    locationCode?: string;
    LocationCode?: string;
  };
  Locations?: Array<{
    locationName?: string;
    LocationName?: string;
    locationCode?: string;
    LocationCode?: string;
  }>;
  missionStatus: string;
  deviceName?: string;
  deviceCode?: string;
  deviceType?: string;
  serialNo?: string;
  latitude?: string;
  longitude?: string;
  priority?: string;
  duration?: number;
  note?: string;
}

interface LocationLookupItem {
  locationId?: number;
  LocationId?: number;
  locationName?: string;
  LocationName?: string;
  locationCode?: string;
  locationcode?: string;
  LocationCode?: string;
  location_code?: string;
}

const getReportLocationId = (report: MissionReportResponse) => report.locationId ?? report.LocationId;

const getReportLocationCode = (report: MissionReportResponse) =>
  report.locationCode ??
  report.locationcode ??
  report.LocationCode ??
  report.location_code ??
  report.location?.locationCode ??
  report.location?.LocationCode ??
  report.Locations?.[0]?.locationCode ??
  report.Locations?.[0]?.LocationCode;

const getReportLocationName = (report: MissionReportResponse) =>
  report.locationName ??
  report.LocationName ??
  report.location?.locationName ??
  report.location?.LocationName ??
  report.Locations?.[0]?.locationName ??
  report.Locations?.[0]?.LocationName ??
  '';

const getLookupLocationId = (location: LocationLookupItem) => location.locationId ?? location.LocationId;

const getLookupLocationCode = (location: LocationLookupItem) =>
  location.locationCode ?? location.locationcode ?? location.LocationCode ?? location.location_code;

const getLookupLocationName = (location: LocationLookupItem) =>
  location.locationName ?? location.LocationName ?? '';

type OverlapConflictScope = 'device' | 'officer' | 'both';

interface OverlapConflict {
  reportId?: string;
  startTime?: string;
  endTime?: string;
  deviceCode?: string;
  deviceName?: string;
  officerId?: number;
  locationCode?: string;
  locationName?: string;
  conflictOn?: OverlapConflictScope;
}

const formatOverlapDateTime = (value?: string) => {
  if (!value) return '-';
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const OVERLAP_SCOPE_TEXT: Record<OverlapConflictScope, { title: string; reason: string }> = {
  device: {
    title: 'กล้องถูกใช้งานในช่วงเวลาที่ทับซ้อน',
    reason: 'ไม่สามารถบันทึกได้ เนื่องจากกล้องตัวนี้ถูกใช้ในใบงานอื่นที่ช่วงเวลาทับซ้อนกัน',
  },
  officer: {
    title: 'เจ้าหน้าที่มีใบงานในช่วงเวลาที่ทับซ้อน',
    reason: 'ไม่สามารถบันทึกได้ เนื่องจากเจ้าหน้าที่คนนี้มีใบงานอื่นที่ช่วงเวลาทับซ้อนกัน',
  },
  both: {
    title: 'กล้องและเจ้าหน้าที่ทับซ้อนเวลากัน',
    reason: 'ไม่สามารถบันทึกได้ เนื่องจากทั้งกล้องและเจ้าหน้าที่ถูกใช้ในใบงานอื่นที่ช่วงเวลาทับซ้อนกัน',
  },
};

const overlapDetailRow = (label: string, value: string) => `
  <p style="color: #92400e; font-size: 12px; margin: 0 0 4px 0;">${label}</p>
  <p style="color: #334155; font-size: 14px; font-weight: 500; margin: 0 0 12px 0;">${value}</p>
`;

const showOverlapAlert = (
  conflict: OverlapConflict,
  officerLookup?: Map<number, string>,
) => {
  const scope: OverlapConflictScope = conflict.conflictOn ?? 'device';
  const { title, reason } = OVERLAP_SCOPE_TEXT[scope] ?? OVERLAP_SCOPE_TEXT.device;
  const showDevice = scope === 'device' || scope === 'both';
  const showOfficer = scope === 'officer' || scope === 'both';
  const officerName =
    conflict.officerId != null ? officerLookup?.get(conflict.officerId) : undefined;

  const rows = [
    overlapDetailRow('ช่วงเวลา', `${formatOverlapDateTime(conflict.startTime)} ถึง ${formatOverlapDateTime(conflict.endTime)}`),
    showDevice ? overlapDetailRow('กล้อง', conflict.deviceName ?? conflict.deviceCode ?? '-') : '',
    showOfficer ? overlapDetailRow('เจ้าหน้าที่', officerName ?? (conflict.officerId != null ? String(conflict.officerId) : '-')) : '',
    overlapDetailRow('สถานที่', conflict.locationName ?? conflict.locationCode ?? '-'),
  ].join('');

  Swal.fire({
    icon: 'warning',
    title: `<span style="color: #b45309;">${title}</span>`,
    html: `
      <div style="text-align: center;">
        <p style="color: #666; margin-bottom: 16px; font-size: 14px;">${reason}</p>
        <div style="background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); padding: 16px; border-radius: 12px; border: 1px solid #fde68a; text-align: left;">
          <p style="color: #92400e; font-size: 12px; margin: 0 0 4px 0;">รหัสงานที่ชนกัน</p>
          <p style="color: #d97706; font-size: 18px; font-weight: 700; font-family: 'Monaco', 'Consolas', monospace; margin: 0 0 12px 0;">${conflict.reportId ?? '-'}</p>
          ${rows}
        </div>
      </div>
    `,
    confirmButtonText: 'ตกลง',
    confirmButtonColor: '#f59e0b',
    background: '#ffffff',
    didOpen: () => applyOverlapAlertLayer(Swal.getContainer()),
  });
};

const handleOverlapError = (
  error: unknown,
  officerLookup?: Map<number, string>,
): boolean => {
  if (axios.isAxiosError(error) && error.response?.status === 409) {
    const data = error.response.data as { data?: OverlapConflict } | undefined;
    showOverlapAlert(data?.data ?? {}, officerLookup);
    return true;
  }
  return false;
};

const buildLocationLookup = (locations: LocationLookupItem[]) => {
  const lookup = new Map<string, string>();

  locations.forEach((location) => {
    const name = getLookupLocationName(location);
    if (!name) return;

    const id = getLookupLocationId(location);
    const code = getLookupLocationCode(location);

    if (id != null) lookup.set(`id:${id}`, name);
    if (code) lookup.set(`code:${code}`, name);
  });

  return lookup;
};

// Map API missionStatus code to UI status
const mapMissionStatus = (code: string): 'waiting' | 'accepted' | 'in-progress' | 'completed' | 'cancelled' | 'emergency' | 'emergency-in-progress' | 'emergency-completed' | 'emergency-cancelled' => {
  switch (code) {
    case '1': return 'waiting';              // PENDING
    case '2': return 'in-progress';          // IN_PROGRESS
    case '3': return 'completed';            // COMPLETED
    case '4': return 'cancelled';            // CANCELLED
    case '5': return 'emergency';            // EMERGENCY
    case '6': return 'emergency-in-progress'; // EMERGENCY_IN_PROGRESS
    case '7': return 'emergency-completed';   // EMERGENCY_COMPLETED
    case '8': return 'emergency-cancelled';   // EMERGENCY_CANCELLED
    default: return 'waiting';
  }
};

export function SpotCheck({ darkMode, language }: SpotCheckProps) {
  const translations = spotCheckTranslations[language];
  const { user } = useAuth();
  const canUseTools = canUseActivityTools(user);
  // SuperAdmin can delete a work order in any status; everyone else is limited
  // to cancelled missions only.
  const canDeleteAnyMission = isSuperAdmin(user);
  const location = useLocation();

  // Get status text based on status value
  const getStatusTextFromCode = (code: string): string => {
    switch (code) {
      case '1': return translations.statusWaiting;
      case '2': return translations.statusInProgress;
      case '3': return translations.statusCompleted;
      case '4': return translations.statusCancelled;
      case '5': return translations.statusEmergency;
      case '6': return translations.statusEmergencyInProgress;
      case '7': return translations.statusEmergencyCompleted;
      case '8': return translations.statusEmergencyCancelled;
      default: return translations.statusWaiting;
    }
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOfficer, setSelectedOfficer] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterDateRangeError, setFilterDateRangeError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Modals state
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState<'accept' | 'start' | 'complete' | 'reject' | null>(null);
  const [selectedItem, setSelectedItem] = useState<SpotCheckItem | null>(null);

  const [copySuccess, setCopySuccess] = useState(false);
  const [spotCheckData, setSpotCheckData] = useState<SpotCheckItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [officerList, setOfficerList] = useState<{ officerId: number; officerName: string }[]>([]);
  const officerLookup = useMemo(
    () => new Map(officerList.map((o) => [o.officerId, o.officerName])),
    [officerList],
  );
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const locationLookupRef = useRef<Map<string, string>>(new Map());
  const openedMissionFromUrlRef = useRef<string | null>(null);
  const [highlightedMissionTarget, setHighlightedMissionTarget] = useState<string | null>(null);
  const [formData, setFormData] = useState<MissionSqlFormData>({
    missionId: '', reportId: '', missionName: '', startTime: '', endTime: '', description: '',
    locationId: '', locationCode: '', locationName: '', latitude: '', longitude: '', officerId: '', officerName: '', deviceCode: '', priority: 'medium', status: 'waiting', duration: 0, note: ''
  });
  const timeRangeOrderErrorMessage = language === 'th'
    ? 'เวลาสิ้นสุดต้องไม่น้อยกว่าเวลาเริ่มต้น'
    : 'End time cannot be earlier than start time';

  const showTimeRangeOrderError = () => {
    Swal.fire({
      icon: 'error',
      title: language === 'th' ? 'ช่วงเวลาไม่ถูกต้อง' : 'Invalid time range',
      text: timeRangeOrderErrorMessage,
      confirmButtonColor: '#ef4444'
    });
  };

  const showStartDateInPastError = () => {
    Swal.fire({
      icon: 'error',
      title: language === 'th' ? 'วันที่เริ่มไม่ถูกต้อง' : 'Invalid start date',
      text: language === 'th'
        ? 'ไม่สามารถสร้างใบงานย้อนหลังได้ กรุณาเลือกวันที่เริ่มเป็นวันปัจจุบันหรือหลังจากนี้'
        : 'Work orders cannot be backdated. Please choose a start date of today or later.',
      confirmButtonColor: '#ef4444'
    });
  };

  const filterDateRangeErrorMessage = language === 'th'
    ? 'เวลาสิ้นสุดต้องไม่ก่อนเวลาเริ่มต้น'
    : 'End time cannot be earlier than start time';

  const handleFilterStartDateChange = (value: string) => {
    setStartDate(value);
    setCurrentPage(1);

    if (isFilterEndBeforeStart({ startDate: value, endDate })) {
      setEndDate('');
      setFilterDateRangeError(filterDateRangeErrorMessage);
      return;
    }

    setFilterDateRangeError('');
  };

  const handleFilterEndDateChange = (value: string) => {
    if (isFilterEndBeforeStart({ startDate, endDate: value })) {
      setFilterDateRangeError(filterDateRangeErrorMessage);
      return;
    }

    setEndDate(value);
    setCurrentPage(1);
    setFilterDateRangeError('');
  };

  const fetchReports = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      const data = await getReports<MissionReportResponse>();
      let locationLookup = locationLookupRef.current;

      if (locationLookup.size === 0 && data.some((report) => !getReportLocationName(report))) {
        try {
          const locations = await getLocations<LocationLookupItem>();
          locationLookup = buildLocationLookup(locations);
          locationLookupRef.current = locationLookup;
        } catch (locationError) {
          console.error('Error fetching location lookup:', locationError);
        }
      }

      const mapped: SpotCheckItem[] = data.map((r: MissionReportResponse) => {
        const locationId = getReportLocationId(r);
        const locationCode = getReportLocationCode(r);
        const locationName =
          getReportLocationName(r) ||
          (locationId != null ? locationLookup.get(`id:${locationId}`) : '') ||
          (locationCode ? locationLookup.get(`code:${locationCode}`) : '') ||
          locationCode ||
          '';

        return ({
        id: r.reportId,
        missionId: String(r.missionId),
        reportId: r.reportId,
        missionName: r.missionName,
        status: mapMissionStatus(r.missionStatus),
        statusText: getStatusTextFromCode(r.missionStatus),
        startTime: r.startTime,
        endTime: r.endTime,
        location: locationName,
        address: '',
        coordinates: r.latitude && r.longitude ? `${r.latitude}, ${r.longitude}` : '',
        officerId: String(r.officerId),
        officerName: r.officerName,
        cameraId: r.deviceName || '',
        deviceName: r.deviceName || '',
        priority: (r.priority as 'low' | 'medium' | 'high') || 'medium',
        reportType: 'daily' as const,
        description: r.description,
        locationId,
        locationCode,
        deviceCode: r.deviceCode,
        latitude: r.latitude,
        longitude: r.longitude,
        duration: r.duration,
        note: r.note,
        });
      }).sort(sortReportsByLatestTime);
      setSpotCheckData(mapped);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  const fetchOfficers = async () => {
    try {
      setOfficerList(await getOfficers<{ officerId: number; officerName: string }>());
    } catch (error) {
      console.error('Error fetching officers:', error);
    }
  };

  useEffect(() => {
    fetchReports();
    fetchOfficers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  // Auto-refresh ทุก 5 วินาที
  useEffect(() => {
    const intervalId = setInterval(() => {
      fetchReports(false);
    }, 5000);

    return () => clearInterval(intervalId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleEventLogNotification = () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }

      refreshTimerRef.current = setTimeout(() => {
        fetchReports(false);
        setCurrentPage(1);
      }, 250);
    };

    window.addEventListener('eventlog:notification', handleEventLogNotification);

    return () => {
      window.removeEventListener('eventlog:notification', handleEventLogNotification);
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const reportId = params.get('reportId');
    const missionId = params.get('missionId');
    const targetKey = reportId ? `report:${reportId}` : missionId ? `mission:${missionId}` : null;

    if (!targetKey || openedMissionFromUrlRef.current === targetKey || spotCheckData.length === 0) {
      return;
    }

    const matchedMission = spotCheckData.find((item) =>
      reportId ? item.reportId === reportId : item.missionId === missionId,
    );
    if (!matchedMission) {
      return;
    }

    openedMissionFromUrlRef.current = targetKey;
    setSearchQuery(reportId || missionId || '');
    setSelectedOfficer('all');
    setSelectedStatus('all');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
    setHighlightedMissionTarget(matchedMission.reportId || matchedMission.missionId);
    setSelectedItem(matchedMission);
    setShowViewModal(true);

    const elementId = `mission-${matchedMission.reportId || matchedMission.missionId}`;
    const highlightTimer = setTimeout(() => setHighlightedMissionTarget(null), 3500);
    const scrollTimer = setTimeout(() => {
      document.getElementById(elementId)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }, 120);

    return () => {
      clearTimeout(highlightTimer);
      clearTimeout(scrollTimer);
    };
  }, [location.search, spotCheckData]);

  const resetForm = () => {
    setFormData({
      missionId: '', reportId: '', missionName: '', startTime: '', endTime: '', description: '',
      locationId: '', locationCode: '', locationName: '', latitude: '', longitude: '', officerId: '', officerName: '', deviceCode: '', priority: 'medium', status: 'waiting', duration: 0, note: ''
    });
  };

  // Lock body scroll when modals are open
  useEffect(() => {
    if (showModal || showViewModal || showEditModal || showDeleteModal || showActionModal) {
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
    }
  }, [showModal, showViewModal, showEditModal, showDeleteModal, showActionModal]);

  // Copy to clipboard function with fallback
  const copyToClipboard = (text: string) => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(
        () => { setCopySuccess(true); setTimeout(() => setCopySuccess(false), 2000); },
        () => { fallbackCopyTextToClipboard(text); }
      );
    } else {
      fallbackCopyTextToClipboard(text);
    }
  };

  const fallbackCopyTextToClipboard = (text: string) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
    document.body.removeChild(textArea);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'accepted': return 'bg-[oklch(72.3%_0.219_149.579)] text-white border-[oklch(72.3%_0.219_149.579)]';
      case 'in-progress': return 'bg-blue-500 text-white border-blue-600';
      case 'completed': return 'bg-purple-100 text-purple-700 border-purple-300';
      case 'cancelled': return 'bg-red-100 text-red-700 border-red-300';
      case 'emergency': return 'bg-red-600 text-white border-red-700 animate-pulse shadow-lg shadow-red-500/50';
      case 'emergency-in-progress': return 'bg-orange-600 text-white border-orange-700 animate-pulse shadow-lg shadow-orange-500/50';
      case 'emergency-completed': return 'bg-purple-600 text-white border-purple-700 shadow-lg shadow-purple-500/50';
      case 'emergency-cancelled': return 'bg-gray-600 text-white border-gray-700 shadow-lg shadow-gray-500/50';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'low': return 'bg-[oklch(85%_0.15_149.579)] text-[oklch(45%_0.25_149.579)]';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const formatActivityDateTime = (value?: string) => {
    if (!value) return { date: '-', time: '' };

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return { date: value, time: '' };

    return {
      date: date.toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }),
      time: date.toLocaleTimeString(language === 'th' ? 'th-TH' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
  };

  const filteredData = spotCheckData.filter((item) => {
    const matchesSearch = searchQuery === '' || (item.reportId?.toLowerCase().includes(searchQuery.toLowerCase())) || item.missionId.toLowerCase().includes(searchQuery.toLowerCase()) || item.missionName.toLowerCase().includes(searchQuery.toLowerCase()) || item.location.toLowerCase().includes(searchQuery.toLowerCase()) || item.officerName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesOfficer = selectedOfficer === 'all' || item.officerId === selectedOfficer; // 
    const matchesStatus = selectedStatus === 'all' || item.status === selectedStatus;

    const itemDate = new Date(item.startTime);
    const matchesDateRange = (() => {
      if (!startDate && !endDate) return true;
      if (isNaN(itemDate.getTime())) return true;

      const start = startDate ? new Date(startDate) : null;
      if (start) start.setHours(0, 0, 0, 0);

      const end = endDate ? new Date(endDate) : null;
      if (end) end.setHours(23, 59, 59, 999);

      if (start && end) return itemDate >= start && itemDate <= end;
      else if (start) return itemDate >= start;
      else if (end) return itemDate <= end;
      return true;
    })();

    return matchesSearch && matchesOfficer && matchesStatus && matchesDateRange;
  }).sort(sortReportsByLatestTime);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const showingFrom = filteredData.length === 0 ? 0 : indexOfFirstItem + 1;
  const showingTo = Math.min(indexOfLastItem, filteredData.length);
  const waitingCount = spotCheckData.filter((item) => item.status === 'waiting').length;
  const activeCount = spotCheckData.filter((item) => item.status === 'accepted' || item.status === 'in-progress').length;
  const completedCount = spotCheckData.filter((item) => item.status === 'completed' || item.status === 'emergency-completed').length;
  const emergencyWaitingCount = spotCheckData.filter((item) => item.status === 'emergency').length;
  const emergencyActiveCount = spotCheckData.filter((item) => item.status === 'emergency-in-progress').length;
  const emergencyCompletedCount = spotCheckData.filter((item) => item.status === 'emergency-completed').length;

  const handlePageChange = (pageNumber: number) => { setCurrentPage(pageNumber); };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      const startPage = Math.max(2, currentPage - 1);
      const endPage = Math.min(totalPages - 1, currentPage + 1);
      if (startPage > 2) pages.push('...');
      for (let i = startPage; i <= endPage; i++) pages.push(i);
      if (endPage < totalPages - 1) pages.push('...');
      if (totalPages > 1) pages.push(totalPages);
    }
    return pages;
  };

  const handleEdit = (item: SpotCheckItem) => {
    if (!canUseTools) return;

    setSelectedItem(item);
    const formatDateTimeLocal = (dateStr?: string) => {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };
    setFormData({
      missionId: item.missionId,
      reportId: item.reportId || '',
      missionName: item.missionName,
      startTime: formatDateTimeLocal(item.startTime),
      endTime: formatDateTimeLocal(item.endTime),
      description: item.description || '',
      locationId: item.locationId || '',
      locationCode: item.locationCode || '',
      locationName: item.location || '',
      latitude: item.latitude || '',
      longitude: item.longitude || '',
      officerId: item.officerId ? Number(item.officerId) : '',
      officerName: item.officerName || '',
      deviceCode: item.deviceCode || '',
      priority: item.priority as 'high' | 'medium' | 'low',
      status: item.status,
      duration: item.duration || 0,
      note: item.note || ''
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!canUseTools) return;
    if (!selectedItem) return;
    if (isMissionEndTimeBeforeStartTime(formData)) {
      showTimeRangeOrderError();
      return;
    }
    setIsLoading(true);
    try {
      const payload = {
        reportId: formData.reportId,
        missionName: formData.missionName,
        startTime: formData.startTime ? new Date(formData.startTime).toISOString() : null,
        endTime: formData.endTime ? new Date(formData.endTime).toISOString() : null,
        description: formData.description || null,
        ...buildMissionLocationPayload(formData),
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        officerId: formData.officerId || null,
        deviceCode: formData.deviceCode || null,
        priority: formData.priority,
        duration: formData.duration || null,
        note: formData.note || null
      };
      
      const result = await updateMission<{ message?: string }>(payload);

      console.log('Mission updated:', result);
      await fetchReports(false);
      setShowEditModal(false);
      setSelectedItem(null);
      resetForm();

      Swal.fire({
        icon: 'success',
        title: '<span style="color: #0c274b;">แก้ไขข้อมูลสำเร็จ!</span>',
        html: `
          <div style="text-align: center;">
            <p style="color: #666; margin-bottom: 16px;">${result.message || 'Update mission success'}</p>
            <div style="background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); padding: 16px; border-radius: 12px; border: 1px solid #fde68a;">
              <p style="color: #92400e; font-size: 12px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 1px;">รหัสงานที่แก้ไข</p>
              <p style="color: #d97706; font-size: 20px; font-weight: 700; font-family: 'Monaco', 'Consolas', monospace; margin: 0;">${formData.reportId}</p>
            </div>
          </div>
        `,
        confirmButtonText: '✓ ตกลง',
        confirmButtonColor: '#22c55e',
        background: '#ffffff'
      });
    } catch (error) {
      if (!handleOverlapError(error, officerLookup)) {
        console.error('Error updating mission:', error);
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด!',
          text: 'ไม่สามารถแก้ไขข้อมูลได้ กรุณาลองใหม่อีกครั้ง',
          confirmButtonText: 'ตกลง',
          confirmButtonColor: '#ef4444'
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!canUseTools) return;
    if (isMissionStartDateInPast(formData.startTime)) {
      showStartDateInPastError();
      return;
    }
    if (isMissionEndTimeBeforeStartTime(formData)) {
      showTimeRangeOrderError();
      return;
    }
    setIsLoading(true);
    try {
      const payload = {
        reportId: formData.reportId || null,
        missionName: formData.missionName,
        startTime: formData.startTime ? new Date(formData.startTime).toISOString() : null,
        endTime: formData.endTime ? new Date(formData.endTime).toISOString() : null,
        description: formData.description || null,
        ...buildMissionLocationPayload(formData),
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        officerId: formData.officerId || null,
        deviceCode: formData.deviceCode || null,
        priority: formData.priority,
        missionStatus: formData.status === 'waiting' ? 'PENDING' : formData.status.toUpperCase(),
        duration: formData.duration || null,
        note: formData.note || null
      };
      
      await createMission(payload);

      await fetchReports(false);
      
      setShowModal(false);
      resetForm();

      Swal.fire({
        icon: 'success',
        title: '<span style="color: #0c274b;">สร้างใบงานสำเร็จ!</span>',
        html: `
          <div style="text-align: center;">
            <p style="color: #666; margin-bottom: 20px; font-size: 14px;">ใบงานถูกสร้างเรียบร้อยแล้ว</p>
            <div style="background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0;">
              <p style="color: #64748b; font-size: 12px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 1px;">รหัสงาน</p>
              <p style="color: #0c274b; font-size: 24px; font-weight: 700; font-family: 'Monaco', 'Consolas', monospace; margin: 0 0 16px 0;">${formData.reportId}</p>
              <div style="border-top: 1px solid #cbd5e1; padding-top: 12px; margin-top: 4px;">
                <p style="color: #64748b; font-size: 12px; margin: 0 0 4px 0;">ชื่อภารกิจ</p>
                <p style="color: #334155; font-size: 16px; font-weight: 500; margin: 0;">${formData.missionName}</p>
              </div>
            </div>
          </div>
        `,
        confirmButtonText: '✓ ตกลง',
        confirmButtonColor: '#22c55e',
        background: '#ffffff',
        showClass: {
          popup: 'animate__animated animate__fadeInDown animate__faster'
        },
        hideClass: {
          popup: 'animate__animated animate__fadeOutUp animate__faster'
        }
      });
    } catch (error) {
      if (!handleOverlapError(error, officerLookup)) {
        console.error('Error creating mission:', error);
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด!',
          text: 'ไม่สามารถสร้างภารกิจได้ กรุณาลองใหม่อีกครั้ง',
          confirmButtonText: 'ตกลง',
          confirmButtonColor: '#ef4444'
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!canUseTools) return;
    if (!selectedItem) return;
    const deletedReportId = selectedItem.reportId;
    const isCancelled = selectedItem.status === 'cancelled' || selectedItem.status === 'emergency-cancelled';
    const endpoint = isCancelled ? '/deletecancelledmission' : '/deletemission';
    const payload = isCancelled
      ? { reportId: selectedItem.reportId }
      : buildMissionActionPayload(selectedItem);

    // Close the confirm modal up-front so it never sits stacked underneath the
    // success/error Swal dialog.
    setShowDeleteModal(false);
    setSelectedItem(null);
    setIsLoading(true);
    try {
      const result = await deleteMission<{ message?: string }>(endpoint, payload);
      console.log('Mission deleted:', result);

      // Refetch data from API to ensure sync with database
      await fetchReports(false);

      Swal.fire({
        icon: 'success',
        title: '<span style="color: #0c274b;">ลบข้อมูลสำเร็จ!</span>',
        html: `
          <div style="text-align: center;">
            <p style="color: #666; margin-bottom: 16px;">${result.message || 'Delete mission success'}</p>
            <div style="background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); padding: 16px; border-radius: 12px; border: 1px solid #fecaca;">
              <p style="color: #991b1b; font-size: 12px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 1px;">รหัสงานที่ลบ</p>
              <p style="color: #dc2626; font-size: 20px; font-weight: 700; font-family: 'Monaco', 'Consolas', monospace; margin: 0;">${deletedReportId}</p>
            </div>
          </div>
        `,
        confirmButtonText: '✓ ตกลง',
        confirmButtonColor: '#22c55e',
        background: '#ffffff'
      });
    } catch (error) {
      console.error('Error deleting mission:', error);
      const serverMessage = axios.isAxiosError(error)
        ? (error.response?.data as { message?: string } | undefined)?.message
        : undefined;
      Swal.fire({
        icon: 'error',
        title: language === 'th' ? 'เกิดข้อผิดพลาด!' : 'Error!',
        text: localizeMissionDeleteError(serverMessage, language),
        confirmButtonColor: '#ef4444'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!canUseTools) return;
    if (!selectedItem || !actionType) return;

    // Close the confirm ("accept job") modal up-front so it never sits stacked
    // underneath a follow-up Swal dialog — e.g. the awaited "not yet start time"
    // warning, which otherwise overlaps the still-open confirm modal.
    setShowActionModal(false);

    // Call API for accept action
    if (actionType === 'accept') {
      const isEmergencyMission = selectedItem.status === 'emergency';

      // Block (and warn) when the job is being accepted after its scheduled end
      // time has already passed — the time window is over, so the user must move
      // the end time first. Emergency missions set their own time, so they skip.
      if (!isEmergencyMission && isMissionEndTimePassed(selectedItem.endTime)) {
        const scheduledEnd = formatActivityDateTime(selectedItem.endTime);
        const expiredResult = await Swal.fire({
          icon: 'warning',
          title: `<span style="color: #b45309;">${translations.acceptAfterEndTitle}</span>`,
          html: `
            <div style="text-align: center;">
              <p style="color: #666; margin-bottom: 16px; font-size: 14px;">${translations.acceptAfterEndMessage}</p>
              <div style="background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); padding: 16px; border-radius: 12px; border: 1px solid #fde68a;">
                <p style="color: #92400e; font-size: 12px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 1px;">${translations.acceptAfterEndScheduledLabel}</p>
                <p style="color: #d97706; font-size: 18px; font-weight: 700; margin: 0;">${scheduledEnd.date} ${scheduledEnd.time}</p>
              </div>
            </div>
          `,
          showCancelButton: true,
          confirmButtonText: translations.acceptAfterEndEditButton,
          cancelButtonText: translations.cancel,
          confirmButtonColor: '#f59e0b',
          cancelButtonColor: '#6b7280',
          background: '#ffffff',
          didOpen: () => applyOverlapAlertLayer(Swal.getContainer()),
        });

        // "Adjust end time" opens the edit modal for this mission; either way we
        // never proceed to accept a job whose time window has already closed.
        if (expiredResult.isConfirmed) {
          // Close the still-open ViewModal first; otherwise the edit modal opens
          // on top of it and the two (same z-index) render stacked/overlapping.
          setShowViewModal(false);
          setActionType(null);
          handleEdit(selectedItem);
        }
        return;
      }

      // Warn (but allow) when the job is being accepted before its scheduled
      // start time. Emergency missions are urgent, so they skip this check.
      if (!isEmergencyMission && isMissionStartTimeInFuture(selectedItem.startTime)) {
        const scheduled = formatActivityDateTime(selectedItem.startTime);
        const earlyAcceptResult = await Swal.fire({
          icon: 'warning',
          title: `<span style="color: #b45309;">${translations.acceptBeforeStartTitle}</span>`,
          html: `
            <div style="text-align: center;">
              <p style="color: #666; margin-bottom: 16px; font-size: 14px;">${translations.acceptBeforeStartMessage}</p>
              <div style="background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); padding: 16px; border-radius: 12px; border: 1px solid #fde68a;">
                <p style="color: #92400e; font-size: 12px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 1px;">${translations.acceptBeforeStartScheduledLabel}</p>
                <p style="color: #d97706; font-size: 18px; font-weight: 700; margin: 0;">${scheduled.date} ${scheduled.time}</p>
              </div>
            </div>
          `,
          showCancelButton: true,
          confirmButtonText: translations.acceptBeforeStartConfirm,
          cancelButtonText: translations.cancel,
          confirmButtonColor: '#f59e0b',
          cancelButtonColor: '#6b7280',
          background: '#ffffff',
          // Lift above the z-[9999] modals so the warning never renders behind
          // a still-open modal (e.g. the mission detail/view modal).
          didOpen: () => applyOverlapAlertLayer(Swal.getContainer()),
        });

        if (!earlyAcceptResult.isConfirmed) {
          return;
        }
      }

      try {
        const result = await patchMissionAction<{ message?: string }>(
          '/confirmmission',
          buildMissionActionPayload(selectedItem),
        );
        
        console.log('Mission confirmed:', result);
        
        // Refetch data from API to ensure sync with database
        await fetchReports(false);
        
        // Check if this was an emergency mission
        const isEmergencyMission = selectedItem.status === 'emergency';
        
        // Success modal with different styling for emergency missions
        Swal.fire({
          icon: 'success',
          title: isEmergencyMission 
            ? '<span style="color: #ea580c;">รับงานฉุกเฉินสำเร็จ!</span>' 
            : '<span style="color: #0c274b;">รับงานสำเร็จ!</span>',
          html: isEmergencyMission 
            ? `
              <div style="text-align: center;">
                <p style="color: #666; margin-bottom: 16px;">${result.message || 'Confirm emergency mission success'}</p>
                <div style="background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%); padding: 16px; border-radius: 12px; border: 1px solid #fed7aa;">
                  <p style="color: #9a3412; font-size: 12px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 1px;">🚨 งานฉุกเฉิน - กำลังปฏิบัติงาน</p>
                  <p style="color: #ea580c; font-size: 20px; font-weight: 700; font-family: 'Monaco', 'Consolas', monospace; margin: 0;">${selectedItem.reportId}</p>
                </div>
              </div>
            `
            : `
              <div style="text-align: center;">
                <p style="color: #666; margin-bottom: 16px;">${result.message || 'Confirm mission success'}</p>
                <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); padding: 16px; border-radius: 12px; border: 1px solid #a7f3d0;">
                  <p style="color: #065f46; font-size: 12px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 1px;">รหัสงาน</p>
                  <p style="color: #059669; font-size: 20px; font-weight: 700; font-family: 'Monaco', 'Consolas', monospace; margin: 0;">${selectedItem.reportId}</p>
                </div>
              </div>
            `,
          confirmButtonText: '✓ ตกลง',
          confirmButtonColor: isEmergencyMission ? '#ea580c' : '#22c55e',
          background: '#ffffff'
        });
      } catch (error) {
        // เมื่อรับงานก่อนเวลาแล้วช่วงเวลาที่กดรับชนกับใบงานอื่น backend จะตอบ 409
        // ให้แสดง alert overlap (กล้อง/เจ้าหน้าที่/ช่วงเวลาที่ชน) แทน error ทั่วไป
        if (!handleOverlapError(error, officerLookup)) {
          console.error('Error confirming mission:', error);
          Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด',
            text: 'ไม่สามารถยืนยันการรับงานได้',
            confirmButtonColor: '#ef4444'
          });
        }
        return;
      }
    } else if (actionType === 'complete') {
      try {
        const result = await patchMissionAction<{ message?: string }>(
          '/completemission',
          buildMissionActionPayload(selectedItem),
        );
        
        console.log('Mission completed:', result);
        
        await fetchReports(false);
        
        Swal.fire({
          icon: 'success',
          title: '<span style="color: #0c274b;">สิ้นสุดปฏิบัติงานสำเร็จ!</span>',
          html: `
            <div style="text-align: center;">
              <p style="color: #666; margin-bottom: 16px;">${result.message || 'Complete mission success'}</p>
              <div style="background: linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%); padding: 16px; border-radius: 12px; border: 1px solid #d8b4fe;">
                <p style="color: #6b21a8; font-size: 12px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 1px;">รหัสงาน</p>
                <p style="color: #7c3aed; font-size: 20px; font-weight: 700; font-family: 'Monaco', 'Consolas', monospace; margin: 0;">${selectedItem.reportId}</p>
              </div>
            </div>
          `,
          confirmButtonText: '✓ ตกลง',
          confirmButtonColor: '#22c55e',
          background: '#ffffff'
        });
      } catch (error) {
        console.error('Error completing mission:', error);
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: 'ไม่สามารถสิ้นสุดปฏิบัติงานได้',
          confirmButtonColor: '#ef4444'
        });
        return;
      }
    } else if (actionType === 'reject') {
      try {
        const result = await patchMissionAction<{ message?: string }>(
          '/cancelmission',
          buildMissionActionPayload(selectedItem),
        );
        
        console.log('Mission cancelled:', result);
        
        await fetchReports(false);
        
        Swal.fire({
          icon: 'success',
          title: '<span style="color: #0c274b;">ยกเลิกรายงานสำเร็จ!</span>',
          html: `
            <div style="text-align: center;">
              <p style="color: #666; margin-bottom: 16px;">${result.message || 'Cancel mission success'}</p>
              <div style="background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); padding: 16px; border-radius: 12px; border: 1px solid #fecaca;">
                <p style="color: #991b1b; font-size: 12px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 1px;">รหัสงานที่ยกเลิก</p>
                <p style="color: #dc2626; font-size: 20px; font-weight: 700; font-family: 'Monaco', 'Consolas', monospace; margin: 0;">${selectedItem.reportId}</p>
              </div>
            </div>
          `,
          confirmButtonText: '✓ ตกลง',
          confirmButtonColor: '#22c55e',
          background: '#ffffff'
        });
      } catch (error) {
        console.error('Error cancelling mission:', error);
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: 'ไม่สามารถยกเลิกรายงานได้',
          confirmButtonColor: '#ef4444'
        });
        return;
      }
    } else if (actionType === 'start') {
      // Refetch data from API for other actions
      await fetchReports(false);
    }

    setActionType(null);
    if (showViewModal) {
      setShowViewModal(false);
      setSelectedItem(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {[
          { label: translations.totalMissions, value: spotCheckData.length, icon: ClipboardList, iconBg: 'bg-sky-700', isEmergency: false, shouldPulse: false },
          { label: translations.waitingMissions, value: waitingCount, icon: Hourglass, iconBg: 'bg-amber-600', isEmergency: false, shouldPulse: false },
          { label: translations.activeMissions, value: activeCount, icon: PlayCircle, iconBg: 'bg-blue-600', isEmergency: false, shouldPulse: false },
          { label: translations.completedMissions, value: completedCount, icon: CheckCircle2, iconBg: 'bg-emerald-600', isEmergency: false, shouldPulse: false },
          { label: language === 'th' ? 'รอรับงานฉุกเฉิน' : 'Emergency Waiting', value: emergencyWaitingCount, icon: Siren, iconBg: 'bg-red-600', isEmergency: true, shouldPulse: true },
          { label: language === 'th' ? 'งานฉุกเฉินกำลังดำเนินการ' : 'Emergency Active', value: emergencyActiveCount, icon: AlertTriangle, iconBg: 'bg-orange-600', isEmergency: true, shouldPulse: true },
          { label: language === 'th' ? 'เสร็จสิ้นงานฉุกเฉิน' : 'Emergency Completed', value: emergencyCompletedCount, icon: CheckCircle2, iconBg: 'bg-purple-600', isEmergency: true, shouldPulse: false },
        ].map(({ label, value, icon: Icon, iconBg, isEmergency, shouldPulse }) => (
          <div 
            key={label} 
            className={`rounded-2xl px-5 py-4 border transition-shadow hover:shadow-md flex items-center gap-4 ${
              isEmergency && value > 0
                ? darkMode 
                  ? `bg-red-950/30 border-red-800/50 ${shouldPulse ? 'animate-pulse' : ''}` 
                  : `bg-red-50 border-red-200 shadow-sm ${shouldPulse ? 'animate-pulse' : ''}`
                : darkMode 
                  ? 'bg-slate-800 border-slate-700/50' 
                  : 'bg-white border-slate-200/80 shadow-sm'
            }`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${iconBg} ${shouldPulse && value > 0 ? 'animate-pulse' : ''}`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className={`text-xs font-medium mb-1 ${isEmergency && value > 0 ? (darkMode ? 'text-red-400' : 'text-red-600') : (darkMode ? 'text-slate-400' : 'text-slate-500')}`}>{label}</p>
              <p className={`text-2xl font-bold ${isEmergency && value > 0 ? (darkMode ? 'text-red-400' : 'text-red-600') : (darkMode ? 'text-white' : 'text-slate-800')}`}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <SpotCheckFilters
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        startDate={startDate}
        setStartDate={handleFilterStartDateChange}
        endDate={endDate}
        setEndDate={handleFilterEndDateChange}
        selectedOfficer={selectedOfficer}
        setSelectedOfficer={setSelectedOfficer}
        selectedStatus={selectedStatus}
        setSelectedStatus={setSelectedStatus}
        translations={translations}
        darkMode={darkMode}
        officers={officerList}
        dateRangeError={filterDateRangeError}
        onReset={() => {
          setSearchQuery('');
          setStartDate('');
          setEndDate('');
          setFilterDateRangeError('');
          setSelectedOfficer('all');
          setSelectedStatus('all');
          setCurrentPage(1);
        }}
        canUseTools={canUseTools}
        onAddClick={() => {
          setFormData({ missionId: '', reportId: generateReportId(), missionName: '', startTime: '', endTime: '', description: '', locationId: '', locationCode: '', locationName: '', latitude: '', longitude: '', officerId: '', officerName: '', deviceCode: '', priority: 'medium', status: 'waiting', duration: 0, note: '' });
          setShowModal(true);
        }}
      />

      {/* Desktop Table */}
      <div className={`hidden lg:block overflow-hidden rounded-lg border shadow-sm ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] table-fixed">
            <thead>
              <tr className={darkMode ? 'bg-slate-800' : 'bg-slate-100'}>
                <th className={`w-[72px] border-b px-6 py-4 text-center text-xs font-bold uppercase tracking-normal ${darkMode ? 'border-slate-700 text-slate-300' : 'border-slate-200 text-slate-500'}`}>{translations.tableNo}</th>
                <th className={`w-[156px] border-b px-6 py-4 text-left text-xs font-bold uppercase tracking-normal ${darkMode ? 'border-slate-700 text-slate-300' : 'border-slate-200 text-slate-500'}`}>{translations.tableCode}</th>
                <th className={`w-[230px] border-b px-6 py-4 text-left text-xs font-bold uppercase tracking-normal ${darkMode ? 'border-slate-700 text-slate-300' : 'border-slate-200 text-slate-500'}`}>{translations.tableTitle}</th>
                <th className={`w-[230px] border-b px-6 py-4 text-left text-xs font-bold uppercase tracking-normal ${darkMode ? 'border-slate-700 text-slate-300' : 'border-slate-200 text-slate-500'}`}>{translations.description}</th>
                <th className={`w-[150px] border-b px-6 py-4 text-center text-xs font-bold uppercase tracking-normal ${darkMode ? 'border-slate-700 text-slate-300' : 'border-slate-200 text-slate-500'}`}>{translations.tableStatus}</th>
                <th className={`w-[220px] border-b px-6 py-4 text-left text-xs font-bold uppercase tracking-normal ${darkMode ? 'border-slate-700 text-slate-300' : 'border-slate-200 text-slate-500'}`}>{translations.tableDetails}</th>
                <th className={`w-[132px] border-b px-6 py-4 text-center text-xs font-bold uppercase tracking-normal ${darkMode ? 'border-slate-700 text-slate-300' : 'border-slate-200 text-slate-500'}`}>{translations.tableActions}</th>
              </tr>
            </thead>
            <tbody className={darkMode ? 'divide-y divide-slate-800' : 'divide-y divide-slate-100'}>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={`loading-${index}`} className={darkMode ? 'border-b border-gray-700' : 'border-b border-gray-100'}>
                    <td className="px-4 py-4"><div className={`mx-auto h-4 w-6 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} animate-pulse`} /></td>
                    <td className="px-4 py-4"><div className={`h-4 w-32 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} animate-pulse`} /></td>
                    <td className="px-4 py-4"><div className={`h-4 w-44 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} animate-pulse`} /></td>
                    <td className="px-4 py-4"><div className={`h-4 w-48 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} animate-pulse`} /></td>
                    <td className="px-4 py-4"><div className={`mx-auto h-7 w-24 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} animate-pulse`} /></td>
                    <td className="px-4 py-4"><div className={`h-4 w-36 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} animate-pulse`} /></td>
                    <td className="px-4 py-4"><div className={`mx-auto h-9 w-20 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} animate-pulse`} /></td>
                  </tr>
                ))
              ) : currentItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <div className={`mx-auto mb-4 h-16 w-16 rounded-2xl flex items-center justify-center ${darkMode ? 'bg-slate-700/50' : 'bg-slate-100'}`}>
                      <ClipboardList className={`w-8 h-8 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                    </div>
                    <div className={`text-base font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{translations.noData}</div>
                    <div className={`text-sm mt-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{translations.searchPlaceholder}</div>
                  </td>
                </tr>
              ) : (
                currentItems.map((item, index) => {
                  const openDate = formatActivityDateTime(item.startTime);
                  const closeDate = formatActivityDateTime(item.endTime);
                  const rowKey = item.reportId || item.missionId;
                  const isEmergency = item.status === 'emergency' || item.status === 'emergency-in-progress';

                  return (
                    <tr id={`mission-${rowKey}`} key={item.id} className={`transition-colors ${
                    isEmergency
                      ? darkMode ? 'bg-red-950/20 hover:bg-red-950/30' : 'bg-red-50/40 hover:bg-red-50'
                      : darkMode ? 'hover:bg-slate-800/70' : 'hover:bg-slate-50/80'
                  } ${highlightedMissionTarget === rowKey ? 'ring-2 ring-amber-400 ring-inset' : ''}`} >
                    <td className={`px-6 py-4 text-center text-sm font-semibold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      {indexOfFirstItem + index + 1}
                    </td>
                    <td className="px-6 py-4">
                      <div className={`font-semibold ${darkMode ? 'text-slate-100' : 'text-slate-700'}`}>{item.reportId || item.missionId}</div>
                      <div className={`mt-1 flex items-center gap-1.5 text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                        <Clock className="h-3.5 w-3.5" />
                        <span>
                          {openDate.time || '-'}
                          {item.endTime && <> - {closeDate.time}</>}
                          {item.duration != null && item.duration > 0 && <span className="ml-1">({Math.floor(item.duration / 60) > 0 ? `${Math.floor(item.duration / 60)}h ` : ''}{item.duration % 60}m)</span>}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`line-clamp-2 text-sm font-semibold ${darkMode ? 'text-slate-100' : 'text-slate-700'}`}>{item.missionName}</div>
                      <span className={`mt-2 inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${getPriorityColor(item.priority)}`}>
                        {item.priority === 'high' ? translations.priorityHigh : item.priority === 'medium' ? translations.priorityMedium : translations.priorityLow}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className={`line-clamp-2 text-sm leading-6 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{item.description || '-'}</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${getStatusColor(item.status)}`}>{item.statusText}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1.5 text-sm">
                        <div className={`flex items-center gap-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          <Calendar className="h-3.5 w-3.5 shrink-0" />
                          <span>{openDate.date}</span>
                        </div>
                        <div className={`flex min-w-0 items-center gap-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{item.location || '-'}</span>
                        </div>
                        <div className={`flex min-w-0 items-center gap-2 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                          <User className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate font-semibold">{item.officerName || '-'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-1.5">
                        <button onClick={() => { setSelectedItem(item); setShowViewModal(true); }} className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${darkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white' : 'bg-slate-100 text-slate-500 hover:bg-sky-50 hover:text-sky-600'}`} title={translations.view} aria-label={`${translations.view} ${item.reportId}`}><Eye className="w-4 h-4" /></button>
                        {canUseTools && (item.status === 'waiting' || item.status === 'emergency') && (
                          <button onClick={() => handleEdit(item)} className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${darkMode ? 'bg-slate-800 text-amber-300 hover:bg-amber-500 hover:text-white' : 'bg-slate-100 text-amber-600 hover:bg-amber-50'}`} title={translations.edit} aria-label={`${translations.edit} ${item.reportId}`}><Edit className="w-4 h-4" /></button>
                        )}
                        {(canDeleteAnyMission || (canUseTools && (item.status === 'cancelled' || item.status === 'emergency-cancelled'))) && (
                          <button onClick={() => { setSelectedItem(item); setShowDeleteModal(true); }} className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${darkMode ? 'bg-slate-800 text-rose-300 hover:bg-rose-500 hover:text-white' : 'bg-slate-100 text-rose-600 hover:bg-rose-50'}`} title={translations.delete} aria-label={`${translations.delete} ${item.reportId}`}><Trash2 className="w-4 h-4" /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        <div className={`border-t px-6 py-4 ${darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-100 bg-white'}`}>
          <div className="flex items-center justify-between gap-4">
            <div className="order-3 flex items-center gap-2">
              <label className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{translations.itemsPerPage}:</label>
              <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className={`h-8 rounded-md border px-2 text-sm font-semibold cursor-pointer ${darkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-600'} focus:outline-none focus:ring-2 focus:ring-emerald-500/30`}>
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
            <div className={`order-1 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{translations.showing} {showingFrom} - {showingTo} {translations.of} {filteredData.length}</div>
            <div className="order-2 flex items-center gap-1">
              <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className={`flex h-8 w-8 items-center justify-center rounded-md text-sm font-medium transition-all ${currentPage === 1 ? 'opacity-40 cursor-not-allowed' : darkMode ? 'cursor-pointer hover:bg-slate-800' : 'cursor-pointer hover:bg-slate-100'} ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}><ChevronLeft className="w-4 h-4" /></button>
              {getPageNumbers().map((page, index) => {
                if (page === '...') return <span key={`ellipsis-${index}`} className={`px-2 py-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>...</span>;
                return <button key={page} onClick={() => handlePageChange(page as number)} className={`flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm font-bold transition-all ${currentPage === page ? darkMode ? 'bg-slate-800 text-slate-300 ring-1 ring-slate-700' : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200' : darkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-100'}`}>{page}</button>;
              })}
              <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage >= totalPages} className={`flex h-8 w-8 items-center justify-center rounded-md text-sm font-medium transition-all ${currentPage >= totalPages ? 'opacity-40 cursor-not-allowed' : darkMode ? 'cursor-pointer hover:bg-slate-800' : 'cursor-pointer hover:bg-slate-100'} ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div key={`mobile-loading-${index}`} className={`rounded-2xl border p-4 ${darkMode ? 'bg-slate-800 border-slate-700/50' : 'bg-white border-slate-200/80'} shadow-sm`}>
              <div className={`h-5 w-28 rounded-lg mb-3 ${darkMode ? 'bg-slate-700' : 'bg-slate-200'} animate-pulse`} />
              <div className={`h-4 w-48 rounded mb-2 ${darkMode ? 'bg-slate-700' : 'bg-slate-200'} animate-pulse`} />
              <div className={`h-3 w-36 rounded mb-4 ${darkMode ? 'bg-slate-700' : 'bg-slate-200'} animate-pulse`} />
              <div className="flex gap-2">
                <div className={`h-10 flex-1 rounded-xl ${darkMode ? 'bg-slate-700' : 'bg-slate-200'} animate-pulse`} />
                <div className={`h-10 flex-1 rounded-xl ${darkMode ? 'bg-slate-700' : 'bg-slate-200'} animate-pulse`} />
              </div>
            </div>
          ))
        ) : currentItems.length === 0 ? (
          <div className={`rounded-2xl border p-12 text-center ${darkMode ? 'bg-slate-800 border-slate-700/50' : 'bg-white border-slate-200/80'} shadow-sm`}>
            <div className={`mx-auto mb-4 h-16 w-16 rounded-2xl flex items-center justify-center ${darkMode ? 'bg-slate-700/50' : 'bg-slate-100'}`}>
              <ClipboardList className={`w-8 h-8 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
            </div>
            <div className={`text-base font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{translations.noData}</div>
          </div>
        ) : (
          currentItems.map((item) => {
            const showEdit = canUseTools && (item.status === 'waiting' || item.status === 'emergency');
            const showDelete = canDeleteAnyMission || (canUseTools && (item.status === 'cancelled' || item.status === 'emergency-cancelled'));
            const actionButtonCount = 1 + (showEdit ? 1 : 0) + (showDelete ? 1 : 0);
            const actionGridCols = actionButtonCount >= 3 ? 'grid-cols-3' : actionButtonCount === 2 ? 'grid-cols-2' : 'grid-cols-1';
            return (
            <div id={`mission-${item.reportId || item.missionId}`} key={item.id} className={`rounded-2xl border overflow-hidden shadow-sm transition-all ${
              (item.status === 'emergency' || item.status === 'emergency-in-progress') 
                ? darkMode ? 'border-red-800/50 bg-red-950/20' : 'border-red-200 bg-red-50/30' 
                : darkMode ? 'bg-slate-800 border-slate-700/50' : 'bg-white border-slate-200/80'
            } ${highlightedMissionTarget === (item.reportId || item.missionId) ? 'ring-2 ring-amber-400' : ''}`}>
              {/* Card Header */}
              <div className={`px-4 py-3 border-b ${
                (item.status === 'emergency' || item.status === 'emergency-in-progress')
                  ? darkMode ? 'border-red-800/30 bg-red-950/30' : 'border-red-200/50 bg-red-100/50'
                  : darkMode ? 'border-slate-700/50 bg-slate-900/50' : 'border-slate-100 bg-slate-50/80'
              }`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold text-sm ${darkMode ? 'text-white' : 'text-slate-900'}`}>{item.reportId}</span>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusColor(item.status)}`}>{item.statusText}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${getPriorityColor(item.priority)}`}>
                    {item.priority === 'high' ? (language === 'th' ? 'สำคัญ' : 'High') : item.priority === 'medium' ? (language === 'th' ? 'ปานกลาง' : 'Med') : (language === 'th' ? 'ปกติ' : 'Low')}
                  </span>
                </div>
              </div>
              {/* Card Body */}
              <div className="p-4 space-y-3">
                <p className={`font-medium text-sm ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>{item.missionName}</p>
                <div className="space-y-2">
                  <div className={`flex items-center gap-2 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                    <span>{item.startTime.includes('T') ? new Date(item.startTime).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }) : item.startTime}</span>
                  </div>
                  <div className={`flex items-center gap-2 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{item.location || '-'}</span>
                  </div>
                  <div className={`flex items-center gap-2 text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                    <User className="w-3.5 h-3.5 shrink-0" />
                    <span className="font-medium">{item.officerName}</span>
                  </div>
                </div>
                {/* Actions */}
                <div className={`pt-3 border-t ${darkMode ? 'border-slate-700/50' : 'border-slate-100'}`}>
                  <div className={`grid gap-2 ${actionGridCols}`}>
                    <button onClick={() => { setSelectedItem(item); setShowViewModal(true); }} className="flex items-center justify-center gap-2 px-3 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-xl transition-all text-sm font-medium shadow-sm"><Eye className="w-4 h-4" /><span>{translations.view}</span></button>
                    {showEdit && (
                      <button onClick={() => handleEdit(item)} className="flex items-center justify-center gap-2 px-3 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl transition-all text-sm font-medium shadow-sm"><Edit className="w-4 h-4" /><span>{translations.edit}</span></button>
                    )}
                    {showDelete && (
                      <button onClick={() => { setSelectedItem(item); setShowDeleteModal(true); }} className="flex items-center justify-center gap-2 px-3 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl transition-all text-sm font-medium shadow-sm"><Trash2 className="w-4 h-4" /><span>{translations.delete}</span></button>
                    )}
                  </div>
                </div>
              </div>
            </div>
            );
          })
        )}
        {/* Mobile Pagination */}
        <div className={`rounded-2xl border p-4 space-y-3 ${darkMode ? 'bg-slate-800 border-slate-700/50' : 'bg-white border-slate-200/80'} shadow-sm`}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <label className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{translations.itemsPerPage}:</label>
              <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className={`px-3 py-1.5 rounded-lg border text-sm cursor-pointer ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-200 text-slate-700'} focus:outline-none focus:ring-2 focus:ring-sky-500/30`}>
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
            <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredData.length)} / {filteredData.length}</div>
          </div>
          <div className="flex items-center justify-center gap-1">
            <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className={`p-2 rounded-lg text-sm font-medium transition-all ${currentPage === 1 ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'} ${darkMode ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-100'}`}><ChevronLeft className="w-4 h-4" /></button>
            {getPageNumbers().map((page, index) => {
              if (page === '...') return <span key={`ellipsis-${index}`} className={`px-2 py-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>...</span>;
              return <button key={page} onClick={() => handlePageChange(page as number)} className={`min-w-[36px] h-9 rounded-lg text-sm font-medium transition-all ${currentPage === page ? darkMode ? 'bg-slate-800 text-slate-300 ring-1 ring-slate-700' : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200' : darkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-100'}`}>{page}</button>;
            })}
            <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage >= totalPages} className={`p-2 rounded-lg text-sm font-medium transition-all ${currentPage >= totalPages ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'} ${darkMode ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-100'}`}><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      <SpotCheckFormModal show={showModal} onClose={() => setShowModal(false)} formData={formData} setFormData={setFormData} onSubmit={handleSubmit} translations={translations} language={language} darkMode={darkMode} isEdit={false} />
      <SpotCheckFormModal show={showEditModal} onClose={() => setShowEditModal(false)} formData={formData} setFormData={setFormData} onSubmit={handleEditSubmit} translations={translations} language={language} darkMode={darkMode} isEdit={true} />
      <ViewModal show={showViewModal} item={selectedItem} onClose={() => setShowViewModal(false)} translations={translations} language={language} darkMode={darkMode} getStatusColor={getStatusColor} getPriorityColor={getPriorityColor} copyToClipboard={copyToClipboard} copySuccess={copySuccess} handleAction={(type) => { if (!canUseTools) return; setActionType(type); setShowActionModal(true); }} canUseActions={canUseTools} />
      <DeleteModal show={showDeleteModal} item={selectedItem} onClose={() => setShowDeleteModal(false)} onConfirm={handleConfirmDelete} translations={translations} language={language} darkMode={darkMode} />
      <ActionModal show={showActionModal} item={selectedItem} actionType={actionType} onClose={() => setShowActionModal(false)} onConfirm={handleConfirmAction} translations={translations} language={language} darkMode={darkMode} />
    </div>
  );
}
