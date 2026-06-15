import { useState, useEffect } from 'react';
import { Calendar, ChevronDown, Search, Play, X, User, Video, ChevronLeft, ChevronRight, MapPin, CheckCircle2, AlertCircle, SlidersHorizontal, Film, RefreshCw } from 'lucide-react';
import { type VideoLibrarySqlData } from '../features/video-library/types';
import { VideoLibraryModal } from '../components/modals/VideoLibraryModal';
import { videoLibraryTranslations, type VideoLibraryLanguage } from '../locales/videoLibraryTranslations';
import { getOfficers, getReports } from '../services/missionService';
import { sortReportsByLatestTime } from '../features/reports/reportTable';
import { matchesVideoLibrarySearch } from '../features/video-library/videoLibrarySearch';
import { isFilterEndBeforeStart } from '../features/dateRangeValidation';

interface VideoLibraryProps {
  darkMode: boolean;
  language: VideoLibraryLanguage;
}

export function VideoLibrary({ darkMode, language = 'th' }: VideoLibraryProps) {
  const translations = videoLibraryTranslations[language];

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOfficer, setSelectedOfficer] = useState('all');
  const [selectedSpotCheck, setSelectedSpotCheck] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterDateRangeError, setFilterDateRangeError] = useState('');
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<VideoLibrarySqlData | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [videos, setVideos] = useState<VideoLibrarySqlData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [officerList, setOfficerList] = useState<{ officerId: string; officerName: string }[]>([]);

  // Fetch completed missions from API (status 3 = completed, 7 = emergency-completed)
  const fetchCompletedMissions = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      const data = await getReports<{
        reportId: string;
        missionId: number;
        missionName: string;
        startTime: string;
        endTime: string;
        description: string;
        officerId: number;
        officerName: string;
        locationId: number;
        locationName?: string;
        missionStatus: string;
        deviceName?: string;
        deviceCode?: string;
        latitude?: string;
        longitude?: string;
      }>();
      
      // Filter only completed missions (status 3 and 7)
      const completedMissions = data.filter((r: { missionStatus: string }) => 
        r.missionStatus === '3' || r.missionStatus === '7'
      );

      const mapped: VideoLibrarySqlData[] = completedMissions.map((r: {
        reportId: string;
        missionId: number;
        missionName: string;
        startTime: string;
        endTime: string;
        description: string;
        officerId: number;
        officerName: string;
        locationId: number;
        locationName?: string;
        missionStatus: string;
        deviceName?: string;
        deviceCode?: string;
        latitude?: string;
        longitude?: string;
      }) => ({
        id: r.reportId,
        deviceId: r.deviceName || '',
        missionId: String(r.missionId),
        missionName: r.missionName,
        officerId: String(r.officerId),
        officerName: r.officerName,
        startTime: r.startTime,
        endTime: r.endTime,
        duration: calculateDuration(r.startTime, r.endTime),
        filePath: '',
        location: r.locationName || '',
        isArchived: false,
        cameraCode: r.deviceCode || '',
        deviceName: r.deviceName || '',
        missionStatus: r.missionStatus,
        reportId: r.reportId,
        description: r.description,
      }));
      
      setVideos([...mapped].sort(sortReportsByLatestTime));
    } catch (error) {
      console.error('Error fetching completed missions:', error);
      setVideos([]);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  // Fetch officers for filter dropdown
  const fetchOfficers = async () => {
    try {
      setOfficerList(await getOfficers<{ officerId: string; officerName: string }>());
    } catch (error) {
      console.error('Error fetching officers:', error);
    }
  };

  useEffect(() => {
    fetchCompletedMissions();
    fetchOfficers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, startDate, endDate, selectedOfficer, selectedSpotCheck]);

  const filterDateRangeInvalid = isFilterEndBeforeStart({ startDate, endDate });
  const filterDateRangeErrorMessage = language === 'th'
    ? 'วันที่สิ้นสุดต้องไม่น้อยกว่าวันที่เริ่มต้น'
    : 'End date cannot be earlier than start date';
  const visibleFilterDateRangeError = filterDateRangeError || (filterDateRangeInvalid ? filterDateRangeErrorMessage : '');

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

  const filteredData = videos.filter((video) => {
    const safeLocation = video.location || '';

    const matchesSearch = matchesVideoLibrarySearch(video, searchQuery);
      
    const matchesOfficer = selectedOfficer === 'all' || video.officerName === selectedOfficer;
    const matchesSpotCheck = selectedSpotCheck === 'all' || safeLocation === selectedSpotCheck;
    
    let matchesDate = true;
    if (filterDateRangeInvalid) {
      matchesDate = false;
    } else if (startDate && endDate) {
      const videoDate = new Date(video.startTime.split('T')[0]);
      const start = new Date(startDate);
      const end = new Date(endDate);
      matchesDate = videoDate >= start && videoDate <= end;
    }
    
    return matchesSearch && matchesOfficer && matchesSpotCheck && matchesDate;
  }).sort(sortReportsByLatestTime);

  const completedVideos = videos.filter((video) => video.missionStatus === '3').length;
  const emergencyVideos = videos.filter((video) => video.missionStatus === '7').length;
  const activeFilterCount = [
    searchQuery,
    startDate,
    endDate,
    selectedOfficer !== 'all' ? selectedOfficer : '',
    selectedSpotCheck !== 'all' ? selectedSpotCheck : '',
  ].filter(Boolean).length;

  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = filteredData.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePlayVideo = (video: VideoLibrarySqlData) => {
    setSelectedVideo(video);
    setShowVideoModal(true);
  };

  const handleArchiveVideo = (videoId: string) => {
    setVideos(videos.map(v => v.id === videoId ? { ...v, isArchived: !v.isArchived } : v));
    if (selectedVideo && selectedVideo.id === videoId) {
      setSelectedVideo({ ...selectedVideo, isArchived: !selectedVideo.isArchived });
    }
  };

  // Calculate duration from start and end time
  const calculateDuration = (startTime: string, endTime: string): string => {
    if (!startTime || !endTime) return '-';
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    if (hours > 0) {
      return language === 'th' ? `${hours} ชม. ${mins} นาที` : `${hours}h ${mins}m`;
    }
    return language === 'th' ? `${mins} นาที` : `${mins}m`;
  };

  // Get status badge component
  const getStatusBadge = (status?: string) => {
    if (status === '3') {
      return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${
          darkMode ? 'bg-emerald-500/15 text-emerald-300' : 'bg-emerald-50 text-emerald-700'
        }`}>
          <CheckCircle2 className="w-3.5 h-3.5" />
          {language === 'th' ? 'เสร็จสิ้น' : 'Completed'}
        </span>
      );
    } else if (status === '7') {
      return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${
          darkMode ? 'bg-red-500/15 text-red-300' : 'bg-red-50 text-red-700'
        }`}>
          <AlertCircle className="w-3.5 h-3.5" />
          {language === 'th' ? 'ฉุกเฉิน' : 'Emergency'}
        </span>
      );
    }
    return null;
  };

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

  const formatDate = (isoString: string) => {
    if (!isoString || !isoString.includes('T')) return isoString;
    return new Date(isoString).toLocaleDateString('th-TH');
  };
  const formatTime = (isoString: string) => {
    if (!isoString || !isoString.includes('T')) return isoString;
    return isoString.split('T')[1].substring(0, 5);
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { label: translations.totalVideos, value: videos.length, icon: Film, iconBg: 'bg-sky-600' },
          { label: translations.completedVideos, value: completedVideos, icon: CheckCircle2, iconBg: 'bg-emerald-600' },
          { label: translations.emergencyVideos, value: emergencyVideos, icon: AlertCircle, iconBg: 'bg-rose-600', isAlert: emergencyVideos > 0 },
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

      {/* Filters */}
      <div className={`rounded-lg border overflow-hidden ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
        <div className={`px-5 py-4 border-b ${darkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-100 bg-white'}`}>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h1 className={`text-base font-semibold ${darkMode ? 'text-white' : 'text-slate-950'}`}>{translations.title}</h1>
              <p className={`mt-1 text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{translations.videoArchive}</p>
            </div>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-end">
              <div className="relative w-full lg:w-[320px]">
                <Search className={`absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={translations.searchPlaceholder} className={`h-9 w-full rounded-md border pl-9 pr-9 text-xs outline-none transition-all ${darkMode ? 'border-slate-700 bg-slate-800 text-slate-100 placeholder-slate-500 focus:border-emerald-500' : 'border-slate-200 bg-white text-slate-700 placeholder-slate-400 focus:border-emerald-500'}`} />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 transition-colors ${darkMode ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-400 hover:bg-slate-100'}`}>
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              </div>
              <button
              onClick={() => fetchCompletedMissions()} 
              disabled={isLoading}
                className={`inline-flex h-9 items-center justify-center gap-2 rounded-md px-4 text-xs font-semibold transition-colors ${darkMode ? 'bg-slate-800 text-slate-100 hover:bg-slate-700' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'} ${isLoading ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span>{translations.refresh}</span>
              </button>
            </div>
          </div>
        </div>

        <div className={`px-5 py-4 ${darkMode ? 'bg-slate-900' : 'bg-white'}`}>
          <div className="flex items-center gap-2 pt-3 pb-3">
            <SlidersHorizontal className={`w-4 h-4 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} />
            <span className={`text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {translations.filters}
            </span>
            {activeFilterCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-700 text-white">
                {activeFilterCount}
              </span>
            )}
          </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className={`block text-xs font-semibold mb-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{translations.startDate}</label>
            <div className="relative">
              <Calendar className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
              <input
                type="date"
                value={startDate}
                max={endDate || undefined}
                onChange={(e) => handleFilterStartDateChange(e.target.value)}
                aria-invalid={visibleFilterDateRangeError ? true : undefined}
                className={`w-full h-9 pl-9 pr-3 rounded-md border text-xs outline-none transition-all ${visibleFilterDateRangeError
                  ? 'border-rose-500 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/30'
                  : darkMode
                    ? 'bg-slate-800 border-slate-700 text-white focus:border-emerald-500 scheme-dark'
                    : 'bg-white border-slate-200 text-slate-700 focus:border-emerald-500'
                  }`}
              />
            </div>
          </div>
          <div>
            <label className={`block text-xs font-semibold mb-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{translations.endDate}</label>
            <div className="relative">
              <Calendar className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
              <input
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => handleFilterEndDateChange(e.target.value)}
                aria-invalid={visibleFilterDateRangeError ? true : undefined}
                className={`w-full h-9 pl-9 pr-3 rounded-md border text-xs outline-none transition-all ${visibleFilterDateRangeError
                  ? 'border-rose-500 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/30'
                  : darkMode
                    ? 'bg-slate-800 border-slate-700 text-white focus:border-emerald-500 scheme-dark'
                    : 'bg-white border-slate-200 text-slate-700 focus:border-emerald-500'
                  }`}
              />
            </div>
            {visibleFilterDateRangeError && (
              <p className="mt-1.5 text-xs font-medium text-rose-500">
                {visibleFilterDateRangeError}
              </p>
            )}
          </div>
          <div>
            <label className={`block text-xs font-semibold mb-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{translations.filterOfficer}</label>
            <div className="relative">
              <User className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
              <select value={selectedOfficer} onChange={(e) => setSelectedOfficer(e.target.value)} className={`w-full h-9 pl-9 pr-9 rounded-md border appearance-none text-xs outline-none transition-all cursor-pointer ${darkMode ? 'bg-slate-800 border-slate-700 text-white focus:border-emerald-500' : 'bg-white border-slate-200 text-slate-700 focus:border-emerald-500'}`}>
                <option value="all">{translations.allOfficers}</option>
                {officerList.map((officer) => (
                  <option key={officer.officerId} value={officer.officerName}>{officer.officerName}</option>
                ))}
              </select>
              <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
            </div>
          </div>
          <div>
            <label className={`block text-xs font-semibold mb-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{translations.filterSpotCheck}</label>
            <div className="relative">
              <MapPin className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
              <select value={selectedSpotCheck} onChange={(e) => setSelectedSpotCheck(e.target.value)} className={`w-full h-9 pl-9 pr-9 rounded-md border appearance-none text-xs outline-none transition-all cursor-pointer ${darkMode ? 'bg-slate-800 border-slate-700 text-white focus:border-emerald-500' : 'bg-white border-slate-200 text-slate-700 focus:border-emerald-500'}`}>
                <option value="all">{translations.allSpotChecks}</option>
                {[...new Set(videos.map(v => v.location).filter(Boolean))].map((location) => (
                  <option key={location} value={location}>{location}</option>
                ))}
              </select>
              <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
            </div>
          </div>
          <div className="flex items-end">
          <button onClick={() => { setSearchQuery(''); setStartDate(''); setEndDate(''); setFilterDateRangeError(''); setSelectedOfficer('all'); setSelectedSpotCheck('all'); setCurrentPage(1); }} disabled={activeFilterCount === 0} className={`w-full h-9 rounded-md transition-colors text-xs font-semibold flex items-center justify-center gap-2 whitespace-nowrap border ${activeFilterCount > 0 ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-600 cursor-pointer' : darkMode ? 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed' : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'}`}>
            <X className="w-4 h-4" />
            <span>{translations.reset}</span>
            {activeFilterCount > 0 && <span className="px-1.5 py-0.5 rounded-full text-xs bg-white/20 font-bold">{activeFilterCount}</span>}
          </button>
          </div>
        </div>
        </div>
      </div>

      {/* Table */}
      <div className={`rounded-lg border overflow-hidden ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
        {isLoading ? (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[960px] table-fixed">
                <thead>
                  <tr className={darkMode ? 'bg-slate-800' : 'bg-slate-100'}>
                    <th className={`w-[72px] border-b px-5 py-4 text-center text-xs font-bold uppercase tracking-normal ${darkMode ? 'border-slate-700 text-slate-300' : 'border-slate-200 text-slate-500'}`}>{translations.tableNo}</th>
                    <th className={`w-[170px] border-b px-5 py-4 text-left text-xs font-bold uppercase tracking-normal ${darkMode ? 'border-slate-700 text-slate-300' : 'border-slate-200 text-slate-500'}`}>{translations.tableCode}</th>
                    <th className={`w-[310px] border-b px-5 py-4 text-left text-xs font-bold uppercase tracking-normal ${darkMode ? 'border-slate-700 text-slate-300' : 'border-slate-200 text-slate-500'}`}>{translations.tableTitle}</th>
                    <th className={`w-[200px] border-b px-5 py-4 text-left text-xs font-bold uppercase tracking-normal ${darkMode ? 'border-slate-700 text-slate-300' : 'border-slate-200 text-slate-500'}`}>{translations.tableOfficer}</th>
                    <th className={`w-[150px] border-b px-5 py-4 text-center text-xs font-bold uppercase tracking-normal ${darkMode ? 'border-slate-700 text-slate-300' : 'border-slate-200 text-slate-500'}`}>{translations.tableStatus}</th>
                    <th className={`w-[150px] border-b px-5 py-4 text-center text-xs font-bold uppercase tracking-normal ${darkMode ? 'border-slate-700 text-slate-300' : 'border-slate-200 text-slate-500'}`}>{translations.tableActions}</th>
                  </tr>
                </thead>
                <tbody className={darkMode ? 'divide-y divide-slate-800' : 'divide-y divide-slate-100'}>
                  {Array.from({ length: 5 }).map((_, index) => (
                    <tr key={`loading-${index}`}>
                      <td className="px-4 py-4"><div className={`mx-auto h-4 w-6 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} animate-pulse`} /></td>
                      <td className="px-4 py-4"><div className={`h-4 w-32 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} animate-pulse`} /></td>
                      <td className="px-4 py-4"><div className={`h-4 w-52 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} animate-pulse`} /></td>
                      <td className="px-4 py-4"><div className={`h-4 w-36 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} animate-pulse`} /></td>
                      <td className="px-4 py-4"><div className={`mx-auto h-7 w-24 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} animate-pulse`} /></td>
                      <td className="px-4 py-4"><div className={`mx-auto h-9 w-24 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} animate-pulse`} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={`md:hidden divide-y ${darkMode ? 'divide-slate-800' : 'divide-slate-100'}`}>
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={`mobile-loading-${index}`} className={`p-4 ${darkMode ? 'bg-slate-900' : 'bg-white'}`}>
                  <div className={`h-4 w-36 rounded mb-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} animate-pulse`} />
                  <div className={`h-4 w-52 rounded mb-2 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} animate-pulse`} />
                  <div className={`h-3 w-28 rounded mb-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} animate-pulse`} />
                  <div className={`h-10 w-full rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} animate-pulse`} />
                </div>
              ))}
            </div>
          </>
        ) : filteredData.length === 0 ? (
          <div className={`p-12 text-center ${darkMode ? 'bg-slate-900' : 'bg-white'}`}>
            <div className={`mx-auto mb-4 h-14 w-14 rounded-lg flex items-center justify-center ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
              <Video className={`w-7 h-7 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
            </div>
            <h3 className={`text-lg font-bold mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{translations.noData}</h3>
            <p className={`${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{translations.noDataMessage}</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[960px] table-fixed">
                <thead>
                  <tr className={darkMode ? 'bg-slate-800' : 'bg-slate-100'}>
                    <th className={`w-[72px] border-b px-5 py-4 text-center text-xs font-bold uppercase tracking-normal ${darkMode ? 'border-slate-700 text-slate-300' : 'border-slate-200 text-slate-500'}`}>{translations.tableNo}</th>
                    <th className={`w-[170px] border-b px-5 py-4 text-left text-xs font-bold uppercase tracking-normal ${darkMode ? 'border-slate-700 text-slate-300' : 'border-slate-200 text-slate-500'}`}>{translations.tableCode}</th>
                    <th className={`w-[310px] border-b px-5 py-4 text-left text-xs font-bold uppercase tracking-normal ${darkMode ? 'border-slate-700 text-slate-300' : 'border-slate-200 text-slate-500'}`}>{translations.tableTitle}</th>
                    <th className={`w-[200px] border-b px-5 py-4 text-left text-xs font-bold uppercase tracking-normal ${darkMode ? 'border-slate-700 text-slate-300' : 'border-slate-200 text-slate-500'}`}>{translations.tableOfficer}</th>
                    <th className={`w-[150px] border-b px-5 py-4 text-center text-xs font-bold uppercase tracking-normal ${darkMode ? 'border-slate-700 text-slate-300' : 'border-slate-200 text-slate-500'}`}>{translations.tableStatus}</th>
                    <th className={`w-[150px] border-b px-5 py-4 text-center text-xs font-bold uppercase tracking-normal ${darkMode ? 'border-slate-700 text-slate-300' : 'border-slate-200 text-slate-500'}`}>{translations.tableActions}</th>
                  </tr>
                </thead>
                <tbody className={darkMode ? 'divide-y divide-slate-800' : 'divide-y divide-slate-100'}>
                  {currentData.map((video, index) => (
                    <tr key={video.id} className={`transition-colors ${darkMode ? 'hover:bg-slate-800/70' : 'hover:bg-slate-50/80'}`}>
                      <td className={`px-5 py-4 text-center ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                        <span className="text-sm font-medium">{startIndex + index + 1}</span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="space-y-1.5">
                          <p className={`font-semibold text-sm ${darkMode ? 'text-slate-100' : 'text-slate-700'}`}>{video.reportId || video.missionId}</p>
                          {video.cameraCode && (
                            <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                              {language === 'th' ? 'กล้อง' : 'Cam'}: {video.cameraCode}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="space-y-1.5">
                          <p className={`font-medium text-sm ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>{video.missionName || (language === 'th' ? 'ไม่มีชื่อ' : 'No name')}</p>
                          <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            {formatDate(video.startTime)} {formatTime(video.startTime)} - {video.duration}
                          </p>
                          {video.location && (
                            <p className={`text-xs flex items-center gap-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                              <MapPin className="w-3 h-3" />
                              {video.location}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className={`flex items-center gap-2 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                          <User className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate text-sm font-semibold">{video.officerName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-center">
                          {getStatusBadge(video.missionStatus)}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <button onClick={() => handlePlayVideo(video)} className="mx-auto flex h-9 min-w-[112px] cursor-pointer items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 text-xs font-semibold text-white transition-colors hover:bg-emerald-700">
                          <Play className="w-4 h-4" />
                          <span>{language === 'th' ? 'ดูวิดีโอ' : 'Watch'}</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className={`md:hidden divide-y ${darkMode ? 'divide-slate-800' : 'divide-slate-100'}`}>
              {currentData.map((video) => (
                <div key={video.id} className={`p-4 ${darkMode ? 'bg-slate-900' : 'bg-white'}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{video.reportId || video.missionId}</span>
                        {getStatusBadge(video.missionStatus)}
                      </div>
                      
                      <p className={`text-sm font-medium mb-1 ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>{video.missionName || '-'}</p>

                      <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{video.officerName}</p>
                      <p className={`text-xs mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{formatDate(video.startTime)} {formatTime(video.startTime)} - {video.duration}</p>
                    </div>
                  </div>
                  <button onClick={() => handlePlayVideo(video)} className="flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-700">
                    <Play className="w-4 h-4" /><span>{language === 'th' ? 'ดูวิดีโอย้อนหลัง' : 'Watch Video'}</span>
                  </button>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className={`border-t px-6 py-4 ${darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-100 bg-white'}`}>
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="order-3 flex items-center gap-2">
                  <label className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{translations.itemsPerPage}:</label>
                  <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className={`h-8 rounded-md border px-2 text-sm font-semibold cursor-pointer ${darkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-600'} focus:outline-none focus:ring-2 focus:ring-emerald-500/30`}>
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>
                <div className={`order-1 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{translations.showing} {startIndex + 1} - {Math.min(endIndex, filteredData.length)} {translations.of} {filteredData.length}</div>
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
          </>
        )}
      </div>

      {/* --- External Modal --- */}
      <VideoLibraryModal 
        show={showVideoModal} 
        video={selectedVideo} 
        onClose={() => setShowVideoModal(false)} 
        onArchive={handleArchiveVideo} 
        translations={translations} 
        language={language}
        darkMode={darkMode} 
      />

    </div>
  );
}
