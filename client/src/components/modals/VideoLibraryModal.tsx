import { useCallback, useEffect, useState, useRef } from 'react';
import { X, Play, Download, Clock, Video, Cctv, Loader2, CheckCircle2, AlertCircle, History, Search } from 'lucide-react';
import Hls from 'hls.js';
import Swal from 'sweetalert2';
import type { VideoLibrarySqlData } from '../../features/video-library/types';
import type { VideoLibraryTranslationData, VideoLibraryLanguage } from '../../locales/videoLibraryTranslations';
import {
  cancelConversion,
  checkVideoCache,
  convertAndCacheVideo,
  getPlayback,
  searchRecordings,
} from '../../services/videoService';
import {
  formatDownloadDateTime,
  formatDownloadDuration,
} from '../../lib/videoDownloadSummary';
import { isEndTimeBeforeStartTime } from '../../lib/videoPlaybackTimeValidation';

interface VideoLibraryModalProps {
  show: boolean;
  video: VideoLibrarySqlData | null;
  onClose: () => void;
  onArchive: (id: string) => void;
  translations: VideoLibraryTranslationData;
  language: VideoLibraryLanguage;
  darkMode: boolean;
}

interface RecordingRange {
  channelId: string;
  startTime: string;
  endTime: string;
  startDateTime: string;
  endDateTime: string;
  duration_seconds?: number;
  duration_minutes?: number;
  duration_hours?: number;
}

const clampRecordingDaysBack = (value: number) => {
  if (!Number.isFinite(value)) return 1;
  return Math.min(30, Math.max(1, Math.floor(value)));
};

