/// <reference types="../vite-env.d.ts" />
import { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Maximize2, Minimize2, Camera, Hash, Clock, Radio } from 'lucide-react';
import { MapContainer, TileLayer, Popup, useMap } from 'react-leaflet';
import { AnimatedMarker } from '../components/map/AnimatedMarker';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { mapTranslations, type SupportedLanguage } from '../locales/mapTranslations';

export interface GpsDeviceData {
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

interface GPSMapProps {
  language?: SupportedLanguage;
  darkMode?: boolean;
  selectedDeviceId?: string | null;
  devices?: GpsDeviceData[];
  selectTrigger?: number;
  showSummary?: boolean;
}

// Custom marker icon based on status and selection
const createMarkerIcon = (isOffline: boolean, isSelected: boolean = false) => {
  const color = isOffline ? 'oklch(0.637 0.237 25.331)' : 'oklch(0.723 0.219 149.579)';
  const size = isSelected ? 34 : 26;
  const border = isSelected ? '5px solid oklch(0.852 0.199 91.936)' : '4px solid oklch(0.985 0.004 247.858)';
  const shadow = isSelected ? '0 10px 24px rgba(12,39,75,0.35)' : '0 6px 14px rgba(12,39,75,0.24)';
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="position: relative;">
        <div style="width: ${size}px; height: ${size}px; background: ${color}; border-radius: 50%; border: ${border}; box-shadow: ${shadow}; display: flex; align-items: center; justify-content: center;">
          <div style="width: ${Math.max(6, size / 3)}px; height: ${Math.max(6, size / 3)}px; border-radius: 50%; background: oklch(0.985 0.004 247.858); opacity: 0.95;"></div>
        </div>
        ${isSelected ? `<div style="position: absolute; inset: 0; background: ${color}; border-radius: 50%; animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite; opacity: 0.75;"></div>` : ''}
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2]
  });
};

// Component to update map center when selectedDeviceId changes
function MapUpdater({ devices, selectedDeviceId, selectTrigger }: { 
  devices: GpsDeviceData[]; 
  selectedDeviceId: string | null;
  selectTrigger: number;
}) {
  const map = useMap();
  const lastTriggerRef = useRef(0);
  
  useEffect(() => {
    // Pan to device when selectTrigger changes (user clicked on device)
    if (selectedDeviceId && selectTrigger !== lastTriggerRef.current) {
      const device = devices.find(d => d.serialNo === selectedDeviceId);
      if (device && device.latitude && device.longitude) {
        map.closePopup(); // Close any open popup first
        map.setView([device.latitude, device.longitude], 16, { animate: true });
        lastTriggerRef.current = selectTrigger;
      }
    }
  }, [selectedDeviceId, selectTrigger, devices, map]);
  
  return null;
}

