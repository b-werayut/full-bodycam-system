import { Plus, Search, X } from 'lucide-react';
import type { SpotCheckTranslationData } from '../../locales/spotCheckTranslations';

export interface SpotCheckFiltersProps {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  startDate: string;
  setStartDate: (value: string) => void;
  endDate: string;
  setEndDate: (value: string) => void;
  selectedOfficer: string;
  setSelectedOfficer: (value: string) => void;
  selectedStatus: string;
  setSelectedStatus: (value: string) => void;
  onReset: () => void;
  darkMode: boolean;
  translations: SpotCheckTranslationData;
  officers: { officerId: number; officerName: string }[];
  onAddClick?: () => void;
  canUseTools?: boolean;
  dateRangeError?: string;
}

export function SpotCheckFilters({
  searchQuery,
  setSearchQuery,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  selectedOfficer,
  setSelectedOfficer,
  selectedStatus,
  setSelectedStatus,
  onReset,
  translations,
  darkMode,
  officers,
  onAddClick,
  canUseTools = false,
  dateRangeError = '',
}: SpotCheckFiltersProps) {
  const activeFilterCount = [
    searchQuery,
    startDate,
    endDate,
    selectedOfficer !== 'all' ? selectedOfficer : '',
    selectedStatus !== 'all' ? selectedStatus : '',
  ].filter(Boolean).length;

  const controlClass = `h-10 rounded-md border text-xs shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 ${
    darkMode
      ? 'bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-sky-500'
      : 'bg-white border-slate-200 text-slate-700 placeholder-slate-400 focus:border-sky-400'
  }`;

  const optionClass = darkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-900';

  return (
    <div className={`rounded-lg border px-4 py-3 shadow-sm ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
      <div className="mb-3">
        <h2 className={`text-base font-bold leading-6 ${darkMode ? 'text-white' : 'text-slate-950'}`}>
          {translations.listTitle}
        </h2>
        <p className={`text-xs leading-5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          {translations.missionBoard}
        </p>
      </div>

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-[260px]">
            <Search className={`absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
            <input
              type="text"
              placeholder={translations.searchPlaceholder}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className={`${controlClass} w-full pl-9 pr-8`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 transition-colors ${
                  darkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-400 hover:bg-slate-100'
                }`}
                aria-label={translations.reset}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <input
            type="date"
            aria-label={translations.startDate}
            value={startDate}
            max={endDate || undefined}
            onChange={(event) => setStartDate(event.target.value)}
            aria-invalid={dateRangeError ? true : undefined}
            className={`${controlClass} w-[150px] px-3 ${darkMode ? 'scheme-dark' : ''} ${
              dateRangeError ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20' : ''
            }`}
          />

          <input
            type="date"
            aria-label={translations.endDate}
            value={endDate}
            min={startDate || undefined}
            onChange={(event) => setEndDate(event.target.value)}
            aria-invalid={dateRangeError ? true : undefined}
            className={`${controlClass} w-[150px] px-3 ${darkMode ? 'scheme-dark' : ''} ${
              dateRangeError ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20' : ''
            }`}
          />

          {dateRangeError && (
            <p className={`basis-full text-xs font-medium ${darkMode ? 'text-rose-300' : 'text-rose-600'}`}>
              {dateRangeError}
            </p>
          )}

          <select
            value={selectedOfficer}
            onChange={(event) => setSelectedOfficer(event.target.value)}
            className={`${controlClass} w-[150px] cursor-pointer px-3`}
            aria-label={translations.filterOfficer}
          >
            <option value="all" className={optionClass}>{translations.filterOfficer}</option>
            {officers.map((officer) => (
              <option key={officer.officerId} value={String(officer.officerId)} className={optionClass}>
                {officer.officerName}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(event) => setSelectedStatus(event.target.value)}
            className={`${controlClass} w-[150px] cursor-pointer px-3`}
            aria-label={translations.filterStatus}
          >
            <option value="all" className={optionClass}>{translations.filterStatus}</option>
            <option value="waiting" className={optionClass}>{translations.statusWaiting}</option>
            <option value="accepted" className={optionClass}>{translations.statusAccepted}</option>
            <option value="in-progress" className={optionClass}>{translations.statusInProgress}</option>
            <option value="completed" className={optionClass}>{translations.statusCompleted}</option>
            <option value="cancelled" className={optionClass}>{translations.statusCancelled}</option>
          </select>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={onReset}
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
            {translations.reset}
            {activeFilterCount > 0 && <span className="ml-1">({activeFilterCount})</span>}
          </button>

          {canUseTools && onAddClick && (
            <button
              onClick={onAddClick}
              className="flex h-10 items-center gap-2 rounded-md bg-emerald-600 px-4 text-xs font-bold text-white shadow-sm transition-all hover:bg-emerald-700"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{translations.addSpotCheck}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
