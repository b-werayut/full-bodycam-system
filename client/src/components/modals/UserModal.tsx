import { useState, useEffect } from 'react';
import { Eye, EyeOff, X, User as UserIcon, Save, Trash2, AlertTriangle } from 'lucide-react';
import type { UserSqlData } from '../../features/users/types';
import type { UserTranslationData, UserLanguage } from '../../locales/userTranslations';
import { MANAGEABLE_ROLE_DEFINITIONS, ROLE_IDS, getRoleDisplayName } from '../../lib/roles';
import {
  hasDisallowedCredentialCharacters,
  isEnglishAlphanumericPassword,
  isEnglishAlphanumericUsername,
  sanitizeEnglishAlphanumericCredential,
} from '../../lib/userValidation';
import { SearchableSelect } from '../ui/SearchableSelect';

interface UserModalProps {
  user: UserSqlData | null; 
  mode: 'add' | 'edit';
  darkMode: boolean;
  language: UserLanguage; 
  onClose: () => void;
  onSave: (user: UserSqlData, password?: string) => void | Promise<void>;
  onDelete?: (userId: number) => void | Promise<void>;
  translations: UserTranslationData;
  canManagePasswords?: boolean;
  existingUsernames?: string[];
  locations?: Array<{ locationCode: string; locationName?: string | null }>;
}