export function GPSMap({ language = 'th', darkMode = false, selectedDeviceId = null, devices = [], selectTrigger = 0, showSummary = true }: GPSMapProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      setTimeout(() => mapRef.current?.invalidateSize(), 200);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const t = mapTranslations[language];
  const txtOpenMap = 'openFullMap' in t ? t['openFullMap' as keyof typeof t] : (language === 'th' ? 'เปิดแผนที่เต็ม' : 'Open Full Map');

  const hasCoordinates = (device: GpsDeviceData) => device.latitude !== null && device.longitude !== null;
  const devicesWithGps = devices.filter(hasCoordinates);
  const trackingCount = devicesWithGps.length;
  const onlineTrackingCount = devicesWithGps.filter(d => d.status === 'online').length;
  const offlineTrackingCount = trackingCount - onlineTrackingCount;

  // Calculate center based on selected device or first device with GPS
  const selectedDevice = selectedDeviceId 
    ? devicesWithGps.find(d => d.serialNo === selectedDeviceId) 
    : null;
  const defaultCenter: [number, number] = [13.7563, 100.5018];
  const center: [number, number] = selectedDevice 
    ? [selectedDevice.latitude!, selectedDevice.longitude!]
    : devicesWithGps.length > 0 
      ? [devicesWithGps[0].latitude!, devicesWithGps[0].longitude!]
      : defaultCenter;

  return (
    <div ref={containerRef} className={`relative w-full h-full rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 ${isFullscreen ? '!rounded-none' : ''}`}>
      <style>{`
        @keyframes ping {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
        .custom-marker {
          background: transparent;
          border: none;
        }
        .leaflet-container {
          height: 100%;
          width: 100%;
          font-family: inherit;
          z-index: 0 !important;
        }
        .leaflet-pane {
          z-index: 0 !important;
        }
        .leaflet-top, .leaflet-bottom {
          z-index: 10 !important;
        }
        .leaflet-popup-content-wrapper {
          border-radius: 10px;
          box-shadow: 0 18px 40px rgba(12,39,75,0.20);
          border: 1px solid rgba(148,163,184,0.35);
        }
        .leaflet-popup-content {
          margin: 0;
        }
        .leaflet-control-zoom {
          border: 1px solid rgba(148,163,184,0.35) !important;
          border-radius: 10px !important;
          overflow: hidden;
          box-shadow: 0 10px 24px rgba(12,39,75,0.12);
        }
        .leaflet-control-zoom a {
          width: 34px !important;
          height: 34px !important;
          line-height: 34px !important;
          color: #0c274b !important;
          border-color: rgba(148,163,184,0.35) !important;
        }
        ${darkMode ? `
          .leaflet-tile {
            filter: invert(1) hue-rotate(180deg) contrast(0.9);
          }
          .leaflet-control-zoom a {
            background: #1f2937 !important;
            color: white !important;
            border-color: #374151 !important;
          }
          .leaflet-control-zoom a:hover {
            background: #374151 !important;
          }
          .leaflet-control-attribution {
            background: rgba(31, 41, 55, 0.8) !important;
            color: #9ca3af !important;
          }
          .leaflet-control-attribution a {
            color: #60a5fa !important;
          }
          .leaflet-popup-content-wrapper,
          .leaflet-popup-tip {
            background: #111827 !important;
            color: #e5e7eb !important;
            border-color: #374151 !important;
          }
        ` : ''}
      `}</style>

      {/* Leaflet Map */}
      <MapContainer
        center={center}
        zoom={16}
        scrollWheelZoom={true}
        zoomControl={true}
        ref={mapRef}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapUpdater devices={devicesWithGps} selectedDeviceId={selectedDeviceId} selectTrigger={selectTrigger} />
        
        {devicesWithGps.map((device) => {
          const isSelected = device.serialNo === selectedDeviceId;
          const isOffline = device.status !== 'online';
          return (
            <AnimatedMarker
              key={device.id}
              position={[device.latitude!, device.longitude!]}
              icon={createMarkerIcon(isOffline, isSelected)}
              isSelected={isSelected}
            >
              <Popup>
                <div className={`p-3 min-w-[220px] ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                  {/* Header with status indicator */}
                  <div className={`flex items-center gap-3 pb-3 mb-3 border-b ${darkMode ? 'border-gray-700' : isOffline ? 'border-red-100' : 'border-green-100'}`}>
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isOffline ? darkMode ? 'bg-red-500/15' : 'bg-red-50' : darkMode ? 'bg-green-500/15' : 'bg-green-50'}`}>
                      <Camera className={`w-4 h-4 ${isOffline ? 'text-red-500' : 'text-green-500'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold leading-tight truncate ${darkMode ? 'text-white' : 'text-[#0c274b]'}`}>
                        {device.name}
                      </p>
                      <div className={`text-[10px] font-semibold flex items-center gap-1 ${isOffline ? 'text-red-600' : 'text-green-600'}`}>
                        <div className={`w-1.5 h-1.5 ${isOffline ? 'bg-red-500' : 'bg-green-500'} rounded-full`}></div>
                        {isOffline ? (language === 'th' ? 'ออฟไลน์' : 'Offline') : (language === 'th' ? 'ออนไลน์' : 'Online')}
                      </div>
                    </div>
                  </div>
                  
                  {/* Device Info */}
                  <div className="space-y-2">
                    <div className={`flex items-center gap-2 text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      <Hash className={`w-3 h-3 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                      <span className={`font-mono ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>{device.serialNo}</span>
                    </div>
                    {device.locationName && (
                      <div className={`flex items-center gap-2 text-xs ${darkMode ? 'text-blue-300' : 'text-blue-600'}`}>
                        <MapPin className="w-3 h-3" />
                        <span>{device.locationName}</span>
                      </div>
                    )}
                    <div className={`flex items-start gap-2 text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      <Radio className={`w-3 h-3 mt-0.5 ${darkMode ? 'text-indigo-400' : 'text-indigo-500'}`} />
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-semibold uppercase tracking-wide ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>LAT</span>
                          <span className={`font-mono text-xs tabular-nums ${darkMode ? 'text-indigo-300' : 'text-indigo-600'}`}>{device.latitude?.toFixed(6)}°</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-semibold uppercase tracking-wide ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>LON</span>
                          <span className={`font-mono text-xs tabular-nums ${darkMode ? 'text-indigo-300' : 'text-indigo-600'}`}>{device.longitude?.toFixed(6)}°</span>
                        </div>
                      </div>
                    </div>
                    {device.updateTime && (
                      <div className={`flex items-center gap-2 text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        <Clock className="w-3 h-3" />
                        <span>{new Date(device.updateTime).toLocaleTimeString(language === 'th' ? 'th-TH' : 'en-US')}</span>
                      </div>
                    )}
                  </div>
                </div>
              </Popup>
            </AnimatedMarker>
          );
        })}
      </MapContainer>

      {showSummary && (
        <div className="absolute bottom-4 left-4 right-4 sm:right-auto bg-white/95 dark:bg-gray-900/90 backdrop-blur-sm px-4 py-3 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700 z-[1000]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-[#0c274b] dark:text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-500" />
                {('realTimeMap' in t ? t['realTimeMap' as keyof typeof t] : (language === 'th' ? 'แผนที่แบบเรียลไทม์' : 'Real-time Map')) as string}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                {trackingCount > 0
                  ? (language === 'th' ? `${trackingCount} อุปกรณ์กำลังติดตาม` : `${trackingCount} Device(s) tracking`)
                  : (language === 'th' ? 'กำลังเชื่อมต่อสัญญาณ GPS...' : 'Connecting to GPS...')}
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-green-50 dark:bg-green-500/15 px-2 py-1 text-[10px] font-bold text-green-700 dark:text-green-300 border border-green-200 dark:border-green-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                {onlineTrackingCount}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 dark:bg-red-500/15 px-2 py-1 text-[10px] font-bold text-red-700 dark:text-red-300 border border-red-200 dark:border-red-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                {offlineTrackingCount}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ปุ่มขยายแผนที่ มุมขวาบน */}
      <div className="absolute top-4 right-4 z-[1000]">
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleFullscreen();
          }}
          className="bg-white/95 dark:bg-gray-800/90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-lg text-xs font-bold text-[#0c274b] dark:text-white border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer flex items-center gap-2"
        >
          {isFullscreen
            ? <><Minimize2 className="w-4 h-4 text-blue-500" />{language === 'th' ? 'ย่อแผนที่' : 'Exit Fullscreen'}</>
            : <><Maximize2 className="w-4 h-4 text-blue-500" />{txtOpenMap as string}</>
          }
        </button>
      </div>

    </div>
  );
}
