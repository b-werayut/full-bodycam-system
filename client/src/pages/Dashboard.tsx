/// <reference types="../vite-env.d.ts" />
import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  TriangleAlert, 
  MapPinned, 
  Cctv, 
  BellRing, 
  Timer, 
  X, 
  UserCircle, 
  FileText, 
  MonitorPlay, 
  ChevronLeft, 
  ChevronRight, 
  ClipboardList, 
  CircleCheckBig, 
  CircleDot,
  Satellite,
  Signal,
  WifiOff,
  Search,
  LoaderCircle
} from 'lucide-react';
import { type CameraData } from '../features/dashboard/types';
import { getEventLogs, getEventLogCount, markEventLogRead } from '../services/eventLogService';
import { requestCameraStream } from '../services/deviceService';
import { getAccessToken } from '../services/apiClient';

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
  mission?: {
    missionId: number;
    reportId?: string | null;
    missionName?: string | null;
    missionStatus?: string | null;
    deviceCode?: string | null;
    startTime?: string | null;
    endTime?: string | null;
  } | null;
}
import { GPSMap } from './GPSMap';
import { dashboardTranslations, type SupportedLanguage } from '../locales/dashboardTranslations';
import { AlertDetailModal } from '../components/modals/AlertDetailModal';
import { GPSMapModal } from '../components/modals/GPSMapModal';
import { CameraStreamModal } from '../components/modals/CameraStreamModal';
import { isFilterEndBeforeStart } from '../features/dateRangeValidation';

// จำนวนแถวการแจ้งเตือนที่ดึงจาก server ต่อหนึ่งครั้ง (โหลดครั้งแรก + ต่อ "ดูเพิ่ม" แต่ละครั้ง)
const ALERTS_BATCH_SIZE = 100;

interface DashboardProps {
  language: SupportedLanguage;
  darkMode: boolean;
}

interface DeviceStatusMessageItem {
  locationId: number;
  deviceName: string;
  status: boolean;
  deviceCode: string;
  locationName?: string | null;
}

interface DeviceLocationMessageItem {
  deviceCode?: string;
  latitude?: unknown;
  Latitude?: unknown;
  longitude?: unknown;
  Longitude?: unknown;
  status?: boolean;
  recordedAt?: string | null;
  RecordedAt?: string | null;
}

interface DashboardSocketMessage {
  type?: string;
  data?: unknown;
}

const parseCoordinateValue = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number' ? value : parseFloat(String(value).trim());
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeGpsCoordinates = (rawLatitude: unknown, rawLongitude: unknown) => {
  const latitude = parseCoordinateValue(rawLatitude);
  const longitude = parseCoordinateValue(rawLongitude);

  if (latitude === null || longitude === null) {
    return { latitude: null, longitude: null };
  }

  const isLatitude = (value: number) => value >= -90 && value <= 90;
  const isLongitude = (value: number) => value >= -180 && value <= 180;

  if (isLatitude(latitude) && isLongitude(longitude)) {
    return { latitude, longitude };
  }

  if (isLatitude(longitude) && isLongitude(latitude)) {
    return { latitude: longitude, longitude: latitude };
  }

  return { latitude: null, longitude: null };
};