export function UserModal({ user, mode, darkMode, language, onClose, onSave, onDelete, translations, canManagePasswords = false, existingUsernames = [], locations = [] }: UserModalProps) {
  const [formData, setFormData] = useState<{
    userId: number;
    username: string;
    roleName: string;
    roleId: number;
    status: 'active' | 'inactive';
    locationCode: string;
  }>(
    user ? { ...user, roleId: user.roleId ?? ROLE_IDS.officer, status: user.status || 'active', locationCode: user.locationCode ?? '' } : {
      userId: 0,
      username: '',
      roleName: '',
      roleId: ROLE_IDS.officer,
      status: 'active',
      locationCode: '',
    }
  );
  
  const [password, setPassword] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Validation: Check if form is valid for save button
  const isFormValid = (() => {
    const hasValidUsername = formData.username.trim().length > 0 && !usernameError;
    if (mode === 'add') {
      const hasValidPassword = canManagePasswords ? (password.length >= 6 && !passwordError) : true;
      return hasValidUsername && hasValidPassword;
    }
    return hasValidUsername;
  })();

  const validateUsername = (nextUsername: string) => {
    const normalizedUsername = nextUsername.trim().toLowerCase();
    const currentUsername = user?.username?.trim().toLowerCase();
    const isExistingUsernameUnchanged = mode === 'edit' && normalizedUsername === currentUsername;

    if (!isExistingUsernameUnchanged && !isEnglishAlphanumericUsername(nextUsername)) {
      setUsernameError(translations.usernameFormatError);
      return false;
    }

    const isDuplicate = existingUsernames.some((existingUsername) => {
      const normalizedExistingUsername = existingUsername.trim().toLowerCase();
      return normalizedExistingUsername === normalizedUsername && normalizedExistingUsername !== currentUsername;
    });

    const nextError = isDuplicate ? translations.usernameExists : '';
    setUsernameError(nextError);
    return !nextError;
  };

  const validatePassword = (nextPassword: string) => {
    if (nextPassword.length < 6) {
      setPasswordError(translations.passwordMinLength);
      return false;
    }

    if (!isEnglishAlphanumericPassword(nextPassword)) {
      setPasswordError(translations.passwordFormatError);
      return false;
    }

    setPasswordError('');
    return true;
  };
  
  // const [permissions, setPermissions] = useState({
  //   dashboard: false,
  //   activities: false,
  //   live: false,
  //   video: false,
  //   reports: false,
  //   users: false,
  // });

  // Lock body scroll when modal is open
  useEffect(() => {
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
  }, []);

  const handleSave = async () => {
    if (mode === 'add' && !validatePassword(password)) {
      return;
    }
    if (!validateUsername(formData.username)) {
      return;
    }
    if (usernameError) {
      return;
    }
    if (!formData.username.trim()) {
      return;
    }

    const roleId = formData.roleId || ROLE_IDS.officer;
    const roleText = getRoleDisplayName(roleId, translations);

    await onSave(
      {
        ...formData,
        roleId,
        roleName: roleText,
      } as UserSqlData,
      canManagePasswords ? password : undefined
    );
  };

  const handleDelete = async () => {
    if (onDelete && formData.userId) {
      await onDelete(formData.userId);
    }
  };

  // const handlePermissionChange = (permission: keyof typeof permissions, checked: boolean) => {
  //   setPermissions({
  //     ...permissions,
  //     [permission]: checked,
  //   });
  // };

  // Shared config for the searchable location dropdown (used in both add/edit modes).
  const locationSelectOptions = locations.map((loc) => ({
    value: loc.locationCode,
    // Show only the location name; fall back to the code when a name is missing.
    label: loc.locationName || loc.locationCode,
    // Keep the code searchable even though it isn't displayed.
    keywords: loc.locationCode,
  }));
  const locationTriggerClass = `w-full px-4 py-3 pr-10 border rounded-md transition-colors outline-none cursor-pointer focus:border-emerald-500 ${darkMode ? 'border-slate-700 bg-slate-800 text-slate-100' : 'border-slate-200 bg-white text-slate-900'}`;
  const locationSearchPlaceholder = language === 'th' ? 'ค้นหาสถานที่...' : 'Search location...';
  const locationEmptyText = language === 'th' ? 'ไม่พบสถานที่' : 'No locations found';

  if (mode === 'edit') {
    return (
      <>
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 backdrop-blur-sm p-4 animate-fadeIn">
          <div className={`w-full max-w-2xl overflow-hidden rounded-lg border shadow-2xl transform transition-all duration-300 animate-slideUp ${darkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'}`}>
            {/* Header */}
            <div className={`relative border-b px-8 py-6 ${darkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-100 bg-white'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`rounded-md p-3 ${darkMode ? 'bg-emerald-500/15 text-emerald-300' : 'bg-emerald-50 text-emerald-600'}`}>
                    <UserIcon className="w-8 h-8" />
                  </div>
                  <div>
                    <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-950'}`}>
                      {translations.editUser}
                    </h2>
                  </div>
                </div>
                
                <button
                  onClick={onClose}
                  className={`flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg transition-colors ${darkMode ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className={`p-8 space-y-6 max-h-[60vh] overflow-y-auto ${darkMode ? 'bg-slate-900' : 'bg-white'}`}>
              <div className="space-y-5">
                {/* Username Input */}
                <div>
                  <label className={`block font-semibold text-base mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    {translations.username} <span className={darkMode ? 'text-emerald-300' : 'text-emerald-600'}>*</span>
                  </label>
                  <input
                    type="text"
                    pattern="[A-Za-z0-9]+"
                    title={translations.usernameFormatError}
                    value={formData.username}
                    onChange={(e) => {
                      const newUsername = sanitizeEnglishAlphanumericCredential(e.target.value);
                      setFormData({ ...formData, username: newUsername });
                      validateUsername(newUsername);
                    }}
                    className={`w-full px-4 py-3 border rounded-md transition-colors outline-none ${
                      usernameError 
                        ? darkMode ? 'border-rose-500 bg-slate-800 text-slate-100 focus:border-rose-500' : 'border-rose-500 bg-white text-slate-900 focus:border-rose-500'
                        : darkMode ? 'border-slate-700 bg-slate-800 text-slate-100 placeholder-slate-500 focus:border-emerald-500' : 'border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:border-emerald-500'
                    }`}
                  />
                  {usernameError && (
                    <p className="text-rose-400 text-sm mt-1">{usernameError}</p>
                  )}
                </div>

                {/* Role Dropdown (roleId) */}
                <div>
                  <label className={`block font-semibold text-base mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    {translations.role} :
                  </label>
                  <select
                    value={formData.roleId || ROLE_IDS.officer}
                    onChange={(e) => setFormData({ ...formData, roleId: Number(e.target.value) })}
                    className={`w-full px-4 py-3 border rounded-md transition-colors outline-none cursor-pointer focus:border-emerald-500 ${darkMode ? 'border-slate-700 bg-slate-800 text-slate-100' : 'border-slate-200 bg-white text-slate-900'}`}
                  >
                    {MANAGEABLE_ROLE_DEFINITIONS.map((role) => (
                      <option key={role.id} value={role.id}>
                        {getRoleDisplayName(role.id, translations)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Location Dropdown */}
                <div>
                  <label className={`block font-semibold text-base mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    {translations.location} :
                  </label>
                  <SearchableSelect
                    value={formData.locationCode}
                    options={locationSelectOptions}
                    onChange={(locationCode) => setFormData({ ...formData, locationCode })}
                    placeholder={translations.selectLocation}
                    searchPlaceholder={locationSearchPlaceholder}
                    emptyText={locationEmptyText}
                    clearable
                    clearLabel={translations.selectLocation}
                    darkMode={darkMode}
                    triggerClassName={locationTriggerClass}
                  />
                </div>

                {/* Status Dropdown (Active/Inactive) */}
                <div>
                  <label className={`block font-semibold text-base mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    {translations.tableStatus} :
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                    className={`w-full px-4 py-3 border rounded-md transition-colors outline-none cursor-pointer focus:border-emerald-500 ${darkMode ? 'border-slate-700 bg-slate-800 text-slate-100' : 'border-slate-200 bg-white text-slate-900'}`}
                  >
                    <option value="active">{translations.active}</option>
                    <option value="inactive">{translations.inactive}</option>
                  </select>
                </div>

                {/* Permissions */}
                {/* <div>
                  <label className={`block font-semibold text-base mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {translations.permissions}
                  </label>
                  <div className="space-y-2">
                    {Object.keys(permissions).map((key) => {
                      const permKey = key as keyof typeof permissions;
                      const labelKey = `perm${key.charAt(0).toUpperCase() + key.slice(1)}` as keyof typeof translations;
                      return (
                        <label key={key} className={`flex items-center gap-3 cursor-pointer ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          <input
                            type="checkbox"
                            checked={permissions[permKey]}
                            onChange={(e) => handlePermissionChange(permKey, e.target.checked)}
                            className="w-5 h-5 text-[#fcd500] border-2 rounded focus:ring-2 focus:ring-[#fcd500]/50 cursor-pointer"
                          />
                          <span>{translations[labelKey] || key}</span>
                        </label>
                      );
                    })}
                  </div>
                </div> */}
              </div>
            </div>

            {/* Footer */}
            <div className={`px-8 py-6 border-t flex flex-col sm:flex-row items-center justify-between gap-4 ${darkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-100 bg-white'}`}>
              
              {/* ปุ่มลบผู้ใช้งาน (ฝั่งซ้าย) */}
              {onDelete && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full sm:w-auto px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-md font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Trash2 className="w-5 h-5" />
                  {translations.delete}
                </button>
              )}

              {/* ปุ่มยกเลิก และ บันทึก (ฝั่งขวา) */}
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  onClick={onClose}
                  className={`w-full sm:w-auto px-6 py-3 rounded-md font-bold transition-colors cursor-pointer border ${darkMode ? 'border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-700' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
                >
                  {translations.cancel}
                </button>

                <button
                  onClick={handleSave}
                  disabled={!isFormValid}
                  className={`w-full sm:w-auto px-8 py-3 text-white rounded-md font-bold transition-colors flex items-center justify-center gap-2 ${isFormValid ? 'bg-emerald-600 hover:bg-emerald-700 cursor-pointer' : 'bg-slate-400 cursor-not-allowed'}`}
                >
                  <Save className="w-5 h-5" />
                  {translations.save}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* หน้าต่างยืนยันการลบ (Delete Confirmation Modal) */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/45 backdrop-blur-sm p-4 animate-fadeIn">
            <div className={`w-full max-w-md overflow-hidden rounded-lg border shadow-2xl transform transition-all duration-300 animate-slideUp ${darkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'}`}>
              <div className={`border-b px-6 py-4 flex items-center gap-3 ${darkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-100 bg-white'}`}>
                <div className={`rounded-md p-2 ${darkMode ? 'bg-rose-500/15 text-rose-300' : 'bg-rose-50 text-rose-600'}`}>
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-950'}`}>{translations.deleteConfirmTitle}</h2>
              </div>
              <div className={`p-6 space-y-4 ${darkMode ? 'bg-slate-900' : 'bg-white'}`}>
                <p className={`text-base ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                  {translations.deleteConfirmMessage}
                </p>
                <div className={`p-3 rounded-md border ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-slate-50'}`}>
                  <p className={`font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{formData.username}</p>
                </div>
                <div className={`flex justify-end gap-3 pt-4 border-t ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className={`px-6 py-2.5 rounded-md font-bold transition-colors cursor-pointer border ${darkMode ? 'border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-700' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
                  >
                    {translations.cancel}
                  </button>
                  <button
                    onClick={handleDelete}
                    className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-md font-bold transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    {translations.confirmDelete}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // ==========================================
  // Render: โหมดเพิ่มผู้ใช้ (Add Mode) 
  // ==========================================
  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 backdrop-blur-sm p-4 animate-fadeIn">
        <div className={`w-full max-w-3xl overflow-hidden rounded-lg border shadow-2xl transform transition-all duration-300 animate-slideUp ${darkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'}`}>
          {/* Header */}
          <div className={`relative border-b px-8 py-6 ${darkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-100 bg-white'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`rounded-md p-3 ${darkMode ? 'bg-emerald-500/15 text-emerald-300' : 'bg-emerald-50 text-emerald-600'}`}>
                  <UserIcon className="w-8 h-8" />
                </div>
                <div>
                  <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-950'}`}>
                    {translations.addUser}
                  </h2>
                </div>
              </div>
              
              <button
                onClick={onClose}
                className={`flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg transition-colors ${darkMode ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className={`p-8 space-y-6 max-h-[70vh] overflow-y-auto ${darkMode ? 'bg-slate-900' : 'bg-white'}`}>
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Username Input */}
                <div className="space-y-2">
                  <label className={`block font-semibold text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    {translations.username} <span className={darkMode ? 'text-emerald-300' : 'text-emerald-600'}>*</span>
                  </label>
                  <input
                    type="text"
                    pattern="[A-Za-z0-9]+"
                    title={translations.usernameFormatError}
                    value={formData.username}
                    onChange={(e) => {
                      const newUsername = sanitizeEnglishAlphanumericCredential(e.target.value);
                      setFormData({ ...formData, username: newUsername });
                      validateUsername(newUsername);
                    }}
                    className={`w-full px-4 py-3 border rounded-md transition-colors outline-none ${
                      usernameError
                        ? darkMode ? 'border-rose-500 bg-slate-800 text-slate-100 focus:border-rose-500' : 'border-rose-500 bg-white text-slate-900 focus:border-rose-500'
                        : darkMode ? 'border-slate-700 bg-slate-800 text-slate-100 placeholder-slate-500 focus:border-emerald-500' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500'
                    }`}
                  />
                  {usernameError && (
                    <p className="text-rose-400 text-sm mt-1">{usernameError}</p>
                  )}
                </div>

                {canManagePasswords && (
                  <div className="space-y-2">
                    <label className={`block font-semibold text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      {translations.password}<span className={darkMode ? 'text-emerald-300' : 'text-emerald-600'}>*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        pattern="[A-Za-z0-9]+"
                        title={translations.passwordFormatError}
                        onChange={(e) => {
                          const rawPassword = e.target.value;
                          const newPassword = sanitizeEnglishAlphanumericCredential(rawPassword);
                          setPassword(newPassword);
                          if (hasDisallowedCredentialCharacters(rawPassword)) {
                            setPasswordError(translations.passwordFormatError);
                          } else if (passwordError) {
                            validatePassword(newPassword);
                          }
                        }}
                        className={`w-full px-4 py-3 pr-12 border rounded-md transition-colors outline-none focus:border-emerald-500 ${
                          passwordError
                            ? darkMode ? 'border-rose-500 bg-slate-800 text-slate-100 focus:border-rose-500' : 'border-rose-500 bg-white text-slate-900 focus:border-rose-500'
                            : darkMode ? 'border-slate-700 bg-slate-800 text-slate-100 placeholder-slate-500' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((value) => !value)}
                        title={showPassword ? translations.hidePassword : translations.showPassword}
                        aria-label={showPassword ? translations.hidePassword : translations.showPassword}
                        className={`absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 transition-colors cursor-pointer ${darkMode ? 'text-slate-300 hover:bg-slate-700 hover:text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`}
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {passwordError && (
                      <p className="text-rose-400 text-sm mt-1">{passwordError}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Role (roleId) */}
                <div className="space-y-2">
                  <label className={`block font-semibold text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    {translations.role} <span className={darkMode ? 'text-emerald-300' : 'text-emerald-600'}>*</span>
                  </label>
                  <select
                    value={formData.roleId || ROLE_IDS.officer}
                    onChange={(e) => setFormData({ ...formData, roleId: Number(e.target.value) })}
                    className={`w-full px-4 py-3 border rounded-md transition-colors outline-none cursor-pointer focus:border-emerald-500 ${darkMode ? 'border-slate-700 bg-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
                  >
                    {MANAGEABLE_ROLE_DEFINITIONS.map((role) => (
                      <option key={role.id} value={role.id}>
                        {getRoleDisplayName(role.id, translations)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <label className={`block font-semibold text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    {translations.tableStatus} <span className={darkMode ? 'text-emerald-300' : 'text-emerald-600'}>*</span>
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                    className={`w-full px-4 py-3 border rounded-md transition-colors outline-none cursor-pointer focus:border-emerald-500 ${darkMode ? 'border-slate-700 bg-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
                  >
                    <option value="active">{translations.active}</option>
                    <option value="inactive">{translations.inactive}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Location */}
                <div className="space-y-2">
                  <label className={`block font-semibold text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    {translations.location}
                  </label>
                  <SearchableSelect
                    value={formData.locationCode}
                    options={locationSelectOptions}
                    onChange={(locationCode) => setFormData({ ...formData, locationCode })}
                    placeholder={translations.selectLocation}
                    searchPlaceholder={locationSearchPlaceholder}
                    emptyText={locationEmptyText}
                    clearable
                    clearLabel={translations.selectLocation}
                    darkMode={darkMode}
                    triggerClassName={locationTriggerClass}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className={`px-8 py-6 border-t flex items-center justify-end gap-3 ${darkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-100 bg-white'}`}>
            <button
              onClick={onClose}
              className={`px-8 py-3 rounded-md font-bold transition-colors cursor-pointer border ${darkMode ? 'border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-700' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
            >
              {translations.cancel}
            </button>

            <button
              onClick={handleSave}
              disabled={!isFormValid}
              className={`px-8 py-3 text-white rounded-md font-bold transition-colors flex items-center gap-2 ${isFormValid ? 'bg-emerald-600 hover:bg-emerald-700 cursor-pointer' : 'bg-slate-400 cursor-not-allowed'}`}
            >
              <Save className="w-5 h-5" />
              {translations.save}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
