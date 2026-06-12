import { useEffect, useState } from 'react';
import { AlertCircle, Eye, EyeOff, KeyRound, Lock, Save, User, X } from 'lucide-react';
import { translations, type Language } from '../../locales/translations';
import {
  hasDisallowedCredentialCharacters,
  isEnglishAlphanumericPassword,
  sanitizeEnglishAlphanumericCredential,
} from '../../lib/userValidation';

interface ChangePasswordModalProps {
  username: string;
  language: Language;
  darkMode: boolean;
  onClose: () => void;
  onSave: (currentPassword: string, newPassword: string) => Promise<void>;
}

const MIN_PASSWORD_LENGTH = 6;

export function ChangePasswordModal({
  username,
  language,
  darkMode,
  onClose,
  onSave,
}: ChangePasswordModalProps) {
  const t = translations[language];
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const getLabel = (thai: string, english: string) => (language === 'th' ? thai : english);

  const alphanumericOnlyMessage = getLabel(
    'รหัสผ่านใหม่ใช้ได้เฉพาะตัวอักษรอังกฤษ A-Z/a-z และตัวเลข 0-9 เท่านั้น',
    'New password can use only English letters A-Z/a-z and numbers 0-9.',
  );

  // Lock background scroll while the modal is open.
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

  // Close on Escape, but never mid-save so a request can't be abandoned.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSaving) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isSaving, onClose]);

  // New/confirm passwords accept only English letters and digits, so strip
  // anything else as it is typed and surface a hint when something was removed.
  const handleSanitizedInput =
    (setValue: (value: string) => void) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const raw = event.target.value;
      setValue(sanitizeEnglishAlphanumericCredential(raw));
      setError(hasDisallowedCredentialCharacters(raw) ? alphanumericOnlyMessage : '');
    };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSaving) return;

    if (!currentPassword) {
      setError(getLabel('กรุณากรอกรหัสผ่านเดิม', 'Please enter your current password.'));
      return;
    }

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(getLabel(
        `รหัสผ่านใหม่ต้องมีอย่างน้อย ${MIN_PASSWORD_LENGTH} ตัวอักษร`,
        `New password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      ));
      return;
    }

    if (!isEnglishAlphanumericPassword(newPassword)) {
      setError(alphanumericOnlyMessage);
      return;
    }

    if (newPassword === currentPassword) {
      setError(getLabel(
        'รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านเดิม',
        'New password must be different from the current password.',
      ));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(getLabel('การยืนยันรหัสผ่านใหม่ไม่ตรงกัน', 'New password confirmation does not match.'));
      return;
    }

    setError('');
    setIsSaving(true);
    try {
      await onSave(currentPassword, newPassword);
    } catch (err) {
      setError(err instanceof Error ? err.message : getLabel('ไม่สามารถเปลี่ยนรหัสผ่านได้', 'Failed to change password.'));
    } finally {
      setIsSaving(false);
    }
  };

  const fieldClass = `h-11 w-full rounded-md border text-sm outline-none transition-all focus:ring-2 ${
    darkMode
      ? 'border-slate-700 bg-slate-800 text-slate-100 placeholder-slate-500 focus:border-sky-500 focus:ring-sky-500/20'
      : 'border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:ring-sky-500/20'
  }`;
  const labelClass = `mb-1.5 block text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`;
  const leadingIconClass = `pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 ${
    darkMode ? 'text-slate-500' : 'text-slate-400'
  }`;

  const renderPasswordToggle = (
    isVisible: boolean,
    setIsVisible: (value: boolean) => void,
  ) => (
    <button
      type="button"
      onClick={() => setIsVisible(!isVisible)}
      disabled={isSaving}
      title={isVisible ? getLabel('ซ่อนรหัสผ่าน', 'Hide password') : getLabel('แสดงรหัสผ่าน', 'Show password')}
      aria-label={isVisible ? getLabel('ซ่อนรหัสผ่าน', 'Hide password') : getLabel('แสดงรหัสผ่าน', 'Show password')}
      className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
        darkMode ? 'text-slate-400 hover:bg-slate-700 hover:text-slate-200' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
      }`}
    >
      {isVisible ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
    </button>
  );

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200 ${
        darkMode ? 'bg-slate-950/80' : 'bg-slate-900/50'
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="change-password-title"
    >
      <form
        onSubmit={handleSubmit}
        className={`flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border shadow-2xl animate-in zoom-in-95 duration-200 ${
          darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'
        }`}
      >
        {/* Header */}
        <div className={`flex shrink-0 items-center justify-between gap-4 border-b px-6 py-5 ${
          darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'
        }`}>
          <div className="flex min-w-0 items-center gap-4">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
              darkMode ? 'bg-sky-500/15 text-sky-300' : 'bg-sky-50 text-sky-600'
            }`}>
              <KeyRound className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h2 id="change-password-title" className={`text-xl font-bold leading-tight ${darkMode ? 'text-white' : 'text-slate-950'}`}>
                {t.changePassword}
              </h2>
              <p className={`mt-1 truncate text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{username}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            aria-label={t.cancel}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
              darkMode ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className={`flex-1 space-y-4 overflow-y-auto px-6 py-5 ${darkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
          {/* Username (read-only) */}
          <div>
            <label htmlFor="cp-username" className={labelClass}>{t.username}</label>
            <div className="relative">
              <User className={leadingIconClass} />
              <input
                id="cp-username"
                type="text"
                value={username}
                readOnly
                autoComplete="username"
                className={`h-11 w-full rounded-md border pl-11 pr-3.5 text-sm outline-none ${
                  darkMode ? 'border-slate-700 bg-slate-800/70 text-slate-300' : 'border-slate-200 bg-slate-100 text-slate-600'
                }`}
              />
            </div>
          </div>

          {/* Current password */}
          <div>
            <label htmlFor="cp-current" className={labelClass}>{t.currentPassword}</label>
            <div className="relative">
              <Lock className={leadingIconClass} />
              <input
                id="cp-current"
                name="current-password"
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                autoComplete="current-password"
                disabled={isSaving}
                onChange={(event) => {
                  setCurrentPassword(event.target.value);
                  setError('');
                }}
                className={`${fieldClass} pl-11 pr-11`}
              />
              {renderPasswordToggle(showCurrentPassword, setShowCurrentPassword)}
            </div>
          </div>

          {/* New password */}
          <div>
            <label htmlFor="cp-new" className={labelClass}>{t.newPassword}</label>
            <div className="relative">
              <Lock className={leadingIconClass} />
              <input
                id="cp-new"
                name="new-password"
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                autoComplete="new-password"
                disabled={isSaving}
                pattern="[A-Za-z0-9]+"
                title={alphanumericOnlyMessage}
                onChange={handleSanitizedInput(setNewPassword)}
                className={`${fieldClass} pl-11 pr-11`}
              />
              {renderPasswordToggle(showNewPassword, setShowNewPassword)}
            </div>
            <p className={`mt-1.5 text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              {getLabel(
                `อย่างน้อย ${MIN_PASSWORD_LENGTH} ตัวอักษร ใช้ได้เฉพาะ A-Z, a-z, 0-9`,
                `At least ${MIN_PASSWORD_LENGTH} characters, using A-Z, a-z, 0-9 only`,
              )}
            </p>
          </div>

          {/* Confirm new password */}
          <div>
            <label htmlFor="cp-confirm" className={labelClass}>{t.confirmPassword}</label>
            <div className="relative">
              <Lock className={leadingIconClass} />
              <input
                id="cp-confirm"
                name="confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                autoComplete="new-password"
                disabled={isSaving}
                pattern="[A-Za-z0-9]+"
                title={alphanumericOnlyMessage}
                onChange={handleSanitizedInput(setConfirmPassword)}
                className={`${fieldClass} pl-11 pr-11`}
              />
              {renderPasswordToggle(showConfirmPassword, setShowConfirmPassword)}
            </div>
          </div>

          {error && (
            <div className={`flex items-start gap-2 rounded-md border px-3.5 py-2.5 text-sm ${
              darkMode ? 'border-red-900/60 bg-red-950/40 text-red-200' : 'border-red-200 bg-red-50 text-red-700'
            }`}>
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`flex shrink-0 items-center justify-end gap-2 border-t px-6 py-3.5 ${
          darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'
        }`}>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className={`inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
              darkMode ? 'bg-slate-800 text-slate-100 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <X className="h-4 w-4" />
            <span>{t.cancel}</span>
          </button>

          <button
            type="submit"
            disabled={isSaving}
            className={`inline-flex h-9 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold text-white transition-colors ${
              isSaving ? 'cursor-not-allowed bg-slate-400 opacity-70' : 'cursor-pointer bg-emerald-600 hover:bg-emerald-500'
            }`}
          >
            <Save className="h-4 w-4" />
            <span>{isSaving ? getLabel('กำลังบันทึก...', 'Saving...') : t.savePassword}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