export function VideoLibraryModal({ show, video, onClose, translations, language, darkMode }: VideoLibraryModalProps) {
  // Playback states
  const [playbackStartDateTime, setPlaybackStartDateTime] = useState('');
  const [playbackEndDateTime, setPlaybackEndDateTime] = useState('');
  const [playbackLoading, setPlaybackLoading] = useState(false);
  const [playbackError, setPlaybackError] = useState('');
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [showPlayer, setShowPlayer] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  // Download states
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadPhase, setDownloadPhase] = useState<'idle' | 'converting' | 'downloading' | 'complete'>('idle');
  const [downloadError, setDownloadError] = useState('');
  const downloadAbortRef = useRef<AbortController | null>(null);
  const [recordingRanges, setRecordingRanges] = useState<RecordingRange[]>([]);
  const [recordingLoading, setRecordingLoading] = useState(false);
  const [recordingError, setRecordingError] = useState('');
  const [recordingDaysBack, setRecordingDaysBack] = useState(3);
  const [recordingSearchPerformed, setRecordingSearchPerformed] = useState(false);
  const recordingDaysBackRef = useRef(recordingDaysBack);
  const recordingSearchRequestIdRef = useRef(0);

  // Initialize video player when playbackUrl changes
  // Supports both HLS streams and MP4 files (cached videos)
  useEffect(() => {
    if (showPlayer && playbackUrl && videoRef.current) {
      const video = videoRef.current;

      // Cleanup previous HLS instance
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      // Check if URL is MP4 (cached video) or HLS stream
      const isMp4 = playbackUrl.includes('/stream-cached-video/') || playbackUrl.endsWith('.mp4');

      if (isMp4) {
        // Play MP4 directly (cached video from server)
        console.log('Playing cached MP4 directly');
        video.src = playbackUrl;
        video.load();
        video.play().catch(err => console.log('Autoplay prevented:', err));
      } else if (Hls.isSupported()) {
        // Use HLS.js for HLS streams
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
        });
        hlsRef.current = hls;
        hls.loadSource(playbackUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(err => console.log('Autoplay prevented:', err));
        });
        hls.on(Hls.Events.ERROR, (_event, data) => {
          console.error('HLS error:', data);
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                setPlaybackError(language === 'th' ? 'เกิดข้อผิดพลาดในการโหลดวิดีโอ' : 'Network error loading video');
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                setPlaybackError(language === 'th' ? 'เกิดข้อผิดพลาดในการเล่นวิดีโอ' : 'Media error playing video');
                hls.recoverMediaError();
                break;
              default:
                setPlaybackError(language === 'th' ? 'ไม่สามารถเล่นวิดีโอได้' : 'Cannot play video');
                hls.destroy();
                break;
            }
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Safari native HLS support
        video.src = playbackUrl;
        video.addEventListener('loadedmetadata', () => {
          video.play().catch(err => console.log('Autoplay prevented:', err));
        });
      } else {
        setPlaybackError(language === 'th' ? 'เบราว์เซอร์ไม่รองรับการเล่น HLS' : 'Browser does not support HLS playback');
      }
    }

    // Cleanup on unmount or when player closes
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [showPlayer, playbackUrl, language]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (show) {
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
  }, [show]);

  // Format datetime for API: "2026-04-23 14:38:00"
  const formatDateTimeForApi = (dateTimeLocal: string) => {
    if (!dateTimeLocal) return '';
    // If already has seconds (YYYY-MM-DDTHH:MM:SS), just replace T with space
    if (dateTimeLocal.length === 19) {
      return dateTimeLocal.replace('T', ' ');
    }
    // If no seconds (YYYY-MM-DDTHH:MM), add :00
    return dateTimeLocal.replace('T', ' ') + ':00';
  };

  // Generate channelId from cameraCode: "1000067" -> "1000067$1$0$0"
  const generateChannelId = (cameraCode: string) => {
    return `${cameraCode}$1$0$0`;
  };

  const formatRecordingDateTimeForInput = (dateTime: string) => {
    if (!dateTime) return '';
    return dateTime.replace(' ', 'T').slice(0, 19);
  };

  const formatRecordingRangeLabel = (record: RecordingRange) => {
    const locale = language === 'th' ? 'th-TH' : 'en-US';
    const format = (value: string) => {
      const date = new Date(value.replace(' ', 'T'));
      if (Number.isNaN(date.getTime())) return value;
      return date.toLocaleString(locale, {
        calendar: 'gregory',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    };

    return `${format(record.startDateTime)} - ${format(record.endDateTime)}`;
  };

  const formatRecordingSearchRangeLabel = (daysBack: number) => {
    const locale = language === 'th' ? 'th-TH' : 'en-US';
    const safeDaysBack = clampRecordingDaysBack(daysBack);
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - safeDaysBack);

    const format = (date: Date) => date.toLocaleDateString(locale, {
      calendar: 'gregory',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    return `${format(startDate)} - ${format(endDate)}`
  };

  const formatRecordingDuration = (record: RecordingRange) => {
    const seconds = Number(record.duration_seconds ?? 0);
    if (!Number.isFinite(seconds) || seconds <= 0) return '-';
    if (seconds < 60) return language === 'th' ? `${seconds} วินาที` : `${seconds}s`;

    const minutes = seconds / 60;
    if (minutes < 60) {
      return language === 'th' ? `${minutes.toFixed(1)} นาที` : `${minutes.toFixed(1)} min`;
    }

    const hours = minutes / 60;
    return language === 'th' ? `${hours.toFixed(2)} ชม.` : `${hours.toFixed(2)} hr`;
  };

  const fetchRecordingRanges = useCallback(async (cameraCode: string, daysBack: number) => {
    const searchRequestId = recordingSearchRequestIdRef.current + 1;
    recordingSearchRequestIdRef.current = searchRequestId;
    setRecordingLoading(true);
    setRecordingError('');
    setRecordingSearchPerformed(true);

    const safeDaysBack = clampRecordingDaysBack(daysBack);

    try {
      const data = await searchRecordings<{
        code?: number;
        desc?: string;
        data?: { records?: RecordingRange[] };
      }>({
        channelId: generateChannelId(cameraCode),
        daysBack: safeDaysBack,
      });

      if (data?.code !== 1000) {
        throw new Error(data?.desc || 'Failed to search recordings');
      }

      if (recordingSearchRequestIdRef.current !== searchRequestId) {
        return;
      }

      setRecordingRanges(Array.isArray(data?.data?.records) ? data.data.records : []);
    } catch (error) {
      if (recordingSearchRequestIdRef.current !== searchRequestId) {
        return;
      }

      console.error('Recording search error:', error);
      setRecordingRanges([]);
      setRecordingError(language === 'th' ? 'ไม่สามารถโหลดช่วงไฟล์ย้อนหลังได้' : 'Could not load recording ranges');
    } finally {
      if (recordingSearchRequestIdRef.current === searchRequestId) {
        setRecordingLoading(false);
      }
    }
  }, [language]);

  const handleRecordingDaysBackChange = (value: string) => {
    recordingSearchRequestIdRef.current += 1;
    setRecordingDaysBack(clampRecordingDaysBack(Number(value)));
    setRecordingLoading(false);
    setRecordingRanges([]);
    setRecordingError('');
    setRecordingSearchPerformed(false);
  };

  useEffect(() => {
    recordingDaysBackRef.current = recordingDaysBack;
  }, [recordingDaysBack]);

  const applyRecordingRange = (record: RecordingRange) => {
    setPlaybackStartDateTime(formatRecordingDateTimeForInput(record.startDateTime));
    setPlaybackEndDateTime(formatRecordingDateTimeForInput(record.endDateTime));
    setPlaybackUrl(null);
    setShowPlayer(false);
    setPlaybackError('');
    setDownloadError('');
    setDownloadProgress(0);
    setDownloadPhase('idle');
  };

  // Reset states when modal opens with new video
  useEffect(() => {
    if (show && video) {
      // Pre-fill datetime from video data
      // Convert UTC to local time for datetime-local input (format: "YYYY-MM-DDTHH:MM")
      const formatForInput = (isoString: string) => {
        if (!isoString) return '';
        try {
          const date = new Date(isoString);
          // Format as local datetime for input: YYYY-MM-DDTHH:MM
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const hours = String(date.getHours()).padStart(2, '0');
          const minutes = String(date.getMinutes()).padStart(2, '0');
          return `${year}-${month}-${day}T${hours}:${minutes}`;
        } catch {
          return isoString.substring(0, 16);
        }
      };
      const startDT = formatForInput(video.startTime);
      const endDT = formatForInput(video.endTime);
      setPlaybackStartDateTime(startDT);
      setPlaybackEndDateTime(endDT);
      setPlaybackUrl(null);
      setShowPlayer(false);
      setPlaybackError('');
      // Reset download states
      setDownloadLoading(false);
      setDownloadProgress(0);
      setDownloadPhase('idle');
      setDownloadError('');
      setRecordingRanges([]);
      setRecordingError('');
      setRecordingSearchPerformed(false);
      if (downloadAbortRef.current) {
        downloadAbortRef.current.abort();
        downloadAbortRef.current = null;
      }
      if (video.cameraCode) {
        void fetchRecordingRanges(video.cameraCode, recordingDaysBackRef.current);
      }
    }
  }, [fetchRecordingRanges, show, video]);

  const handlePlaybackTimeChange = (field: 'start' | 'end', value: string) => {
    if (field === 'start') {
      setPlaybackStartDateTime(value);
    } else {
      setPlaybackEndDateTime(value);
    }
    setPlaybackError('');
    setDownloadError('');
    setDownloadProgress(0);
    setDownloadPhase('idle');
  };

  if (!show || !video) return null;

  const timeRangeOrderErrorMessage = language === 'th'
    ? 'เวลาสิ้นสุดต้องไม่น้อยกว่าเวลาเริ่มต้น'
    : 'End time cannot be earlier than start time';
  const playbackTimeRangeInvalid = isEndTimeBeforeStartTime(playbackStartDateTime, playbackEndDateTime);
  const playbackActionDisabled = playbackLoading || !video.cameraCode || !playbackStartDateTime || !playbackEndDateTime || playbackTimeRangeInvalid;
  const downloadActionDisabled = !video.cameraCode || !playbackStartDateTime || !playbackEndDateTime || playbackTimeRangeInvalid;
  const downloadStartLabel = formatDownloadDateTime(playbackStartDateTime, language);
  const downloadEndLabel = formatDownloadDateTime(playbackEndDateTime, language);
  const downloadDurationLabel = formatDownloadDuration(
    playbackStartDateTime,
    playbackEndDateTime,
    language,
  );

  const getTimeString = (isoString: string) => {
    if (!isoString) return '-';
    try {
      return new Date(isoString).toLocaleTimeString(language === 'th' ? 'th-TH' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  const handleRequestPlayback = async () => {
    if (!video.cameraCode || !playbackStartDateTime || !playbackEndDateTime) {
      setPlaybackError(language === 'th' ? 'กรุณาเลือกช่วงเวลาให้ครบถ้วน' : 'Please select time range');
      return;
    }

    if (playbackTimeRangeInvalid) {
      return;
    }

    setPlaybackLoading(true);
    setPlaybackError('');
    setPlaybackUrl(null);

    // Playback should stream directly. Download preparation only happens when the user clicks download.
    try {
      const data = await getPlayback<{
        code?: number;
        data?: { video_url?: string };
        url?: string;
        desc?: string;
      }>({
        deviceCode: video.cameraCode,
        channelId: generateChannelId(video.cameraCode),
        startTime: formatDateTimeForApi(playbackStartDateTime),
        endTime: formatDateTimeForApi(playbackEndDateTime),
      });
      console.log(' Playback API response:', data);
      // Handle new response format: { code: 1000, data: { video_url: "..." } }
      if (data.code === 1000 && data.data?.video_url) {
        console.log('Playing HLS from playback API');
        setPlaybackUrl(data.data.video_url);
        setShowPlayer(true);
      } else if (data.url) {
        console.log('Playing HLS from legacy playback API');
        // Fallback for old format
        setPlaybackUrl(data.url);
        setShowPlayer(true);
      } else {
        console.log(' No playback URL found in response');
        setPlaybackError(translations.noPlaybackData);
      }
    } catch (error) {
      console.error('Playback error:', error);
      setPlaybackError(translations.playbackError);
    } finally {
      setPlaybackLoading(false);
    }
  };

  const getPlaybackParams = (cameraCode: string) => ({
    deviceCode: cameraCode,
    channelId: generateChannelId(cameraCode),
    startTime: formatDateTimeForApi(playbackStartDateTime),
    endTime: formatDateTimeForApi(playbackEndDateTime)
  });

  const waitForDownloadPoll = (signal: AbortSignal) =>
    new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(resolve, 2000);

      signal.addEventListener('abort', () => {
        window.clearTimeout(timeout);
        reject(new DOMException('Download cancelled', 'AbortError'));
      }, { once: true });
    });

  const downloadCachedVideo = async (cacheKey: string, filename: string, signal: AbortSignal) => {
    setDownloadPhase('downloading');
    setDownloadProgress(0);

    const response = await fetch(`/api_internal/stream-cached-video/${cacheKey}`, {
      credentials: 'include',
      signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.details || 'Download failed');
    }

    const contentLength = response.headers.get('Content-Length');
    const totalSize = contentLength ? parseInt(contentLength, 10) : 0;
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const chunks: BlobPart[] = [];
    let receivedLength = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      receivedLength += value.length;

      if (totalSize > 0) {
        const percent = Math.round((receivedLength / totalSize) * 100);
        setDownloadProgress(Math.min(99, percent));
      }
    }

    const blob = new Blob(chunks, { type: 'video/mp4' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // Handle video download - starts backend conversion first, then downloads the cached MP4.
  const handleDownload = async () => {
    if (!video.cameraCode || !playbackStartDateTime || !playbackEndDateTime) {
      setDownloadError(language === 'th' ? 'กรุณาเลือกช่วงเวลาให้ครบถ้วน' : 'Please select time range first');
      return;
    }

    if (playbackTimeRangeInvalid) {
      return;
    }

    setDownloadLoading(true);
    setDownloadPhase('converting');
    setDownloadProgress(0);
    setDownloadError('');

    downloadAbortRef.current = new AbortController();
    const signal = downloadAbortRef.current.signal;

    try {
      const cameraCode = video.cameraCode;
      const startDate = playbackStartDateTime.replace('T', '_').replace(/:/g, '-');
      const filename = `${video.reportId || video.missionId}_${cameraCode}_${startDate}.mp4`;
      const playbackParams = getPlaybackParams(cameraCode);

      const convertData = await convertAndCacheVideo<{
        cacheKey?: string;
        cached?: boolean;
      }>(playbackParams, signal);
      let cacheKey = convertData?.cacheKey;
      let cacheReady = Boolean(convertData?.cached && cacheKey);

      if (cacheReady) {
        setDownloadProgress(100);
      } else {
        const maxPolls = 180; // 6 minutes at 2 seconds per poll
        for (let attempt = 0; attempt < maxPolls; attempt++) {
          const cacheData = await checkVideoCache<{
            cached?: boolean;
            cacheKey?: string;
            converting?: boolean;
            progress?: number;
          }>(playbackParams, signal);

          if (cacheData.cached && cacheData.cacheKey) {
            cacheKey = cacheData.cacheKey;
            cacheReady = true;
            setDownloadProgress(100);
            break;
          }

          if (cacheData.converting) {
            const backendProgress = typeof cacheData.progress === 'number' ? cacheData.progress : 0;
            setDownloadProgress(Math.min(99, Math.max(0, backendProgress)));
            await waitForDownloadPoll(signal);
            continue;
          }

          await waitForDownloadPoll(signal);
        }
      }

      if (!cacheKey || !cacheReady) {
        throw new Error('Conversion timed out before the file was ready');
      }

      await downloadCachedVideo(cacheKey, filename, signal);
      setDownloadPhase('complete');
      setDownloadProgress(100);

      Swal.fire({
        icon: 'success',
        title: language === 'th' ? 'ดาวน์โหลดสำเร็จ!' : 'Download Complete!',
        text: language === 'th' ? `ไฟล์ ${filename} ถูกดาวน์โหลดเรียบร้อยแล้ว` : `File ${filename} has been downloaded successfully`,
        confirmButtonText: language === 'th' ? 'ตกลง' : 'OK',
        confirmButtonColor: '#10b981',
      });

      // Reset after success
      setTimeout(() => {
        setDownloadLoading(false);
        setDownloadProgress(0);
        setDownloadPhase('idle');
      }, 1500);

    } catch (error: unknown) {
      if (error instanceof Error && (error.name === 'AbortError' || error.name === 'CanceledError')) {
        console.log('Download cancelled');
        setDownloadError(language === 'th' ? 'ยกเลิกการดาวน์โหลด' : 'Download cancelled');
      } else {
        console.error('Download error:', error);
        const errorMsg = error instanceof Error ? error.message : 'Download failed';
        setDownloadError(language === 'th' ? `เกิดข้อผิดพลาด: ${errorMsg}` : `Error: ${errorMsg}`);
      }
      setDownloadLoading(false);
      setDownloadProgress(0);
      setDownloadPhase('idle');
    } finally {
      downloadAbortRef.current = null;
    }
  };

  // Cancel ongoing download and stop backend conversion
  const handleCancelDownload = async () => {
    // Abort the fetch request
    if (downloadAbortRef.current) {
      downloadAbortRef.current.abort();
      downloadAbortRef.current = null;
    }
    setDownloadLoading(false);
    setDownloadProgress(0);
    
    // Call backend to cancel ffmpeg process and cleanup files
    if (video?.cameraCode && playbackStartDateTime && playbackEndDateTime) {
      try {
        await cancelConversion({
          playbackParams: {
            deviceCode: video.cameraCode,
            startTime: formatDateTimeForApi(playbackStartDateTime),
            endTime: formatDateTimeForApi(playbackEndDateTime)
          }
        });
        console.log('Download cancelled - backend conversion stopped');
      } catch (err) {
        console.error('Failed to cancel backend conversion:', err);
      }
    }
  };

  const getStatusBadge = (status?: string) => {
    if (status === '3') {
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${darkMode ? 'bg-emerald-500/15 text-emerald-300' : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'}`}>
          <CheckCircle2 className="w-3.5 h-3.5" />
          {language === 'th' ? 'เสร็จสิ้น' : 'Completed'}
        </span>
      );
    } else if (status === '7') {
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${darkMode ? 'bg-rose-500/15 text-rose-300' : 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'}`}>
          <AlertCircle className="w-3.5 h-3.5" />
          {language === 'th' ? 'งานฉุกเฉินเสร็จสิ้น' : 'Emergency Completed'}
        </span>
      );
    }
    return null;
  };

  const theme = {
    overlay: darkMode ? 'bg-slate-950/80' : 'bg-slate-900/50',
    shell: darkMode
      ? 'bg-gradient-to-b from-slate-900 to-slate-950 ring-1 ring-white/10'
      : 'bg-gradient-to-b from-white to-slate-50 ring-1 ring-slate-200/80',
    headerBorder: darkMode ? 'border-white/10' : 'border-slate-200',
    headerBg: darkMode
      ? 'bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/30'
      : 'bg-gradient-to-r from-white via-white to-emerald-50/60',
    content: darkMode ? 'bg-slate-950/60' : 'bg-slate-100/70',
    surface: darkMode
      ? 'bg-slate-900/70 ring-1 ring-white/10 backdrop-blur-sm'
      : 'bg-white ring-1 ring-slate-200/70 shadow-sm shadow-slate-200/50',
    divider: darkMode ? 'divide-white/[0.06]' : 'divide-slate-200/80',
    hairline: darkMode ? 'border-white/[0.06]' : 'border-slate-200/80',
    gridLines: darkMode ? 'bg-white/[0.06]' : 'bg-slate-200/80',
    cell: darkMode ? 'bg-slate-900/80' : 'bg-white',
    fieldTint: darkMode ? 'bg-white/[0.03]' : 'bg-slate-50',
    title: darkMode ? 'text-white' : 'text-slate-900',
    body: darkMode ? 'text-slate-300' : 'text-slate-700',
    muted: darkMode ? 'text-slate-400' : 'text-slate-500',
    faint: darkMode ? 'text-slate-500' : 'text-slate-400',
    input: darkMode ? 'border-white/10 bg-slate-950 text-white [color-scheme:dark]' : 'border-slate-300 bg-white text-slate-900',
    close: darkMode ? 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white hover:rotate-90' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 hover:rotate-90',
    secondaryButton: darkMode ? 'bg-slate-800 text-slate-100 ring-1 ring-white/15 hover:bg-slate-700 hover:ring-white/25' : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 hover:ring-slate-300',
    disabledButton: darkMode ? 'bg-white/5 text-slate-600' : 'bg-slate-100 text-slate-400',
    track: darkMode ? 'bg-white/10' : 'bg-slate-200',
    error: darkMode ? 'border-rose-500/30 bg-rose-500/10 text-rose-300' : 'border-rose-200 bg-rose-50 text-rose-700',
    playbackPlaceholder: 'from-slate-950 via-slate-900 to-slate-950',
    iconTileEmerald: darkMode ? 'bg-gradient-to-br from-emerald-500/25 to-emerald-500/5 text-emerald-300 ring-1 ring-emerald-500/20' : 'bg-gradient-to-br from-emerald-500/15 to-emerald-400/5 text-emerald-600 ring-1 ring-emerald-500/15',
    iconTileSky: darkMode ? 'bg-gradient-to-br from-sky-500/25 to-sky-500/5 text-sky-300 ring-1 ring-sky-500/20' : 'bg-gradient-to-br from-sky-500/15 to-sky-400/5 text-sky-600 ring-1 ring-sky-500/15',
    primaryButton: 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg shadow-emerald-600/25 hover:from-emerald-500 hover:to-emerald-400 hover:shadow-emerald-500/30',
    downloadButton: 'bg-gradient-to-r from-sky-600 to-sky-500 text-white shadow-lg shadow-sky-600/25 hover:from-sky-500 hover:to-sky-400 hover:shadow-sky-500/30',
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200 ${theme.overlay}`}>
      <div className={`relative flex max-h-[95vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl shadow-2xl motion-safe:animate-in motion-safe:zoom-in-95 motion-safe:duration-200 ${theme.shell}`}>
        {/* Accent gradient bar */}
        <div className="h-1 w-full shrink-0 bg-gradient-to-r from-emerald-500 via-emerald-400 to-sky-500" />

        {/* Header - Fixed */}
        <div className={`flex shrink-0 items-center justify-between gap-4 border-b px-6 py-4 ${theme.headerBg} ${theme.headerBorder}`}>
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-600/30 ring-1 ring-emerald-400/30">
              <Video className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <div className="mt-0.5 flex flex-wrap items-center gap-2.5">
                <h2 className={`font-mono text-xl font-bold tracking-tight ${theme.title}`}>{video.reportId || video.missionId}</h2>
                {getStatusBadge(video.missionStatus)}
              </div>
              <p className={`mt-0.5 truncate text-sm ${theme.body}`}>{video.missionName || (language === 'th' ? 'ไม่มีชื่อภารกิจ' : 'No mission name')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label={translations.close}
            className={`shrink-0 cursor-pointer rounded-xl p-2 transition-all duration-200 ${theme.close}`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className={`p-5 sm:p-6 ${theme.content}`}>
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              {/* Left Column - Video Player & Playback Controls (2/3 width) */}
              <div className="space-y-5 lg:col-span-2">
                {/* Video Player / Playback Section */}
                <div className={`overflow-hidden rounded-2xl ${theme.surface}`}>
                  {showPlayer && playbackUrl ? (
                    // HLS Video Player
                    <div className="relative">
                      <video
                        ref={videoRef}
                        controls
                        className="aspect-video w-full bg-black"
                        playsInline
                      >
                        {language === 'th' ? 'เบราว์เซอร์ของคุณไม่รองรับการเล่นวิดีโอ' : 'Your browser does not support video playback'}
                      </video>
                      <button
                        onClick={() => {
                          setShowPlayer(false);
                          setPlaybackUrl(null);
                          if (hlsRef.current) {
                            hlsRef.current.destroy();
                            hlsRef.current = null;
                          }
                        }}
                        aria-label={translations.close}
                        className="absolute right-3 top-3 cursor-pointer rounded-lg bg-black/60 p-2 text-white backdrop-blur-sm transition-colors hover:bg-black/80"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  ) : (
                    // Playback Request UI
                    <div className={`relative flex aspect-video items-center justify-center overflow-hidden bg-gradient-to-br ${theme.playbackPlaceholder}`}>
                      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMyMDIwMjAiIGZpbGwtb3BhY2l0eT0iMC40Ij48cGF0aCBkPSJNMzYgMzRoLTJ2LTRoMnY0em0wLTZ2LTRoLTJ2NGgyem0tNiA2aC00djJoNHYtMnptMC0xMGgtNHYyaDR2LTJ6bTEwIDBoLTR2Mmg0di0yem0tMTAgNmgtNHYyaDR2LTJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-20" />
                      <div className="pointer-events-none absolute inset-4 rounded-lg border border-white/10" />
                      <div className="relative z-10 max-w-md px-6 text-center">
                        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/20 motion-safe:animate-pulse">
                          <Cctv className="h-10 w-10 text-emerald-400" />
                        </div>
                        <h3 className="text-lg font-bold text-white">
                          {language === 'th' ? 'ดูวิดีโอย้อนหลัง' : 'Video Playback'}
                        </h3>
                        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 text-xs text-slate-300 ring-1 ring-white/10">
                            <Cctv className="h-3.5 w-3.5 text-emerald-400" />
                            {video.deviceName || 'N/A'}
                          </span>
                          <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-3 py-1 font-mono text-xs font-semibold text-emerald-300 ring-1 ring-emerald-500/20">
                            {video.cameraCode || 'N/A'}
                          </span>
                        </div>
                        <p className="mt-3 text-xs text-slate-500">
                          {language === 'th' ? 'เลือกช่วงเวลาด้านล่างและกดเล่นวิดีโอ' : 'Select a time range below and press play'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Time Range & Actions */}
                <div className={`overflow-hidden rounded-2xl ${theme.surface}`}>
                  <div className={`flex items-center gap-3 border-b px-5 py-4 ${theme.hairline}`}>
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${theme.iconTileEmerald}`}>
                      <Clock className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <h4 className={`text-sm font-bold ${theme.title}`}>
                        {language === 'th' ? 'เลือกช่วงเวลา' : 'Select Time Range'}
                      </h4>
                      <p className={`text-xs ${theme.muted}`}>
                        {language === 'th' ? 'ใช้ช่วงเวลาเดียวกันสำหรับเล่นและดาวน์โหลดวิดีโอ' : 'The same range is used for playback and download'}
                      </p>
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {/* Start DateTime */}
                      <div>
                        <label className={`mb-1.5 block text-xs font-semibold uppercase tracking-wide ${theme.muted}`}>
                          {translations.selectStartTime}
                        </label>
                        <div className="relative">
                          <Clock className="pointer-events-none absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-emerald-400" />
                          <input
                            type="datetime-local"
                            step="1"
                            value={playbackStartDateTime}
                            onChange={(e) => {
                              handlePlaybackTimeChange('start', e.target.value);
                            }}
                            className={`w-full rounded-lg border py-2.5 pl-10 pr-3 text-sm outline-none transition-all focus:ring-2 focus:ring-emerald-500/40 ${theme.input}`}
                          />
                        </div>
                      </div>

                      {/* End DateTime */}
                      <div>
                        <label className={`mb-1.5 block text-xs font-semibold uppercase tracking-wide ${theme.muted}`}>
                          {translations.selectEndTime}
                        </label>
                        <div className="relative">
                          <Clock className="pointer-events-none absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-emerald-400" />
                          <input
                            type="datetime-local"
                            step="1"
                            value={playbackEndDateTime}
                            min={playbackStartDateTime || undefined}
                            aria-invalid={playbackTimeRangeInvalid}
                            onChange={(e) => {
                              handlePlaybackTimeChange('end', e.target.value);
                            }}
                            className={`w-full rounded-lg border py-2.5 pl-10 pr-3 text-sm outline-none transition-all ${theme.input} ${playbackTimeRangeInvalid ? 'border-rose-500 focus:ring-2 focus:ring-rose-500/40' : 'focus:ring-2 focus:ring-emerald-500/40'}`}
                          />
                        </div>
                        {playbackTimeRangeInvalid && (
                          <p className="mt-1.5 text-xs font-medium text-red-500">
                            {timeRangeOrderErrorMessage}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Selected Range Summary */}
                    <div className={`mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-xl border px-4 py-2.5 ${theme.hairline} ${theme.fieldTint}`}>
                      <p className={`min-w-0 text-xs tabular-nums ${theme.muted}`}>
                        <span className={`font-semibold ${theme.body}`}>{downloadStartLabel}</span>
                        <span className="mx-1.5">→</span>
                        <span className={`font-semibold ${theme.body}`}>{downloadEndLabel}</span>
                      </p>
                      <p className="shrink-0 text-xs font-bold tabular-nums text-emerald-500">
                        {language === 'th' ? 'รวม ' : 'Total '}{downloadDurationLabel}
                      </p>
                    </div>

                    {/* Error Messages */}
                    {playbackError && (
                      <div className={`mt-4 flex items-center gap-2 rounded-lg border p-3 text-sm ${theme.error}`}>
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        {playbackError}
                      </div>
                    )}
                    {downloadError && (
                      <div className={`mt-4 flex items-center gap-2 rounded-lg border p-3 text-sm ${theme.error}`}>
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>{downloadError}</span>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className={`mt-4 grid grid-cols-1 gap-3 ${downloadLoading ? '' : 'sm:grid-cols-2'}`}>
                      <button
                        onClick={handleRequestPlayback}
                        disabled={playbackActionDisabled}
                        className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all duration-200 ${playbackActionDisabled ? `cursor-not-allowed ${theme.disabledButton}` : `cursor-pointer ${theme.primaryButton}`}`}
                      >
                        {playbackLoading ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            <span>{translations.loadingPlayback}</span>
                          </>
                        ) : (
                          <>
                            <Play className="h-5 w-5 fill-current" />
                            <span>{language === 'th' ? 'เล่นวิดีโอย้อนหลัง' : 'Play Video'}</span>
                          </>
                        )}
                      </button>

                      {!downloadLoading && (
                        <button
                          onClick={handleDownload}
                          disabled={downloadActionDisabled}
                          className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all duration-200 ${downloadActionDisabled ? `cursor-not-allowed ${theme.disabledButton}` : `cursor-pointer ${theme.downloadButton}`}`}
                        >
                          <Download className="h-5 w-5" />
                          <span>{language === 'th' ? 'ดาวน์โหลดไฟล์ MP4' : 'Download MP4 File'}</span>
                        </button>
                      )}
                    </div>

                    {/* Download Progress */}
                    {downloadLoading && (
                      <div className="mt-4 w-full">
                        <div className="mb-2 flex items-center justify-between">
                          <span className={`text-sm font-medium ${theme.body}`}>
                            {downloadPhase === 'converting'
                              ? (language === 'th' ? 'กำลังแปลงไฟล์...' : 'Converting file....')
                              : downloadPhase === 'downloading'
                                ? (language === 'th' ? 'กำลังดาวน์โหลดไฟล์...' : 'Downloading file...')
                                : (language === 'th' ? 'ดาวน์โหลดสำเร็จ!' : 'Download complete!')}
                          </span>
                          <span className="text-sm font-bold text-sky-400">
                            {Math.round(downloadProgress)}%
                          </span>
                        </div>
                        <div className={`h-2.5 w-full overflow-hidden rounded-full ${theme.track}`}>
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-sky-500 to-sky-400 transition-all duration-300 ease-out"
                            style={{ width: `${downloadProgress}%` }}
                          />
                        </div>
                        {downloadProgress < 100 && (
                          <button
                            onClick={handleCancelDownload}
                            className="mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-rose-500"
                          >
                            <X className="h-4 w-4" />
                            <span>{language === 'th' ? 'ยกเลิกดาวน์โหลด' : 'Cancel Download'}</span>
                          </button>
                        )}
                      </div>
                    )}

                    {!video.cameraCode ? (
                      <p className="mt-3 text-center text-xs text-amber-500">
                        {language === 'th' ? 'ไม่พบรหัสกล้อง ไม่สามารถดูหรือดาวน์โหลดวิดีโอได้' : 'No camera code found, cannot play or download video'}
                      </p>
                    ) : !playbackStartDateTime || !playbackEndDateTime ? (
                      <p className={`mt-3 text-center text-xs ${theme.faint}`}>
                        {language === 'th' ? 'เลือกช่วงเวลาก่อนเล่นหรือดาวน์โหลดวิดีโอ' : 'Select a time range before playing or downloading'}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Right Column - Available Recordings (playlist, 1/3 width).
                  On lg the card is absolutely positioned so its height always matches
                  the left column and the list scrolls inside instead of stretching the row. */}
              <div className="lg:relative">
                {/* Available Recordings Card */}
                <div className={`flex flex-col overflow-hidden rounded-2xl lg:absolute lg:inset-0 ${theme.surface}`}>
                  <div className={`flex items-center justify-between gap-3 border-b px-5 py-3.5 ${theme.hairline}`}>
                    <div className="flex min-w-0 items-center gap-3">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${theme.iconTileEmerald}`}>
                        <History className="h-4.5 w-4.5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className={`text-sm font-bold ${theme.title}`}>
                          {language === 'th' ? 'ช่วงไฟล์ย้อนหลังที่พบ' : 'Available Recordings'}
                        </h3>
                        <p className={`mt-0.5 text-xs ${theme.muted}`}>
                          {formatRecordingSearchRangeLabel(recordingDaysBack)}
                        </p>
                      </div>
                    </div>
                    {recordingRanges.length > 0 && (
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold tabular-nums ${darkMode ? 'bg-emerald-500/15 text-emerald-300' : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'}`}>
                        {recordingRanges.length} {language === 'th' ? 'รายการ' : 'items'}
                      </span>
                    )}
                  </div>

                  <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
                      <label className="min-w-0">
                        <span className={`mb-1.5 block text-xs font-semibold ${theme.body}`}>
                          {language === 'th' ? 'ค้นหาย้อนหลัง (วัน)' : 'Search back (days)'}
                        </span>
                        <input
                          type="number"
                          min={1}
                          max={30}
                          step={1}
                          value={recordingDaysBack}
                          onChange={(event) => handleRecordingDaysBackChange(event.target.value)}
                          className={`h-10 w-full rounded-lg border px-3 text-sm tabular-nums outline-none transition-colors focus:ring-2 focus:ring-emerald-400/50 ${theme.input}`}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => video.cameraCode && fetchRecordingRanges(video.cameraCode, recordingDaysBack)}
                        disabled={recordingLoading || !video.cameraCode}
                        className={`flex h-10 min-w-24 items-center justify-center gap-2 rounded-xl px-3 text-xs font-bold transition-all duration-200 ${recordingLoading || !video.cameraCode
                          ? `cursor-not-allowed ${theme.disabledButton}`
                          : `cursor-pointer ${theme.primaryButton}`
                          }`}
                      >
                        {recordingLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Search className="h-4 w-4" />
                        )}
                        <span>
                          {recordingLoading
                            ? (language === 'th' ? 'กำลังค้นหา' : 'Searching')
                            : (language === 'th' ? 'ค้นหา' : 'Search')}
                        </span>
                      </button>
                    </div>
                    <p className={`text-[11px] ${theme.faint}`}>
                      {language === 'th' ? 'ค้นหาได้สูงสุด 30 วันย้อนหลัง' : 'Search up to 30 days back'}
                    </p>

                    {recordingLoading ? (
                      <div className={`flex min-h-20 flex-1 items-center justify-center gap-2 text-xs ${theme.muted}`}>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>{language === 'th' ? 'กำลังค้นหาช่วงไฟล์...' : 'Searching recordings...'}</span>
                      </div>
                    ) : recordingError ? (
                      <div className={`rounded-lg border p-3 text-xs ${theme.error}`}>
                        {recordingError}
                      </div>
                    ) : recordingRanges.length > 0 ? (
                      <div className="max-h-72 min-h-0 space-y-2 overflow-y-auto pr-1 lg:max-h-none lg:flex-1">
                        {recordingRanges.map((record, index) => {
                          const rangeStart = formatRecordingDateTimeForInput(record.startDateTime);
                          const rangeEnd = formatRecordingDateTimeForInput(record.endDateTime);
                          const isSelected = playbackStartDateTime === rangeStart && playbackEndDateTime === rangeEnd;

                          return (
                            <button
                              key={`${record.startTime}-${record.endTime}-${index}`}
                              type="button"
                              onClick={() => applyRecordingRange(record)}
                              aria-pressed={isSelected}
                              className={`w-full cursor-pointer rounded-xl border p-3 text-left transition-all duration-200 ${isSelected
                                ? 'border-emerald-500/50 bg-emerald-500/10 shadow-sm shadow-emerald-500/20 ring-1 ring-emerald-500/30'
                                : darkMode
                                  ? 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]'
                                  : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white hover:shadow-sm'
                                }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className={`text-xs font-semibold leading-5 tabular-nums ${theme.title}`}>
                                    {formatRecordingRangeLabel(record)}
                                  </p>
                                  <p className={`mt-0.5 text-[11px] ${theme.muted}`}>
                                    {language === 'th' ? 'ระยะเวลา' : 'Duration'}: {formatRecordingDuration(record)}
                                  </p>
                                </div>
                                {isSelected && (
                                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ) : recordingSearchPerformed ? (
                      <div className={`flex min-h-20 flex-1 items-center justify-center text-center text-xs ${theme.muted}`}>
                        {language === 'th'
                          ? `ไม่พบไฟล์ย้อนหลังใน ${recordingDaysBack} วันล่าสุด`
                          : `No recordings found in the last ${recordingDaysBack} days`}
                      </div>
                    ) : (
                      <div className={`flex min-h-20 flex-1 items-center justify-center text-center text-xs ${theme.muted}`}>
                        {language === 'th'
                          ? 'กดค้นหาเพื่อเรียกดูช่วงไฟล์ย้อนหลัง'
                          : 'Press Search to load available recordings'}
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Mission Information - merged, full width */}
              <div className={`overflow-hidden rounded-2xl lg:col-span-3 ${theme.surface}`}>
                <div className={`flex items-center gap-2.5 border-b px-5 py-3.5 ${theme.hairline}`}>
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${theme.iconTileEmerald}`}>
                    <Clock className="h-4 w-4" />
                  </div>
                  <h3 className={`text-sm font-bold ${theme.title}`}>
                    {language === 'th' ? 'ข้อมูลภารกิจ' : 'Mission Information'}
                  </h3>
                </div>
                <dl className={`grid grid-cols-2 gap-px sm:grid-cols-4 ${theme.gridLines}`}>
                  <div className={`p-4 transition-colors ${theme.cell}`}>
                    <dt className={`text-[11px] font-medium uppercase tracking-wide ${theme.muted}`}>
                      {language === 'th' ? 'วันที่ปฎิบัติงาน' : 'Recording Date'}
                    </dt>
                    <dd className={`mt-1 text-sm font-semibold ${theme.title}`}>
                      {new Date(video.startTime).toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US', {
                        calendar: 'gregory', year: 'numeric', month: 'short', day: 'numeric'
                      })}
                    </dd>
                  </div>
                  <div className={`p-4 transition-colors ${theme.cell}`}>
                    <dt className={`text-[11px] font-medium uppercase tracking-wide ${theme.muted}`}>
                      {language === 'th' ? 'เวลาเริ่ม-สิ้นสุด' : 'Time Range'}
                    </dt>
                    <dd className={`mt-1 text-sm font-semibold tabular-nums ${theme.title}`}>
                      {getTimeString(video.startTime)} - {getTimeString(video.endTime)}
                    </dd>
                  </div>
                  <div className={`p-4 transition-colors ${theme.cell}`}>
                    <dt className={`text-[11px] font-medium uppercase tracking-wide ${theme.muted}`}>
                      {language === 'th' ? 'ระยะเวลา' : 'Duration'}
                    </dt>
                    <dd className={`mt-1 text-sm font-semibold ${theme.title}`}>
                      {video.duration}
                    </dd>
                  </div>
                  <div className={`p-4 transition-colors ${theme.cell}`}>
                    <dt className={`text-[11px] font-medium uppercase tracking-wide ${theme.muted}`}>
                      {language === 'th' ? 'รหัสกล้อง' : 'Camera Code'}
                    </dt>
                    <dd className="mt-1 font-mono text-sm font-semibold text-emerald-400">
                      {video.cameraCode || 'N/A'}
                    </dd>
                  </div>
                  <div className={`p-4 transition-colors ${theme.cell}`}>
                    <dt className={`text-[11px] font-medium uppercase tracking-wide ${theme.muted}`}>
                      {language === 'th' ? 'ชื่อกล้อง' : 'Device Name'}
                    </dt>
                    <dd className={`mt-1 break-words text-sm font-semibold ${theme.title}`}>
                      {video.deviceName || 'N/A'}
                    </dd>
                  </div>
                  <div className={`p-4 transition-colors ${theme.cell}`}>
                    <dt className={`text-[11px] font-medium uppercase tracking-wide ${theme.muted}`}>
                      {translations.tableOfficer}
                    </dt>
                    <dd className={`mt-1 break-words text-sm font-semibold ${theme.title}`}>
                      {video.officerName || '-'}
                    </dd>
                  </div>
                  <div className={`p-4 transition-colors ${theme.cell}`}>
                    <dt className={`text-[11px] font-medium uppercase tracking-wide ${theme.muted}`}>
                      {translations.mission}
                    </dt>
                    <dd className={`mt-1 break-words text-sm font-medium ${theme.title}`}>
                      {video.missionName || '-'}
                    </dd>
                  </div>
                  <div className={`p-4 transition-colors ${theme.cell}`}>
                    <dt className={`text-[11px] font-medium uppercase tracking-wide ${theme.muted}`}>
                      {translations.location}
                    </dt>
                    <dd className={`mt-1 break-words text-sm font-medium ${theme.title}`}>
                      {video.location || '-'}
                    </dd>
                  </div>
                </dl>
              </div>

              <button
                onClick={onClose}
                className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-medium transition-all duration-200 lg:col-span-3 ${theme.secondaryButton}`}
              >
                <X className="h-5 w-5" />
                <span>{translations.backToMain}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
