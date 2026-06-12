import { 
  MapPinned, 
  Cctv, 
  Timer, 
  X, 
  Compass, 
  Satellite,
  Radio
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { GPSMap } from '../../pages/GPSMap';
import { type SupportedLanguage, dashboardTranslations } from '../../locales/dashboardTranslations';

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

interface GPSMapModalProps {
  language: SupportedLanguage;
  darkMode: boolean;
  gpsDevices: GpsDevice[];
  selectedGpsDeviceId: string | null;
  gpsSelectTrigger: number;
  onClose: () => void;
}

export function GPSMapModal({ 
  language, 
  darkMode, 
  gpsDevices,
  selectedGpsDeviceId,
  gpsSelectTrigger,
  onClose 
}: GPSMapModalProps) {
  const t = dashboardTranslations[language];
  const [now, setNow] = useState(0);
  const latestUpdateTime = gpsDevices[0]?.updateTime ?? null;
  const latestUpdateTimestamp = latestUpdateTime ? new Date(latestUpdateTime).getTime() : null;
  const secondsSinceLatestUpdate = latestUpdateTimestamp == null
    ? null
    : Math.max(0, Math.round(((now || latestUpdateTimestamp) - latestUpdateTimestamp) / 1000));

  useEffect(() => {
    const id = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(id);
  }, []);

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-100 flex items-center justify-center p-4 animate-in fade-in duration-200 z-[9999]"
      onClick={onClose}
    >
      <div 
        className={`rounded-3xl max-w-6xl w-full max-h-[95vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden ${
          darkMode ? 'bg-gray-800' : 'bg-white'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Fixed */}
        <div className={`p-6 shrink-0 border-b ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-800'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-700 rounded-xl flex items-center justify-center">
                <Satellite className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">{t.gpsMap}</h2>
                <p className="text-slate-400 text-sm">{t.gpsMapDesc}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 bg-slate-700 hover:bg-slate-600 rounded-lg flex items-center justify-center transition-colors cursor-pointer text-slate-300 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-8 space-y-6">
            {/* GPS Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`rounded-xl p-5 border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 bg-teal-700 rounded-lg flex items-center justify-center">
                    <Radio className="w-5 h-5 text-white" />
                  </div>
                  <span className={`text-xs font-semibold uppercase ${darkMode ? 'text-green-400' : 'text-green-600'}`}>{t.onlineDevices}</span>
                </div>
                <p className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>{gpsDevices.filter(d => d.status === 'online').length}</p>
                <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{t.trackingStatus} ({gpsDevices.length} {language === 'th' ? 'อุปกรณ์' : 'devices'})</p>
              </div>

              <div className={`rounded-xl p-5 border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 bg-orange-700 rounded-lg flex items-center justify-center">
                    <Timer className="w-5 h-5 text-white" />
                  </div>
                  <span className={`text-xs font-semibold uppercase ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>{t.lastUpdate}</span>
                </div>
                <p className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  {latestUpdateTime
                    ? new Date(latestUpdateTime).toLocaleTimeString(language === 'th' ? 'th-TH' : 'en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                    : '--:--'}
                </p>
                <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {secondsSinceLatestUpdate != null
                    ? `${secondsSinceLatestUpdate}${t.updateTimeUnit} ${t.updateAgo}`
                    : (language === 'th' ? 'ไม่มีข้อมูล' : 'No data')}
                </p>
              </div>

              <div className={`rounded-xl p-5 border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 bg-indigo-700 rounded-lg flex items-center justify-center">
                    <Cctv className="w-5 h-5 text-white" />
                  </div>
                  <span className={`text-xs font-semibold uppercase ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>{language === 'th' ? 'GPS กล้อง' : 'Camera GPS'}</span>
                </div>
                <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  {gpsDevices.length > 0 && gpsDevices[0].latitude
                    ? `${Number(gpsDevices[0].latitude).toFixed(5)}°N`
                    : '--'}
                </p>
                <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  {gpsDevices.length > 0 && gpsDevices[0].longitude
                    ? `${Number(gpsDevices[0].longitude).toFixed(5)}°E`
                    : '--'}
                </p>
                <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {gpsDevices.length > 0 ? (gpsDevices[0].name || gpsDevices[0].serialNo) : (language === 'th' ? 'ไม่มีอุปกรณ์' : 'No device')}
                </p>
              </div>
            </div>

            {/* Large Map */}
            <div className={`rounded-xl overflow-hidden h-[400px] border ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
              <GPSMap language={language} selectedDeviceId={selectedGpsDeviceId} devices={gpsDevices} selectTrigger={gpsSelectTrigger} />
            </div>

            {/* Device List with Locations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {gpsDevices.map((device) => (
                <div key={device.id} className={`rounded-xl p-5 border ${
                  darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                }`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-2.5 h-2.5 rounded-full ${device.status === 'online' ? 'bg-emerald-500' : 'bg-slate-400'}`}></div>
                    <h3 className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      {device.serialNo || device.name}
                    </h3>
                  </div>
                  <div className="space-y-2">
                    <div className={`flex items-center gap-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      <MapPinned className="w-4 h-4 text-sky-500" />
                      <span className="font-semibold">{t.coordinates}:</span>
                      <span>{device.latitude || `13.${7563 + device.id * 100}`}°N, {device.longitude || `100.${5018 + device.id * 100}`}°E</span>
                    </div>
                    <div className={`flex items-center gap-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      <Compass className="w-4 h-4 text-emerald-500" />
                      <span className="font-semibold">{t.speed}:</span>
                      <span>{device.id === 1 ? '0' : '25'} {t.speedUnit}</span>
                    </div>
                    <div className={`flex items-center gap-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      <Timer className="w-4 h-4 text-violet-500" />
                      <span className="font-semibold">{t.updatedAt}:</span>
                      <span>{t.justNow}</span>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer">
                      {t.trackBtn}
                    </button>
                    <button className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-sm font-medium transition-colors cursor-pointer">
                      {t.detailsBtn}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className={`w-full py-3 font-medium rounded-lg transition-colors cursor-pointer ${
                darkMode ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-white'
              }`}
            >
              {t.close}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
