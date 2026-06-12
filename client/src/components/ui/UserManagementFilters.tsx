import { Search, X, ChevronDown, Plus } from 'lucide-react';
import type { UserTranslationData } from '../../locales/userTranslations';
import { MANAGEABLE_ROLE_DEFINITIONS, getRoleDisplayName } from '../../lib/roles';

interface UserManagementFiltersProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  filterRole: string;
  setFilterRole: (value: string) => void;
  filterStatus: string;
  setFilterStatus: (value: string) => void;
  onReset: () => void;
  translations: UserTranslationData;
  darkMode: boolean;
  onAddUser?: () => void;
  canCreateDeleteUsers?: boolean;
}

export function UserManagementFilters({
  searchTerm,
  setSearchTerm,
  filterRole,
  setFilterRole,
  filterStatus,
  setFilterStatus,
  onReset,
  translations,
  darkMode,
  onAddUser,
  canCreateDeleteUsers
}: UserManagementFiltersProps) {
  const activeFilterCount = [
    searchTerm.trim(),
    filterRole !== 'all' ? filterRole : '',
    filterStatus !== 'all' ? filterStatus : '',
  ].filter(Boolean).length;

  return (
    <div className={`mb-5 overflow-hidden rounded-lg border shadow-sm ${darkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'}`}>
      {/* Search Row with Add Button */}
      <div className={`border-b px-5 py-4 ${darkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-100 bg-white'}`}>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className={`text-base font-semibold ${darkMode ? 'text-white' : 'text-slate-950'}`}>{translations.title}</h1>
            <p className={`mt-1 text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{translations.subtitle}</p>
          </div>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-end">
          <div className="relative w-full lg:w-[320px]">
            <Search className={`absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={translations.searchPlaceholder}
              className={`h-9 w-full rounded-md border pl-9 pr-9 text-xs outline-none transition-all focus:border-emerald-500 ${darkMode ? 'border-slate-700 bg-slate-800 text-slate-100 placeholder-slate-500' : 'border-slate-200 bg-white text-slate-700 placeholder-slate-400'}`}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 transition-colors ${darkMode ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-400 hover:bg-slate-100'}`}
                aria-label={translations.reset}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {canCreateDeleteUsers && onAddUser && (
            <button
              onClick={onAddUser}
              className="h-9 px-4 sm:px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">{translations.addUser}</span>
            </button>
          )}
          </div>
        </div>
      </div>

      {/* Filters Row */}
      <div className={`px-5 pb-4 ${darkMode ? 'bg-slate-900' : 'bg-white'}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">

          {/* Role Filter */}
          <div>
            <label className={`block text-xs font-semibold my-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {translations.filterByRole}
            </label>
            <div className="relative">
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className={`w-full h-9 pl-3 pr-9 rounded-md border appearance-none text-xs focus:border-emerald-500 focus:outline-none transition-all cursor-pointer ${darkMode ? 'border-slate-700 bg-slate-800 text-slate-100' : 'border-slate-200 bg-white text-slate-700'}`}
              >
                <option value="all">{translations.allRoles}</option>
                {MANAGEABLE_ROLE_DEFINITIONS.map((role) => (
                  <option key={role.id} value={role.id}>
                    {getRoleDisplayName(role.id, translations)}
                  </option>
                ))}
              </select>
              <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className={`block text-xs font-semibold my-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {translations.filterByStatus}
            </label>
            <div className="relative">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className={`w-full h-9 pl-3 pr-9 rounded-md border appearance-none text-xs focus:border-emerald-500 focus:outline-none transition-all cursor-pointer ${darkMode ? 'border-slate-700 bg-slate-800 text-slate-100' : 'border-slate-200 bg-white text-slate-700'}`}
              >
                <option value="all">{translations.allStatuses}</option>
                <option value="active">{translations.active}</option>
                <option value="inactive">{translations.inactive}</option>
              </select>
              <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
            </div>
          </div>

          {/* Reset Button */}
          <div className="flex items-end">
            <button
              onClick={onReset}
              disabled={activeFilterCount === 0}
              className={`w-full h-9 px-5 rounded-md transition-colors text-xs font-semibold flex items-center justify-center gap-2 border ${
                activeFilterCount > 0
                  ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-600 cursor-pointer'
                  : darkMode ? 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed' : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <X className="w-4 h-4" />
              <span>{translations.reset}</span>
              {activeFilterCount > 0 && <span className="px-1.5 py-0.5 rounded-full text-xs bg-white/20 font-bold">{activeFilterCount}</span>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
