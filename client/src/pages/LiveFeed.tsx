import { useEffect, useMemo } from 'react';
import { Video, Radio, Camera, X, RefreshCw, Power, PowerOff, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { liveFeedTranslations, type SupportedLanguage } from '../locales/liveFeedTranslations';
import { useLiveFeedStore } from '../stores/liveFeedStore';
import { LiveFeedStreamModal } from '../components/modals/LiveFeedStreamModal';

interface LiveFeedProps {
  darkMode: boolean;
  language: SupportedLanguage;
}

export function LiveFeed({ darkMode, language }: LiveFeedProps) {
  const t = liveFeedTranslations[language];
  const deviceList = useLiveFeedStore((state) => state.deviceList);
  const isLoading = useLiveFeedStore((state) => state.isLoading);
  const isManualRefresh = useLiveFeedStore((state) => state.isManualRefresh);
  const lastUpdated = useLiveFeedStore((state) => state.lastUpdated);
  const currentPage = useLiveFeedStore((state) => state.currentPage);
  const itemsPerPage = useLiveFeedStore((state) => state.itemsPerPage);
  const searchTerm = useLiveFeedStore((state) => state.searchTerm);
  const selectedDevice = useLiveFeedStore((state) => state.selectedDevice);
  const streamUrl = useLiveFeedStore((state) => state.streamUrl);
  const streamLoading = useLiveFeedStore((state) => state.streamLoading);
  const streamError = useLiveFeedStore((state) => state.streamError);
  const cameraIsOffline = useLiveFeedStore((state) => state.cameraIsOffline);
  const setSearchTerm = useLiveFeedStore((state) => state.setSearchTerm);
  const setCurrentPage = useLiveFeedStore((state) => state.setCurrentPage);
  const setItemsPerPage = useLiveFeedStore((state) => state.setItemsPerPage);
  const fetchDevices = useLiveFeedStore((state) => state.fetchDevices);
  const manualRefresh = useLiveFeedStore((state) => state.manualRefresh);
  const fetchCameraStream = useLiveFeedStore((state) => state.fetchCameraStream);
  const setStreamError = useLiveFeedStore((state) => state.setStreamError);
  const closeCameraModalState = useLiveFeedStore((state) => state.closeCameraModal);

  useEffect(() => {
    void fetchDevices(true);
    const intervalId = setInterval(() => {
      void fetchDevices();
    }, 5000);
    return () => clearInterval(intervalId);
  }, [fetchDevices]);

  const closeCameraModal = () => {
    closeCameraModalState();
  };

  useEffect(() => {
    if (selectedDevice !== null) {
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
  }, [selectedDevice]);

  const onlineCount = deviceList.filter(d => d.status).length;
  const offlineCount = deviceList.filter(d => !d.status).length;
  const activeCount = deviceList.filter(d => d.active).length;
  const inactiveCount = deviceList.filter(d => !d.active).length;
  const readyStreamCount = deviceList.filter(d => d.active && d.status).length;
  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  const filteredDevices = useMemo(
    () => normalizedSearchTerm
      ? deviceList.filter((device) => {
        const searchableText = [
          device.deviceCode,
          device.deviceName,
          device.serialNo,
          device.locationName,
          device.status ? t.online : t.offline,
          device.active ? t.connected : t.notConnected,
          device.status ? 'online' : 'offline',
          device.active ? 'active connected' : 'inactive not active',
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return searchableText.includes(normalizedSearchTerm);
      })
      : deviceList,
    [deviceList, normalizedSearchTerm, t.connected, t.notConnected, t.offline, t.online],
  );

  // Pagination logic
  const totalPages = Math.ceil(filteredDevices.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedDevices = filteredDevices.slice(startIndex, endIndex);

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, setCurrentPage, totalPages]);

  const handlePageChange = (page: number) => setCurrentPage(page);

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

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: t.totalDevices, value: deviceList.length, icon: Camera, iconBg: 'bg-sky-600' },
          { label: t.onlineDevices, value: onlineCount, icon: Power, iconBg: 'bg-emerald-600' },
          { label: t.offlineDevices, value: offlineCount, icon: PowerOff, iconBg: 'bg-rose-600', isAlert: offlineCount > 0 },
          { label: t.activeDevices, value: activeCount, icon: Video, iconBg: 'bg-amber-600' },
          { label: t.inactiveDevices, value: inactiveCount, icon: Camera, iconBg: 'bg-slate-500' },
          { label: t.connected, value: readyStreamCount, icon: Radio, iconBg: 'bg-indigo-600' },
        ].map(({ label, value, icon: Icon, iconBg, isAlert }) => (
          <div 
            key={label} 
            className={`rounded-lg px-4 py-3 border transition-shadow hover:shadow-sm flex items-center gap-3 ${
              isAlert && value > 0
                ? darkMode 
                  ? 'bg-rose-950/30 border-rose-800/50'
                  : 'bg-rose-50 border-rose-200 shadow-sm'
                : darkMode 
                  ? 'bg-slate-800 border-slate-700/50' 
                  : 'bg-white border-slate-200/80 shadow-sm'
            }`}
          >
            <div className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 ${iconBg}`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className={`truncate text-[11px] font-semibold uppercase ${isAlert && value > 0 ? (darkMode ? 'text-rose-300' : 'text-rose-600') : (darkMode ? 'text-slate-400' : 'text-slate-500')}`}>{label}</p>
              <p className={`text-2xl font-bold leading-tight ${isAlert && value > 0 ? (darkMode ? 'text-rose-300' : 'text-rose-600') : (darkMode ? 'text-white' : 'text-slate-800')}`}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Device Table */}
      <div className={`rounded-lg border overflow-hidden ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
        {/* Search Row with Refresh Button */}
        <div className={`px-5 py-4 border-b ${darkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-100 bg-white'}`}>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h1 className={`text-base font-semibold ${darkMode ? 'text-white' : 'text-slate-950'}`}>{t.title}</h1>
              <p className={`mt-1 text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{t.subtitle}</p>
            </div>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-end">
              <div className="relative w-full lg:w-[300px]">
                <Search className={`absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder={language === 'th' ? 'ค้นหากล้อง...' : 'Search cameras...'}
                  className={`h-9 w-full rounded-md border pl-9 pr-9 text-xs outline-none transition-all ${darkMode ? 'border-slate-700 bg-slate-800 text-slate-300 placeholder-slate-500 focus:border-emerald-500' : 'border-slate-200 bg-white text-slate-700 placeholder-slate-400 focus:border-emerald-500'}`}
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className={`absolute right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full transition-colors ${darkMode ? 'text-slate-500 hover:bg-slate-700 hover:text-slate-300' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
                    aria-label={language === 'th' ? 'ล้างคำค้นหา' : 'Clear search'}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <button
                onClick={() => void manualRefresh()}
                disabled={isManualRefresh}
                className={`inline-flex h-9 items-center justify-center gap-2 rounded-md px-4 text-xs font-semibold transition-colors ${darkMode ? 'bg-slate-800 text-slate-100 hover:bg-slate-700' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'} ${isManualRefresh ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                title={t.refreshing}
              >
                <RefreshCw className={`h-4 w-4 ${isManualRefresh ? 'animate-spin' : ''}`} />
                <span>{t.refreshing}</span>
              </button>
              {lastUpdated && (
                <div className={`text-xs lg:min-w-[150px] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  {t.lastUpdated}: {lastUpdated.toLocaleTimeString(language === 'th' ? 'th-TH' : 'en-US')}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full table-fixed">
            <thead className={darkMode ? 'bg-slate-800' : 'bg-slate-100'}>
              <tr>
                <th className={`w-[18%] px-5 py-4 text-left text-xs font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-500'}`}>{t.deviceCode}</th>
                <th className={`w-[28%] px-5 py-4 text-left text-xs font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-500'}`}>{t.deviceName}</th>
                <th className={`w-[24%] px-5 py-4 text-left text-xs font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-500'}`}>{t.location}</th>
                <th className={`w-[14%] px-5 py-4 text-center text-xs font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-500'}`}>{t.tableStatus}</th>
                <th className={`w-[16%] px-5 py-4 text-center text-xs font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-500'}`}>{t.tableTools}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={`livefeed-skeleton-${index}`} className={`border-t ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                    {Array.from({ length: 5 }).map((__, cellIndex) => (
                      <td key={cellIndex} className="px-5 py-4">
                        <div className={`h-4 rounded animate-pulse ${darkMode ? 'bg-slate-800' : 'bg-slate-100'} ${cellIndex === 1 ? 'w-40' : cellIndex === 4 ? 'w-24 mx-auto' : 'w-28'}`}></div>
                      </td>
                    ))}
                  </tr>
                ))
              ) : paginatedDevices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-lg ${darkMode ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-400'}`}>
                      <Camera className="w-7 h-7" />
                    </div>
                    <div className={`text-sm font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{t.noData}</div>
                  </td>
                </tr>
              ) : (
                paginatedDevices.map((device) => (
                  <tr key={device.deviceCode} className={`border-t transition-colors ${darkMode ? 'border-slate-800 hover:bg-slate-800/70' : 'border-slate-100 hover:bg-slate-50/80'}`}>
                    <td className="px-5 py-4 align-middle">
                      <span className={`text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        {device.deviceCode || t.na}
                      </span>
                    </td>
                    <td className="px-5 py-4 align-middle">
                      <div className="flex items-center gap-3">
                        <div className={`relative h-8 w-8 shrink-0 rounded-full ${device.status ? darkMode ? 'bg-emerald-500/15 text-emerald-300' : 'bg-emerald-50 text-emerald-600' : darkMode ? 'bg-rose-500/15 text-rose-300' : 'bg-rose-50 text-rose-600'} flex items-center justify-center`}>
                          <Camera className="h-4 w-4" />
                        </div>
                        <div className={`relative h-2.5 w-2.5 shrink-0 rounded-full ${device.status ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                          {device.status && <div className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-60"></div>}
                        </div>
                        <div className="min-w-0">
                          <p className={`truncate text-sm font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{device.deviceName}</p>
                          {device.serialNo && <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{device.serialNo}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 align-middle">
                      <span className={`block truncate text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {device.locationName || t.na}
                      </span>
                    </td>
                    <td className="px-5 py-4 align-middle">
                      <div className="flex justify-center">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${device.status ? darkMode ? 'bg-emerald-500/15 text-emerald-300' : 'bg-emerald-50 text-emerald-700' : darkMode ? 'bg-rose-500/15 text-rose-300' : 'bg-rose-50 text-rose-700'}`}>
                          {device.status ? t.online : t.offline}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 align-middle">
                      <div className="flex justify-center">
                        <button onClick={() => void fetchCameraStream(device, t.cameraOffline)} disabled={!device.active || !device.status} className={`inline-flex h-9 min-w-[124px] items-center justify-center gap-2 rounded-md px-4 text-xs font-semibold transition-colors ${!device.active || !device.status ? darkMode ? 'cursor-not-allowed bg-slate-800 text-slate-500' : 'cursor-not-allowed bg-slate-100 text-slate-400' : 'cursor-pointer bg-emerald-600 text-white hover:bg-emerald-700'}`}>
                          {device.active && device.status ? <Video className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
                          <span>{!device.active ? t.notConnected : !device.status ? t.offline : t.connect}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className={`lg:hidden divide-y ${darkMode ? 'divide-slate-800' : 'divide-slate-100'}`}>
          {isLoading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <div key={`livefeed-mobile-skeleton-${index}`} className={`p-4 ${darkMode ? 'bg-slate-900' : 'bg-white'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className={`h-4 w-40 rounded animate-pulse ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}></div>
                    <div className={`h-3 w-28 rounded animate-pulse ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}></div>
                    <div className={`h-3 w-48 rounded animate-pulse ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}></div>
                  </div>
                  <div className={`h-7 w-20 rounded-full animate-pulse ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}></div>
                </div>
                <div className={`mt-4 h-10 rounded-md animate-pulse ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}></div>
              </div>
            ))
          ) : paginatedDevices.length === 0 ? (
            <div className={`text-center py-12 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{t.noData}</div>
          ) : (
            paginatedDevices.map((device) => (
              <div key={device.deviceCode} className={`p-4 ${darkMode ? 'bg-slate-900' : 'bg-white'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${device.status ? darkMode ? 'bg-emerald-500/15 text-emerald-300' : 'bg-emerald-50 text-emerald-600' : darkMode ? 'bg-rose-500/15 text-rose-300' : 'bg-rose-50 text-rose-600'}`}>
                      <Camera className="h-4 w-4" />
                    </div>
                    <div className={`relative h-2.5 w-2.5 shrink-0 rounded-full ${device.status ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                      {device.status && <div className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-60"></div>}
                    </div>
                    <div className="min-w-0">
                      <p className={`truncate text-sm font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{device.deviceName}</p>
                      {device.serialNo && <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{device.serialNo}</p>}
                      <p className={`truncate text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{t.location}: {device.locationName || t.na}</p>
                    </div>
                  </div>
                  <span className={`ml-3 shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${device.status ? darkMode ? 'bg-emerald-500/15 text-emerald-300' : 'bg-emerald-50 text-emerald-700' : darkMode ? 'bg-rose-500/15 text-rose-300' : 'bg-rose-50 text-rose-700'}`}>
                    {device.status ? t.online : t.offline}
                  </span>
                </div>
                <button onClick={() => void fetchCameraStream(device, t.cameraOffline)} disabled={!device.active || !device.status} className={`flex h-10 w-full items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition-colors ${!device.active || !device.status ? darkMode ? 'cursor-not-allowed bg-slate-800 text-slate-500' : 'cursor-not-allowed bg-slate-100 text-slate-400' : 'cursor-pointer bg-emerald-600 text-white hover:bg-emerald-700'}`}>
                  {device.active && device.status ? <Video className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
                  <span>{!device.active ? t.notConnected : !device.status ? t.offline : t.connect}</span>
                </button>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {!isLoading && filteredDevices.length > 0 && (
          <div className={`border-t px-5 py-4 ${darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-100 bg-white'}`}>
            <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
              <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{t.showing} {startIndex + 1} {t.to} {Math.min(endIndex, filteredDevices.length)} {t.of} {filteredDevices.length} {t.items}</div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className={`flex h-8 w-8 items-center justify-center rounded-md text-sm transition-colors ${currentPage === 1 ? darkMode ? 'cursor-not-allowed bg-slate-800 text-slate-600' : 'cursor-not-allowed bg-slate-100 text-slate-300' : darkMode ? 'cursor-pointer bg-slate-800 text-slate-300 hover:bg-slate-700' : 'cursor-pointer bg-slate-100 text-slate-500 hover:bg-slate-200'}`}><ChevronLeft className="w-4 h-4" /></button>
                {getPageNumbers().map((page, index) => {
                  if (page === '...') return <span key={`ellipsis-${index}`} className={`px-2 text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>...</span>;
                  return (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page as number)}
                      className={`h-8 min-w-8 rounded-md px-2 text-xs font-semibold transition-colors ${currentPage === page
                          ? darkMode ? 'bg-slate-800 text-slate-300 ring-1 ring-slate-700' : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'
                          : darkMode
                            ? 'cursor-pointer text-slate-400 hover:bg-slate-800'
                            : 'cursor-pointer text-slate-500 hover:bg-slate-100'
                        }`}
                    >
                      {page}
                    </button>
                  );
                })}
                <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage >= totalPages} className={`flex h-8 w-8 items-center justify-center rounded-md text-sm transition-colors ${currentPage >= totalPages ? darkMode ? 'cursor-not-allowed bg-slate-800 text-slate-600' : 'cursor-not-allowed bg-slate-100 text-slate-300' : darkMode ? 'cursor-pointer bg-slate-800 text-slate-300 hover:bg-slate-700' : 'cursor-pointer bg-slate-100 text-slate-500 hover:bg-slate-200'}`}><ChevronRight className="w-4 h-4" /></button>
              </div>
              <div className="flex items-center gap-2">
                <label className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{t.itemsPerPage}:</label>
                <select value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))} className={`h-8 rounded-md border px-2 text-xs outline-none ${darkMode ? 'border-slate-700 bg-slate-800 text-white' : 'border-slate-200 bg-white text-slate-700'}`}>
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Camera Stream Modal */}
      {selectedDevice && (
        <LiveFeedStreamModal
          device={selectedDevice}
          t={t}
          language={language}
          darkMode={darkMode}
          streamUrl={streamUrl}
          streamLoading={streamLoading}
          streamError={streamError}
          cameraIsOffline={cameraIsOffline}
          onClose={closeCameraModal}
          onRetry={() => void fetchCameraStream(selectedDevice, t.cameraOffline)}
          setStreamError={setStreamError}
        />
      )}
    </div>
  );
}
