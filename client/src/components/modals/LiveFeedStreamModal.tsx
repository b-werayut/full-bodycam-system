import { useEffect, useRef, useState } from 'react';
import {
  TriangleAlert,
  X,
  MonitorPlay,
  Cctv,
  MapPin,
  Maximize2,
  RefreshCw,
  WifiOff,
  Radio,
} from 'lucide-react';
import Hls from 'hls.js';
import { type SupportedLanguage } from '../../locales/liveFeedTranslations';
import { type DeviceData } from '../../services/deviceService';

interface LiveFeedStreamModalProps {
  device: DeviceData;
  t: Record<string, string>;
  language: SupportedLanguage;
  darkMode: boolean;
  streamUrl: string | null;
  streamLoading: boolean;
  streamError: string | null;
  cameraIsOffline: boolean;
  onClose: () => void;
  onRetry: () => void;
  setStreamError: (streamError: string | null) => void;
}

type ConnectionState = 'live' | 'connecting' | 'offline' | 'error' | 'idle';

export function LiveFeedStreamModal({
  device,
  t,
  language,
  darkMode,
  streamUrl,
  streamLoading,
  streamError,
  cameraIsOffline,
  onClose,
  onRetry,
  setStreamError,
}: LiveFeedStreamModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [elapsedSnapshot, setElapsedSnapshot] = useState<{ streamUrl: string | null; seconds: number }>({
    streamUrl: null,
    seconds: 0,
  });

  const isLive = Boolean(streamUrl) && !streamError;
  const elapsed = isLive && elapsedSnapshot.streamUrl === streamUrl ? elapsedSnapshot.seconds : 0;
  const connectionState: ConnectionState =
    streamError && cameraIsOffline
      ? 'offline'
      : streamError
        ? 'error'
        : streamLoading
          ? 'connecting'
          : streamUrl
            ? 'live'
            : 'idle';

  // Live elapsed timer (trust signal that the feed is current)
  useEffect(() => {
    if (!isLive || !streamUrl) return;

    const start = Date.now();
    const id = window.setInterval(() => {
      setElapsedSnapshot({
        streamUrl,
        seconds: Math.floor((Date.now() - start) / 1000),
      });
    }, 1000);

    return () => window.clearInterval(id);
  }, [isLive, streamUrl]);

  const toggleFullscreen = () => {
    const el = stageRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void el.requestFullscreen?.();
    }
  };

  const formatElapsed = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return hrs > 0 ? `${pad(hrs)}:${pad(mins)}:${pad(secs)}` : `${pad(mins)}:${pad(secs)}`;
  };

  // Initialize HLS player when stream URL is available
  useEffect(() => {
    if (streamUrl && videoRef.current) {
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          xhrSetup: (xhr) => {
            xhr.withCredentials = false;
          },
        });
        hlsRef.current = hls;
        hls.loadSource(streamUrl);
        hls.attachMedia(videoRef.current);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          videoRef.current?.play().catch(console.error);
        });
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
            else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
            else setStreamError(`Stream error: ${data.details}`);
          }
        });
      } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
        videoRef.current.src = streamUrl;
        videoRef.current.play().catch(console.error);
      } else {
        setStreamError('HLS not supported in this browser');
      }
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [streamUrl, setStreamError]);

  const statusMeta: Record<ConnectionState, { label: string; dot: string; chip: string; pulse: boolean }> = {
    live: {
      label: language === 'th' ? 'ถ่ายทอดสด' : 'Live',
      dot: 'bg-emerald-400',
      chip: darkMode ? 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/25' : 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
      pulse: true,
    },
    connecting: {
      label: language === 'th' ? 'กำลังเชื่อมต่อ' : 'Connecting',
      dot: 'bg-amber-400',
      chip: darkMode ? 'bg-amber-500/15 text-amber-300 ring-amber-500/25' : 'bg-amber-50 text-amber-700 ring-amber-600/20',
      pulse: true,
    },
    offline: {
      label: language === 'th' ? 'ออฟไลน์' : 'Offline',
      dot: 'bg-slate-400',
      chip: darkMode ? 'bg-slate-700/50 text-slate-300 ring-slate-600/40' : 'bg-slate-100 text-slate-600 ring-slate-300',
      pulse: false,
    },
    error: {
      label: language === 'th' ? 'เชื่อมต่อล้มเหลว' : 'Error',
      dot: 'bg-rose-400',
      chip: darkMode ? 'bg-rose-500/15 text-rose-300 ring-rose-500/25' : 'bg-rose-50 text-rose-700 ring-rose-600/20',
      pulse: true,
    },
    idle: {
      label: language === 'th' ? 'รอการเชื่อมต่อ' : 'Standby',
      dot: 'bg-slate-400',
      chip: darkMode ? 'bg-slate-700/50 text-slate-300 ring-slate-600/40' : 'bg-slate-100 text-slate-600 ring-slate-300',
      pulse: false,
    },
  };

  const status = statusMeta[connectionState];

  const shell = darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
  const chromeBorder = darkMode ? 'border-slate-800' : 'border-slate-200';
  const titleColor = darkMode ? 'text-white' : 'text-slate-900';
  const mutedColor = darkMode ? 'text-slate-400' : 'text-slate-500';
  const iconBtn = darkMode ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900';
  const metaChip = darkMode ? 'bg-slate-800/60 text-slate-300 ring-slate-700' : 'bg-slate-50 text-slate-600 ring-slate-200';

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200 ${darkMode ? 'bg-slate-950/80' : 'bg-slate-900/50'}`}
      onClick={onClose}
    >
      <div
        className={`flex max-h-[95vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border shadow-2xl animate-in zoom-in-95 duration-200 ${shell}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex shrink-0 items-center justify-between gap-3 border-b px-5 py-4 ${chromeBorder}`}>
          <div className="flex min-w-0 items-center gap-3.5">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${darkMode ? 'bg-emerald-500/15 text-emerald-300' : 'bg-emerald-50 text-emerald-600'}`}>
              <Cctv className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className={`truncate text-base font-semibold ${titleColor}`}>{device.deviceName}</h2>
              <div className={`mt-0.5 flex items-center gap-1.5 text-xs ${mutedColor}`}>
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{device.locationName || (language === 'th' ? 'ไม่ระบุตำแหน่ง' : 'No location')}</span>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className={`hidden items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 sm:inline-flex ${status.chip}`}>
              <span className="relative flex h-2 w-2">
                {status.pulse && <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${status.dot}`} />}
                <span className={`relative inline-flex h-2 w-2 rounded-full ${status.dot}`} />
              </span>
              {status.label}
            </span>
            {isLive && (
              <button
                onClick={toggleFullscreen}
                title={language === 'th' ? 'เต็มจอ' : 'Fullscreen'}
                className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg transition-colors ${iconBtn}`}
              >
                <Maximize2 className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={onClose}
              title={t.close}
              className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg transition-colors ${iconBtn}`}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Video stage (theater dark) */}
        <div ref={stageRef} className="relative aspect-video w-full bg-slate-950">
          {isLive && (
            <video
              ref={videoRef}
              className="absolute inset-0 h-full w-full bg-slate-950 object-contain"
              controls
              autoPlay
              muted
              playsInline
            />
          )}

          {/* Broadcast HUD overlays */}
          {isLive && (
            <>
              <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-1.5 rounded-md bg-rose-600/90 px-2.5 py-1 text-xs font-bold tracking-wide text-white shadow-lg">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                LIVE
              </div>
              <div className="pointer-events-none absolute right-3 top-3 flex items-center gap-1.5 rounded-md bg-slate-950/70 px-2.5 py-1 font-mono text-xs font-semibold text-slate-100 ring-1 ring-white/10 backdrop-blur-sm">
                <Radio className="h-3.5 w-3.5 text-emerald-400" />
                {formatElapsed(elapsed)}
              </div>
            </>
          )}

          {/* Connecting */}
          {connectionState === 'connecting' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-slate-950 px-8 text-center">
              <div className="relative flex h-20 w-20 items-center justify-center">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500/20" />
                <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15">
                  <Cctv className="h-6 w-6 text-emerald-400" />
                </div>
              </div>
              <div>
                <p className="text-base font-semibold text-white">{t.connecting || (language === 'th' ? 'กำลังเชื่อมต่อสัญญาณ...' : 'Connecting to feed...')}</p>
                <p className="mt-1 text-sm text-slate-400">{t.pleaseWait || device.deviceName}</p>
              </div>
              <div className="h-1 w-40 overflow-hidden rounded-full bg-slate-800">
                <div className="h-full w-2/3 animate-pulse rounded-full bg-emerald-500/70" />
              </div>
            </div>
          )}

          {/* Error */}
          {connectionState === 'error' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-950 px-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/15">
                <TriangleAlert className="h-8 w-8 text-rose-400" />
              </div>
              <div>
                <p className="text-base font-semibold text-white">{t.streamFailed || (language === 'th' ? 'ไม่สามารถโหลดสตรีมได้' : 'Unable to load stream')}</p>
                <p className="mx-auto mt-1 max-w-sm text-sm text-slate-400">{streamError}</p>
              </div>
              <button
                onClick={onRetry}
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
              >
                <RefreshCw className="h-4 w-4" />
                {t.tryAgain || (language === 'th' ? 'ลองใหม่อีกครั้ง' : 'Try Again')}
              </button>
            </div>
          )}

          {/* Offline */}
          {connectionState === 'offline' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-950 px-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800 ring-1 ring-slate-700">
                <WifiOff className="h-8 w-8 text-slate-400" />
              </div>
              <div>
                <p className="text-base font-semibold text-white">{language === 'th' ? 'กล้องออฟไลน์' : 'Camera offline'}</p>
                <p className="mx-auto mt-1 max-w-sm text-sm text-slate-400">{language === 'th' ? 'อุปกรณ์นี้ไม่ได้เชื่อมต่ออยู่ในขณะนี้' : 'This device is not connected right now.'}</p>
              </div>
              <button
                onClick={onRetry}
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-slate-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-600"
              >
                <RefreshCw className="h-4 w-4" />
                {language === 'th' ? 'ตรวจสอบอีกครั้ง' : 'Check again'}
              </button>
            </div>
          )}

          {/* Idle */}
          {connectionState === 'idle' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-slate-500 ring-1 ring-slate-800">
                <MonitorPlay className="h-7 w-7" />
              </div>
              <p className="text-sm text-slate-500">{t.waitingConnection || (language === 'th' ? 'รอการเชื่อมต่อ...' : 'Waiting for connection...')}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`flex shrink-0 flex-col gap-3 border-t px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between ${chromeBorder}`}>
          <div className="flex flex-wrap items-center gap-2">
            {device.deviceCode && (
              <span className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ring-1 ${metaChip}`}>
                <Cctv className="h-3.5 w-3.5" />
                <span className="font-mono">{device.deviceCode}</span>
              </span>
            )}
            {device.serialNo && device.serialNo !== device.deviceCode && (
              <span className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ring-1 ${metaChip}`}>
                <span className="opacity-70">SN</span>
                <span className="font-mono">{device.serialNo}</span>
              </span>
            )}
          </div>
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