export function Dashboard({ language, darkMode }: DashboardProps) {
  const t = dashboardTranslations[language];
  const navigate = useNavigate();
  const readLabel = language === 'th' ? 'อ่านแล้ว' : 'Read';
  const unreadLabel = language === 'th' ? 'ยังไม่อ่าน' : 'Unread';

  const [selectedAlert, setSelectedAlert] = useState<number | null>(null);
  const [showGPSMap, setShowGPSMap] = useState(false);
  const [alertStartDate, setAlertStartDate] = useState('');
  const [alertEndDate, setAlertEndDate] = useState('');
  const [alertStartTime, setAlertStartTime] = useState('');
  const [alertEndTime, setAlertEndTime] = useState('');
  const [alertFilterDateRangeError, setAlertFilterDateRangeError] = useState('');
  interface GpsDevice {
    id: number;
    name: string;
    serialNo: string | undefined;
    latitude: number | null;
    longitude: number | null;
    status: string;
    orgName: string | null;
    updateTime: string | null;
    locationName?: string | null;
  }
  const [gpsDevices, setGpsDevices] = useState<GpsDevice[]>([]);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [, setGpsError] = useState<string | null>(null);
  const previousGpsDataRef = useRef<string>('');
  const [dataChanged, setDataChanged] = useState(false);
  const [selectedGpsDeviceId, setSelectedGpsDeviceId] = useState<string | null>(null);
  const [gpsSelectTrigger, setGpsSelectTrigger] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);

  const [cameraList, setCameraList] = useState<CameraData[]>([]);
  const [cameraSearchTerm, setCameraSearchTerm] = useState('');

  // Pagination state for Camera List
  const [cameraPage, setCameraPage] = useState(1);
  const camerasPerPage = 6;


  // Pagination state for Alerts
  const [alertPage, setAlertPage] = useState(1);
  const alertsPerPage = 6;

  // Event Logs state
  const [eventLogs, setEventLogs] = useState<AlertData[]>([]);
  const [eventLogsLoading, setEventLogsLoading] = useState(false);
  // โหลดทีละ ALERTS_BATCH_SIZE แถวจาก server แล้วกด "ดูเพิ่ม" เพื่อต่อท้าย
  const [alertsLoadingMore, setAlertsLoadingMore] = useState(false);
  const [alertHasMore, setAlertHasMore] = useState(false);
  // จำนวนการแจ้งเตือนทั้งหมดจริงจาก DB (ไม่ติดลิมิตการโหลดของตาราง)
  const [totalAlerts, setTotalAlerts] = useState(0);
  const alertFilterDateRangeInvalid = isFilterEndBeforeStart({
    startDate: alertStartDate,
    endDate: alertEndDate,
    startTime: alertStartTime,
    endTime: alertEndTime,
  });
  const alertFilterDateRangeErrorMessage = language === 'th'
    ? 'เวลาสิ้นสุดต้องไม่ก่อนเวลาเริ่มต้น'
    : 'End time cannot be earlier than start time';
  const visibleAlertFilterDateRangeError =
    alertFilterDateRangeError ||
    (alertFilterDateRangeInvalid ? alertFilterDateRangeErrorMessage : '');
  const alertEffectiveStartDate = alertStartDate || alertEndDate;
  const alertEffectiveEndDate = alertEndDate || alertStartDate;
  const alertTimeInputsShareDate =
    Boolean(alertEffectiveStartDate && alertEffectiveEndDate && alertEffectiveStartDate === alertEffectiveEndDate);
  const alertStartTimeMax = alertTimeInputsShareDate && alertEndTime ? alertEndTime : undefined;
  const alertEndTimeMin = alertTimeInputsShareDate && alertStartTime ? alertStartTime : undefined;

  const handleAlertStartDateChange = (value: string) => {
    setAlertStartDate(value);
    setAlertPage(1);

    if (isFilterEndBeforeStart({ startDate: value, endDate: alertEndDate, startTime: alertStartTime, endTime: alertEndTime })) {
      setAlertEndDate('');
      setAlertEndTime('');
      setAlertFilterDateRangeError(alertFilterDateRangeErrorMessage);
      return;
    }

    setAlertFilterDateRangeError('');
  };

  const handleAlertEndDateChange = (value: string) => {
    if (isFilterEndBeforeStart({ startDate: alertStartDate, endDate: value, startTime: alertStartTime, endTime: alertEndTime })) {
      setAlertFilterDateRangeError(alertFilterDateRangeErrorMessage);
      return;
    }

    setAlertEndDate(value);
    setAlertPage(1);
    setAlertFilterDateRangeError('');
  };

  const handleAlertStartTimeChange = (value: string) => {
    setAlertStartTime(value);
    setAlertPage(1);

    if (isFilterEndBeforeStart({ startDate: alertStartDate, endDate: alertEndDate, startTime: value, endTime: alertEndTime })) {
      setAlertEndTime('');
      setAlertFilterDateRangeError(alertFilterDateRangeErrorMessage);
      return;
    }

    setAlertFilterDateRangeError('');
  };

  const handleAlertEndTimeChange = (value: string) => {
    if (isFilterEndBeforeStart({ startDate: alertStartDate, endDate: alertEndDate, startTime: alertStartTime, endTime: value })) {
      setAlertFilterDateRangeError(alertFilterDateRangeErrorMessage);
      return;
    }

    setAlertEndTime(value);
    setAlertPage(1);
    setAlertFilterDateRangeError('');
  };

  // สร้าง query params ของตัวกรองวันที่ (ใช้ร่วมกันทั้งโหลดครั้งแรกและ "ดูเพิ่ม")
  const buildEventLogFilterParams = () => {
    const params = new URLSearchParams();
    const effectiveStartDate = alertStartDate || alertEndDate;
    const effectiveEndDate = alertEndDate || alertStartDate;

    if (effectiveStartDate) {
      const startDateTime = alertStartTime
        ? `${effectiveStartDate}T${alertStartTime}:00`
        : `${effectiveStartDate}T00:00:00`;
      params.append('startDate', startDateTime);
    }
    if (effectiveEndDate) {
      const endDateTime = alertEndTime
        ? `${effectiveEndDate}T${alertEndTime}:00`
        : `${effectiveEndDate}T23:59:59`;
      params.append('endDate', endDateTime);
    }
    return params;
  };

  const fetchEventLogs = async (showLoading = true) => {
    if (isFilterEndBeforeStart({
      startDate: alertStartDate,
      endDate: alertEndDate,
      startTime: alertStartTime,
      endTime: alertEndTime,
    })) {
      return;
    }

    if (showLoading) {
      setEventLogsLoading(true);
    }

    try {
      const params = buildEventLogFilterParams();
      params.append('limit', String(ALERTS_BATCH_SIZE));
      params.append('offset', '0');
      const logs = (await getEventLogs(Object.fromEntries(params.entries()))) as AlertData[];
      setEventLogs(logs);
      // ถ้าได้ครบ batch แสดงว่าน่าจะมีต่อ → เปิดปุ่ม "ดูเพิ่ม"
      setAlertHasMore(logs.length === ALERTS_BATCH_SIZE);
    } catch (err) {
      console.error('Failed to fetch event logs:', err);
    } finally {
      if (showLoading) {
        setEventLogsLoading(false);
      }
    }
  };

  const loadMoreEventLogs = async () => {
    if (alertsLoadingMore || !alertHasMore) {
      return;
    }

    setAlertsLoadingMore(true);
    try {
      const params = buildEventLogFilterParams();
      params.append('limit', String(ALERTS_BATCH_SIZE));
      params.append('offset', String(eventLogs.length));
      const more = (await getEventLogs(Object.fromEntries(params.entries()))) as AlertData[];

      setEventLogs((prev) => {
        const existingIds = new Set(prev.map((item) => item.id));
        const appended = more.filter((item) => !existingIds.has(item.id));
        return [...prev, ...appended];
      });
      setAlertHasMore(more.length === ALERTS_BATCH_SIZE);
    } catch (err) {
      console.error('Failed to load more event logs:', err);
    } finally {
      setAlertsLoadingMore(false);
    }
  };

  // นับการแจ้งเตือนทั้งหมดจาก DB — เป็นยอดรวมทั้งระบบ ไม่ขึ้นกับตัวกรองวันที่ของตาราง
  const fetchAlertCount = async () => {
    try {
      setTotalAlerts(await getEventLogCount());
    } catch (err) {
      console.error('Failed to fetch alert count:', err);
    }
  };

  useEffect(() => {
    fetchAlertCount();
  }, []);

  useEffect(() => {
    setAlertPage(1);
    fetchEventLogs();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alertStartDate, alertEndDate, alertStartTime, alertEndTime]);

  useEffect(() => {
    const handleEventLogNotification = () => {
      fetchEventLogs(false);
      fetchAlertCount();
      setAlertPage(1);
    };

    window.addEventListener('eventlog:notification', handleEventLogNotification);
    return () => window.removeEventListener('eventlog:notification', handleEventLogNotification);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alertStartDate, alertEndDate, alertStartTime, alertEndTime]);

  const scrollToEventAlerts = () => {
    document.getElementById('event-alerts')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  useEffect(() => {
    if (window.location.hash !== '#event-alerts') return;

    const timer = setTimeout(scrollToEventAlerts, 100);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    window.addEventListener('eventlog:scroll-to-table', scrollToEventAlerts);
    return () => window.removeEventListener('eventlog:scroll-to-table', scrollToEventAlerts);
  }, []);

  // Camera Stream Modal State
  const [selectedCamera, setSelectedCamera] = useState<CameraData | null>(null);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [streamLoading, setStreamLoading] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [cameraIsOffline, setCameraIsOffline] = useState(false);

  // Fetch stream URL for camera
  const fetchCameraStream = async (camera: CameraData) => {
    setSelectedCamera(camera);
    setStreamLoading(true);
    setStreamError(null);
    setStreamUrl(null);
    setCameraIsOffline(false);

    try {
      if (!camera.deviceCode) {
        throw new Error('Missing device code');
      }

      const result = await requestCameraStream(camera.deviceCode);

      if (result.code === 1000 && result.data?.video_url) {
        // Extract relative path and use proxy
        const urlMatch = result.data?.video_url.match(/\/proxy\/.*/);
        const videoUrl = urlMatch ? urlMatch[0] : result.data?.video_url;
        setStreamUrl(videoUrl);
      } else if (result.code === 1001 || result.data?.status === 0) {
        setCameraIsOffline(true);
        throw new Error(language === 'th' ? 'กล้องออฟไลน์' : 'Camera offline');
      } else {
        throw new Error(result.desc || 'Failed to get stream URL');
      }
    } catch (error) {
      console.error('Failed to fetch camera stream:', error);
      setStreamError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setStreamLoading(false);
    }
  };

  // Close camera modal
  const closeCameraModal = () => {
    setSelectedCamera(null);
    setStreamUrl(null);
    setStreamError(null);
  };

  // WebSocket connection for device status and GPS data
  useEffect(() => {
    setGpsLoading(true);

    const connectWebSocket = () => {
      // แนบ access token ใน query เพื่อให้ server ผูก user/location กับ socket (ไม่งั้นเป็น anonymous -> เห็นว่าง)
      // อ่าน token สดทุกครั้งที่ connect เผื่อ reconnect หลัง token refresh
      const token = getAccessToken();
      const ws = new WebSocket(`/ws${token ? `?token=${encodeURIComponent(token)}` : ''}`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setGpsError(null);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as DashboardSocketMessage;

          // =========================
          // 1. DEVICE STATUS (SOURCE: NAME + STATUS)
          // =========================
          if (message.type === 'deviceStatus' && Array.isArray(message.data)) {
            const devices = message.data as DeviceStatusMessageItem[];

            const mapped: CameraData[] = devices.map((d) => ({
              id: d.locationId,
              name: d.deviceName,
              status: d.status ? 'online' : 'offline',
              deviceCode: d.deviceCode,
              locationName: d.locationName ?? undefined,
            }));
            setCameraList(mapped);

            // Keep device metadata from deviceStatus, but GPS coordinates come only from deviceLocation.
            setGpsDevices((prev) => {
              const prevMap = new Map(prev.map((d) => [d.serialNo, d]));
              const newMap = new Map<string, GpsDevice>();

              devices.forEach((d) => {
                const existing = prevMap.get(d.deviceCode);

                newMap.set(d.deviceCode, {
                  id: existing?.id ?? newMap.size + 1,

                  name: d.deviceName,
                  status: d.status ? 'online' : 'offline',

                  serialNo: d.deviceCode,

                  latitude: existing?.latitude ?? null,
                  longitude: existing?.longitude ?? null,

                  orgName: null,
                  updateTime: existing?.updateTime ?? null,
                  locationName: d.locationName || existing?.locationName || null,
                });
              });

              setGpsLoading(false);
              return Array.from(newMap.values());
            });
          }

          // =========================
          // 2. DEVICE LOCATION (SOURCE: LAT/LON ONLY)
          // =========================
          if (message.type === 'deviceLocation' && Array.isArray(message.data)) {
            // console.log('deviceLocation received:', message.data);

            setGpsDevices((prev) => {
              const map = new Map(prev.map((d) => [d.serialNo, d]));

              const locations = message.data as DeviceLocationMessageItem[];

              locations.forEach((d, index) => {
                if (!d.deviceCode) return;

                const existing = map.get(d.deviceCode);
                const coordinates = normalizeGpsCoordinates(d.latitude ?? d.Latitude, d.longitude ?? d.Longitude);

                map.set(d.deviceCode, {
                  id: existing?.id ?? map.size + 1,
                  name: existing?.name || `Device ${index + 1}`,
                  serialNo: d.deviceCode,
                  latitude: coordinates.latitude ?? existing?.latitude ?? null,
                  longitude: coordinates.longitude ?? existing?.longitude ?? null,

                  status: existing?.status ?? (d.status ? 'online' : 'offline'),

                  orgName: null,
                  updateTime:
                    d.recordedAt ||
                    d.RecordedAt ||
                    (coordinates.latitude !== null && coordinates.longitude !== null
                      ? new Date().toISOString()
                      : existing?.updateTime ?? null),

                  locationName: existing?.locationName ?? null,
                });
              });

              const updatedDevices = Array.from(map.values());

              const currentDataString = JSON.stringify(updatedDevices);
              if (currentDataString !== previousGpsDataRef.current) {
                previousGpsDataRef.current = currentDataString;
                setDataChanged(true);
                setTimeout(() => setDataChanged(false), 2000);
              }

              setGpsLoading(false);
              return updatedDevices;
            });
          }
        } catch (error) {
          console.error('❌ Failed to parse WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setGpsError('WebSocket connection error');
      };

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);

        if (event.code !== 1000) {
          setTimeout(connectWebSocket, 3000);
        }
      };
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounted');
        wsRef.current = null;
      }
    };
  }, []);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (selectedAlert !== null || showGPSMap || selectedCamera !== null) {
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
  }, [selectedAlert, showGPSMap, selectedCamera]);

  // Use event logs from API (already filtered by backend)
  const alerts = eventLogs;
  const alertPageCount = Math.max(1, Math.ceil(alerts.length / alertsPerPage));
  const currentAlerts = alerts.slice((alertPage - 1) * alertsPerPage, alertPage * alertsPerPage);
  const getAlertPageNumbers = () => {
    const pages: Array<number | string> = [];
    const maxVisible = 5;

    if (alertPageCount <= maxVisible) {
      for (let page = 1; page <= alertPageCount; page++) pages.push(page);
      return pages;
    }

    pages.push(1);
    const startPage = Math.max(2, alertPage - 1);
    const endPage = Math.min(alertPageCount - 1, alertPage + 1);

    if (startPage > 2) pages.push('...');
    for (let page = startPage; page <= endPage; page++) pages.push(page);
    if (endPage < alertPageCount - 1) pages.push('...');
    pages.push(alertPageCount);

    return pages;
  };

  const selectedAlertData = selectedAlert ? alerts.find(a => a.id === selectedAlert) : null;
  const onlineCameraCount = cameraList.filter(c => c.status === 'online').length;
  const offlineCameraCount = cameraList.filter(c => c.status === 'offline').length;
  const trackedGpsCount = gpsDevices.filter(d => d.latitude && d.longitude).length;
  const filteredCameraList = useMemo(() => {
    const query = cameraSearchTerm.trim().toLowerCase();

    if (!query) return cameraList;

    return cameraList.filter((camera) => {
      const gpsDevice = gpsDevices.find((device) => device.serialNo === camera.deviceCode);
      const searchableText = [
        camera.name,
        camera.deviceCode,
        camera.serialNo,
        camera.locationName,
        gpsDevice?.serialNo,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchableText.includes(query);
    });
  }, [cameraList, cameraSearchTerm, gpsDevices]);
  const cameraPageCount = Math.max(1, Math.ceil(filteredCameraList.length / camerasPerPage));
  const currentCameraList = filteredCameraList.slice((cameraPage - 1) * camerasPerPage, cameraPage * camerasPerPage);

  useEffect(() => {
    setCameraPage(1);
  }, [cameraSearchTerm]);

  useEffect(() => {
    setCameraPage((page) => Math.min(page, cameraPageCount));
  }, [cameraPageCount]);

  const markAlertAsRead = async (alertId: number) => {
    const alert = alerts.find((item) => item.id === alertId);
    if (!alert || alert.isRead) {
      return;
    }

    setEventLogs((prev) =>
      prev.map((item) => (item.id === alertId ? { ...item, isRead: true } : item)),
    );
    window.dispatchEvent(new CustomEvent('eventlog:read', { detail: { id: alertId } }));

    try {
      await markEventLogRead(alertId);
    } catch (error) {
      console.error('Failed to mark event log as read:', error);
    }
  };

  const openAlertDetails = async (alert: AlertData) => {
    setSelectedAlert(alert.id);
    await markAlertAsRead(alert.id);
  };

  const openRelatedMission = async (mission?: AlertData['mission'], alertId?: number) => {
    if (!mission?.reportId && !mission?.missionId) return;

    if (alertId) {
      await markAlertAsRead(alertId);
    }

    const params = new URLSearchParams();
    if (mission.reportId) {
      params.set('reportId', mission.reportId);
    } else if (mission.missionId) {
      params.set('missionId', String(mission.missionId));
    }

    navigate(`/activities?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: t.totalCameras, value: cameraList.length, icon: Cctv, iconBg: 'bg-sky-700' },
          { label: t.onlineCameras, value: onlineCameraCount, icon: Cctv, iconBg: 'bg-teal-700' },
          { label: t.offline, value: offlineCameraCount, icon: WifiOff, iconBg: 'bg-rose-700' },
          { label: t.gpsDevices, value: trackedGpsCount, icon: Satellite, iconBg: 'bg-indigo-700' },
          { label: t.alerts, value: totalAlerts, icon: BellRing, iconBg: 'bg-orange-700' },
        ].map(({ label, value, icon: Icon, iconBg }) => (
          <div 
            key={label} 
            className={`rounded-2xl px-5 py-4 border transition-shadow hover:shadow-md flex items-center gap-4 ${
              darkMode 
                ? 'bg-slate-800 border-slate-700/50' 
                : 'bg-white border-slate-200/80 shadow-sm'
            }`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${iconBg}`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className={`text-xs font-medium mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{label}</p>
              <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Camera List */}
        <div className={`rounded-lg border overflow-hidden lg:h-[460px] lg:flex lg:flex-col ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
          <div className={`p-5 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'
            }`}>
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="w-10 h-10 bg-teal-700 rounded-xl flex items-center justify-center">
                  <Cctv className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h2 className={`font-semibold text-base ${darkMode ? 'text-white' : 'text-slate-800'}`}>{t.cameraList}</h2>
                  <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{t.cameraListDesc}</p>
                </div>
              </div>

              <div className="flex min-w-0 flex-1 justify-end">
                <div className="relative w-full sm:max-w-sm">
                  <Search className={`absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                  <input
                    type="text"
                    value={cameraSearchTerm}
                    onChange={(event) => setCameraSearchTerm(event.target.value)}
                    placeholder={language === 'th' ? 'ค้นหาชื่อกล้อง รหัสอุปกรณ์ หรือตำแหน่ง...' : 'Search camera, device code, or location...'}
                    className={`h-10 w-full rounded-lg border pl-9 pr-10 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-teal-500/25 ${darkMode
                      ? 'bg-gray-900/50 border-gray-700 text-white placeholder-gray-500 focus:border-teal-600'
                      : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-teal-600'
                    }`}
                  />
                  {cameraSearchTerm && (
                    <button
                      type="button"
                      onClick={() => setCameraSearchTerm('')}
                      className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 transition-colors ${darkMode ? 'text-gray-400 hover:bg-gray-700 hover:text-white' : 'text-gray-500 hover:bg-gray-200 hover:text-gray-700'}`}
                      aria-label={language === 'th' ? 'ล้างคำค้นหา' : 'Clear search'}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="flex min-h-0 flex-1 flex-col p-3">
            <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent pr-1">
              {filteredCameraList.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {currentCameraList.map((camera: CameraData) => {
                    const gpsDevice = gpsDevices.find(d => d.serialNo === camera.deviceCode);
                    const coordinateLabel = gpsDevice?.latitude != null && gpsDevice?.longitude != null
                      ? `lat:${Number(gpsDevice.latitude).toFixed(6)} lon:${Number(gpsDevice.longitude).toFixed(6)}`
                      : null;
                    const hasGps = Boolean(coordinateLabel);
                    
                    return (
                      <div
                        key={camera.id}
                        className={`flex flex-wrap items-center gap-3 p-3 rounded-lg transition-colors border ${darkMode
                          ? 'bg-gray-900/30 border-gray-700'
                          : 'border-gray-100'
                        }`}
                      >
                        <div className={`w-3 h-3 rounded-full ${camera.status === 'online' ? 'bg-green-500' : 'bg-red-500'} relative flex-shrink-0`}>
                          {camera.status === 'online' && <div className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-60"></div>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className={`font-semibold text-sm block truncate ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                            {camera.name}
                          </span>
                          <div className={`flex items-center gap-1 mt-0.5 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            <MapPinned className={`w-3 h-3 flex-shrink-0 ${camera.status === 'online' ? 'text-sky-500' : 'text-gray-400'}`} />
                            <span className="truncate">{camera.locationName || (language === 'th' ? 'ไม่ระบุตำแหน่ง' : 'No location')}</span>
                          </div>
                          <div className={`flex items-center gap-1.5 mt-1 text-[11px] ${coordinateLabel ? (darkMode ? 'text-slate-300' : 'text-slate-600') : (darkMode ? 'text-amber-300' : 'text-amber-700')}`}>
                            <Satellite className={`w-3 h-3 flex-shrink-0 ${coordinateLabel ? 'text-indigo-500' : 'text-amber-500'}`} />
                            <span className={`truncate ${coordinateLabel ? `font-mono tabular-nums ${darkMode ? 'text-slate-200' : 'text-slate-700'}` : 'font-semibold'}`}>
                              {coordinateLabel || (language === 'th' ? 'ไม่พบข้อมูล gps' : 'gps data not found')}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {/* Stream Button */}
                          <button
                            title={camera.status === 'online' ? (language === 'th' ? 'ดูภาพสด' : 'View Live Stream') : (language === 'th' ? 'กล้องออฟไลน์' : 'Camera Offline')}
                            onClick={() => camera.status === 'online' && fetchCameraStream(camera)}
                            disabled={camera.status !== 'online'}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${camera.status === 'online'
                              ? 'bg-teal-600 hover:bg-teal-500 text-white cursor-pointer shadow-sm hover:shadow'
                              : `cursor-not-allowed ${darkMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-200 text-gray-400'}`
                            }`}
                          >
                            <MonitorPlay className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">{language === 'th' ? 'ภาพสด' : 'Stream'}</span>
                          </button>
                          {/* GPS Button */}
                          <button
                            title={hasGps ? (language === 'th' ? 'ดูตำแหน่ง GPS' : 'View GPS Location') : (language === 'th' ? 'ไม่มีข้อมูล GPS' : 'No GPS Data')}
                            onClick={() => {
                              if (hasGps && gpsDevice) {
                                setSelectedGpsDeviceId(gpsDevice.serialNo ?? null);
                                setGpsSelectTrigger(prev => prev + 1);
                              }
                            }}
                            disabled={!hasGps}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${hasGps
                              ? 'bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer shadow-sm hover:shadow'
                              : `cursor-not-allowed ${darkMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-200 text-gray-400'}`
                            }`}
                          >
                            <Satellite className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">{language === 'th' ? 'จีพีเอส' : 'GPS'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center justify-center p-8">
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {cameraList.length === 0
                      ? (language === 'th' ? 'ไม่มีข้อมูลกล้องที่เปิดใช้งาน' : 'No active cameras available')
                      : (language === 'th' ? 'ไม่พบกล้องที่ตรงกับคำค้นหา' : 'No cameras match your search')}
                  </p>
                </div>
              )}
            </div>
            {filteredCameraList.length > camerasPerPage && (
              <div className={`flex items-center justify-between mt-3 pt-3 border-t ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {t.page} {cameraPage} {t.of} {cameraPageCount} ({filteredCameraList.length} {t.devices})
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCameraPage(p => Math.max(1, p - 1))}
                    disabled={cameraPage === 1}
                    className={`p-1.5 rounded-lg transition-all ${cameraPage === 1
                      ? 'opacity-40 cursor-not-allowed'
                      : `cursor-pointer ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`
                      } ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCameraPage(p => Math.min(cameraPageCount, p + 1))}
                    disabled={cameraPage >= cameraPageCount}
                    className={`p-1.5 rounded-lg transition-all ${cameraPage >= cameraPageCount
                      ? 'opacity-40 cursor-not-allowed'
                      : `cursor-pointer ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`
                      } ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* GPS Map - Full Map Card */}
        <div className={`rounded-lg border overflow-hidden lg:h-[460px] ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-700 rounded-xl flex items-center justify-center">
                  <Satellite className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className={`font-semibold text-base ${darkMode ? 'text-white' : 'text-slate-800'}`}>{t.gpsMap}</h2>
                  <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {trackedGpsCount} {language === 'th' ? 'อุปกรณ์มีพิกัด' : 'devices with GPS'} / {gpsDevices.length} {language === 'th' ? 'ทั้งหมด' : 'total'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowGPSMap(true)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg transition-colors text-sm cursor-pointer flex items-center gap-2">
                <MapPinned className="w-4 h-4" />
                {t.viewMap}
              </button>
            </div>
          </div>
          <div>
            {gpsLoading ? (
              <div className={`h-[420px] lg:h-[460px] relative z-0 flex items-center justify-center ${darkMode ? 'bg-gray-900/50' : 'bg-gray-50'}`}>
                <div className="text-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500 mx-auto mb-3"></div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {language === 'th' ? 'กำลังโหลดข้อมูล GPS...' : 'Loading GPS data...'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="h-[420px] lg:h-[460px] relative z-0">
                <GPSMap language={language} selectedDeviceId={selectedGpsDeviceId} devices={gpsDevices} selectTrigger={gpsSelectTrigger} showSummary={false} />
                {/* GPS Stats Overlay */}
                <div className={`absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none`}>
                  <div className={`px-3 py-2 rounded-lg backdrop-blur-md text-xs font-medium flex items-center gap-2 ${darkMode ? 'bg-gray-900/80 text-white' : 'bg-white/90 text-gray-800 shadow-sm'}`}>
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span>{gpsDevices.filter(d => d.status === 'online').length} {language === 'th' ? 'ออนไลน์' : 'Online'}</span>
                    <span className={`${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>|</span>
                    <Satellite className="w-3.5 h-3.5 text-indigo-500" />
                    <span>{trackedGpsCount} {language === 'th' ? 'มีพิกัด' : 'Tracked'}</span>
                  </div>
                  {dataChanged && (
                    <div className={`px-3 py-2 rounded-lg backdrop-blur-md text-xs font-medium flex items-center gap-2 ${darkMode ? 'bg-green-900/80 text-green-300' : 'bg-green-100/90 text-green-700'}`}>
                      <Signal className="w-3.5 h-3.5 animate-pulse" />
                      <span>{language === 'th' ? 'อัปเดตแล้ว' : 'Updated'}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* System Alerts Section */}
      <div id="event-alerts" className={`scroll-mt-36 rounded-lg border overflow-hidden shadow-sm ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
        }`}>
        <div className={`p-5 border-b ${darkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-100 bg-white'
          }`}>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-md flex items-center justify-center ${darkMode ? 'bg-amber-500/15 text-amber-300' : 'bg-amber-50 text-amber-600'}`}>
                <BellRing className="w-5 h-5" />
              </div>
              <div>
                <h2 className={`font-semibold text-base ${darkMode ? 'text-white' : 'text-slate-950'}`}>{t.alertsSection}</h2>
                <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{t.alertsSectionDesc}</p>
              </div>
            </div>

            {/* Date & Time Filter */}
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {t.startDate}
                  </label>
                  <input
                    type="date"
                    value={alertStartDate}
                    max={alertEndDate || undefined}
                    onChange={(e) => handleAlertStartDateChange(e.target.value)}
                    aria-invalid={visibleAlertFilterDateRangeError ? true : undefined}
                    className={`w-full h-9 px-3 rounded-md border text-xs outline-none transition-all ${visibleAlertFilterDateRangeError
                      ? 'border-rose-500 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/30'
                      : darkMode
                        ? 'bg-slate-800 border-slate-700 text-slate-100 focus:border-emerald-500 scheme-dark'
                        : 'bg-white border-slate-200 text-slate-700 focus:border-emerald-500'
                      }`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {t.startTime}
                  </label>
                  <input
                    type="time"
                    value={alertStartTime}
                    max={alertStartTimeMax}
                    onChange={(e) => handleAlertStartTimeChange(e.target.value)}
                    aria-invalid={visibleAlertFilterDateRangeError ? true : undefined}
                    className={`w-full h-9 px-3 rounded-md border text-xs outline-none transition-all ${visibleAlertFilterDateRangeError
                      ? 'border-rose-500 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/30'
                      : darkMode
                        ? 'bg-slate-800 border-slate-700 text-slate-100 focus:border-emerald-500 scheme-dark'
                        : 'bg-white border-slate-200 text-slate-700 focus:border-emerald-500'
                      }`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {t.endDate}
                  </label>
                  <input
                    type="date"
                    value={alertEndDate}
                    min={alertStartDate || undefined}
                    onChange={(e) => handleAlertEndDateChange(e.target.value)}
                    aria-invalid={visibleAlertFilterDateRangeError ? true : undefined}
                    className={`w-full h-9 px-3 rounded-md border text-xs outline-none transition-all ${visibleAlertFilterDateRangeError
                      ? 'border-rose-500 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/30'
                      : darkMode
                        ? 'bg-slate-800 border-slate-700 text-slate-100 focus:border-emerald-500 scheme-dark'
                        : 'bg-white border-slate-200 text-slate-700 focus:border-emerald-500'
                      }`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {t.endTime}
                  </label>
                  <input
                    type="time"
                    value={alertEndTime}
                    min={alertEndTimeMin}
                    onChange={(e) => handleAlertEndTimeChange(e.target.value)}
                    aria-invalid={visibleAlertFilterDateRangeError ? true : undefined}
                    className={`w-full h-9 px-3 rounded-md border text-xs outline-none transition-all ${visibleAlertFilterDateRangeError
                      ? 'border-rose-500 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/30'
                      : darkMode
                        ? 'bg-slate-800 border-slate-700 text-slate-100 focus:border-emerald-500 scheme-dark'
                        : 'bg-white border-slate-200 text-slate-700 focus:border-emerald-500'
                      }`}
                  />
                </div>
              </div>

              {visibleAlertFilterDateRangeError && (
                <p className={`text-xs font-medium ${darkMode ? 'text-rose-300' : 'text-rose-600'}`}>
                  {visibleAlertFilterDateRangeError}
                </p>
              )}

              {/* Clear Filter Button & Results Count */}
              <div className="flex items-center justify-between gap-3 pt-2">
                <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  {t.showingResults} <span className={`font-semibold ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{alerts.length}</span> {t.items}
                </div>
                {(alertStartDate || alertEndDate || alertStartTime || alertEndTime) && (
                  <button
                    onClick={() => {
                      setAlertStartDate('');
                      setAlertEndDate('');
                      setAlertStartTime('');
                      setAlertEndTime('');
                      setAlertFilterDateRangeError('');
                    }}
                    className={`px-4 py-1.5 rounded-md border text-xs font-semibold transition-colors cursor-pointer ${darkMode
                      ? 'border-rose-800/60 bg-rose-950/30 text-rose-300 hover:bg-rose-950/50'
                      : 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                      }`}
                  >
                    {t.clearFilter}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className={`p-4 ${darkMode ? 'bg-slate-900' : 'bg-white'}`}>
          {eventLogsLoading ? (
            <div className={`flex flex-col items-center justify-center py-12 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
              <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-lg ring-1 ${darkMode ? 'bg-slate-800 text-[#fcd500] ring-slate-700' : 'bg-slate-50 text-[#0c274b] ring-slate-200'}`}>
                <LoaderCircle className="h-6 w-6 animate-spin" />
              </div>
              <p className="text-sm font-semibold">
                {language === 'th' ? 'กำลังโหลดการแจ้งเตือน...' : 'Loading notifications...'}
              </p>
            </div>
          ) : alerts.length === 0 ? (
            <div className={`text-center py-12 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              <TriangleAlert className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-semibold">{t.noAlertsFound}</p>
              <p className="text-sm mt-1">{t.tryAdjustFilter}</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {currentAlerts.map((alert: AlertData) => (
                  <div
                    key={alert.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openAlertDetails(alert)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        openAlertDetails(alert);
                      }
                    }}
                    className={`p-4 rounded-lg border flex items-center justify-between transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:ring-offset-2 ${darkMode ? 'focus:ring-offset-slate-900' : 'focus:ring-offset-white'} ${
                      alert.isRead
                        ? darkMode
                          ? 'bg-slate-900 border-slate-700 hover:bg-slate-800'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                        : darkMode
                          ? 'bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/15'
                          : 'bg-amber-50 border-amber-200 hover:bg-amber-100/70'
                      }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <div className={`px-2 py-0.5 rounded-md font-bold text-xs ${alert.severity === 'high'
                          ? darkMode ? 'bg-rose-500/20 text-rose-200' : 'bg-rose-100 text-rose-700'
                          : darkMode ? 'bg-amber-500/20 text-amber-200' : 'bg-amber-100 text-amber-700'
                          }`}>
                          {t[alert.typeKey as keyof typeof t] || alert.typeKey}
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${darkMode
                          ? 'text-slate-300 bg-slate-800 border-slate-700'
                          : 'text-slate-500 bg-white border-slate-200'
                          }`}>
                          <Timer className="w-3 h-3 inline mr-1" />
                          {[alert.date, alert.time].filter(Boolean).join(' ') || '--:--'}
                        </span>
                        <span
                          title={alert.isRead ? readLabel : unreadLabel}
                          aria-label={alert.isRead ? readLabel : unreadLabel}
                          className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${alert.isRead
                            ? darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-400'
                            : darkMode ? 'bg-emerald-600 text-white' : 'bg-emerald-600 text-white'
                            }`}
                        >
                          {alert.isRead ? <CircleCheckBig className="h-4 w-4" /> : <CircleDot className="h-4 w-4" />}
                        </span>
                      </div>
                      <div className={`text-xs ${darkMode ? 'text-slate-300' : 'text-slate-600'} space-y-0.5`}>
                        <span className="font-semibold flex items-center gap-1 truncate"><UserCircle className="w-3 h-3" /> {alert.officer}</span>
                        <span className="flex items-center gap-1 truncate"><MapPinned className="w-3 h-3" /> {alert.location || '-'}</span>
                      </div>
                      {alert.mission && (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            void openRelatedMission(alert.mission, alert.id);
                          }}
                          className={`mt-2 inline-flex max-w-full items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold transition-colors ${darkMode
                            ? 'bg-sky-500/15 text-sky-200 hover:bg-sky-500/25'
                            : 'bg-sky-50 text-sky-700 hover:bg-sky-100'
                            }`}
                        >
                          <ClipboardList className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">
                            {language === 'th' ? 'ใบงาน' : 'Mission'} #{alert.mission.missionId}
                            {alert.mission.reportId ? ` (${alert.mission.reportId})` : ''}
                          </span>
                        </button>
                      )}
                      <div className={`mt-2 rounded-md border px-3 py-2 text-xs leading-5 ${darkMode
                        ? 'border-slate-700 bg-slate-950/30 text-slate-300'
                        : 'border-slate-200 bg-slate-50 text-slate-700'
                        }`}>
                        <div className={`mb-0.5 flex items-center gap-1.5 font-bold ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                          <FileText className="h-3.5 w-3.5" />
                          {language === 'th' ? 'รายละเอียด' : 'Details'}
                        </div>
                        <p className="line-clamp-2 break-words">
                          {alert.details || '-'}
                        </p>
                      </div>
                    </div>
                    <button className={`ml-2 p-2 rounded-lg transition-colors flex-shrink-0 ${
                      alert.mission
                        ? darkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer' : 'bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer'
                        : darkMode ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                    }`}
                      type="button"
                      aria-label={language === 'th' ? 'เปิดใบงาน' : 'Open Mission'}
                      disabled={!alert.mission}
                      onClick={(event) => {
                        event.stopPropagation();
                        void openRelatedMission(alert.mission, alert.id);
                      }}
                    >
                      <ClipboardList className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              {alerts.length > alertsPerPage && (
                <div className={`flex items-center justify-between mt-4 pt-4 border-t ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                  <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {t.page} {alertPage} {t.of} {alertPageCount} ({alerts.length} {t.items})
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setAlertPage(p => Math.max(1, p - 1))}
                      disabled={alertPage === 1}
                      className={`p-1.5 rounded-md transition-colors ${alertPage === 1
                        ? 'opacity-40 cursor-not-allowed'
                        : `cursor-pointer ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`
                        } ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    {getAlertPageNumbers().map((page, index) => {
                      if (page === '...') {
                        return (
                          <span key={`alert-page-ellipsis-${index}`} className={`px-2 text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                            ...
                          </span>
                        );
                      }

                      return (
                        <button
                          key={`alert-page-${page}`}
                          onClick={() => setAlertPage(page as number)}
                          className={`h-8 min-w-8 rounded-md px-2 text-xs font-semibold transition-colors cursor-pointer ${alertPage === page
                            ? darkMode ? 'bg-slate-800 text-slate-300 ring-1 ring-slate-700' : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'
                            : darkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-100'
                            }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setAlertPage(p => Math.min(alertPageCount, p + 1))}
                      disabled={alertPage >= alertPageCount}
                      className={`p-1.5 rounded-md transition-colors ${alertPage >= alertPageCount
                        ? 'opacity-40 cursor-not-allowed'
                        : `cursor-pointer ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`
                        } ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
              {alertHasMore && (
                <div className="mt-4 flex justify-center">
                  <button
                    onClick={() => void loadMoreEventLogs()}
                    disabled={alertsLoadingMore}
                    className={`inline-flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold transition-colors ${alertsLoadingMore
                      ? 'opacity-60 cursor-not-allowed'
                      : 'cursor-pointer'
                      } ${darkMode ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                  >
                    {alertsLoadingMore ? (
                      <>
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                        {language === 'th' ? 'กำลังโหลด...' : 'Loading...'}
                      </>
                    ) : (
                      language === 'th' ? 'ดูเพิ่มเติม' : 'Load more'
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Alert Detail Modal */}
      {selectedAlertData && (
        <AlertDetailModal
          alert={selectedAlertData}
          language={language}
          darkMode={darkMode}
          onClose={() => setSelectedAlert(null)}
          onOpenMission={openRelatedMission}
        />
      )}

      {/* GPS Map Modal */}
      {showGPSMap && (
        <GPSMapModal
          language={language}
          darkMode={darkMode}
          gpsDevices={gpsDevices}
          selectedGpsDeviceId={selectedGpsDeviceId}
          gpsSelectTrigger={gpsSelectTrigger}
          onClose={() => setShowGPSMap(false)}
        />
      )}

      {/* Camera Stream Modal */}
      {selectedCamera && (
        <CameraStreamModal
          camera={selectedCamera}
          language={language}
          darkMode={darkMode}
          streamUrl={streamUrl}
          streamLoading={streamLoading}
          streamError={streamError}
          cameraIsOffline={cameraIsOffline}
          onClose={closeCameraModal}
          onRetry={() => fetchCameraStream(selectedCamera)}
        />
      )}
    </div>
  );
}
