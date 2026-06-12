import { useEffect, useState } from 'react';
import { Eye, EyeOff, KeyRound, Save, X } from 'lucide-react';
import type { UserSqlData } from '../../features/users/types';
import type { UserTranslationData } from '../../locales/userTranslations';
import {
  hasDisallowedCredentialCharacters,
  isEnglishAlphanumericPassword,
  sanitizeEnglishAlphanumericCredential,
} from '../../lib/userValidation';

interface ResetPasswordModalProps {
  user: UserSqlData;
  darkMode: boolean;
  translations: UserTranslationData;
  onClose: () => void;
  onSave: (password: string) => void | Promise<void>;
}

export function ResetPasswordModal({
  user,
  darkMode,
  translations,
  onClose,
  onSave,
}: ResetPasswordModalProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Validation: Check if form is valid for save button
  const trimmedPassword = password.trim();
  const trimmedConfirmPassword = confirmPassword.trim();
  const hasValidLength = trimmedPassword.length >= 6;
  const hasValidFormat = isEnglishAlphanumericPassword(trimmedPassword);
  // passwordsMatch is used implicitly via showMismatchWarning
  const showMismatchWarning = trimmedConfirmPassword.length > 0 && trimmedPassword !== trimmedConfirmPassword;
  const showLengthWarning = trimmedPassword.length > 0 && trimmedPassword.length < 6;
  
  const isFormValid = hasValidLength && hasValidFormat && !showMismatchWarning && trimmedConfirmPassword.length > 0 && !error;

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
    const nextPassword = password.trim();

    if (nextPassword.length < 6) {
      setError(translations.passwordMinLength);
      return;
    }

    if (!isEnglishAlphanumericPassword(nextPassword)) {
      setError(translations.passwordFormatError);
      return;
    }

    if (nextPassword !== confirmPassword.trim()) {
      setError(translations.passwordMismatch);
      return;
    }

    setError('');
    setIsSaving(true);
    try {
      await onSave(nextPassword);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 backdrop-blur-sm p-4 animate-fadeIn">
      <div className={`w-full max-w-lg rounded-lg border shadow-2xl overflow-hidden transform transition-all duration-300 animate-slideUp ${darkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'}`}>
        <div className={`relative border-b px-8 py-6 ${darkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-100 bg-white'}`}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`rounded-md p-3 ${darkMode ? 'bg-emerald-500/15 text-emerald-300' : 'bg-emerald-50 text-emerald-600'}`}>
                <KeyRound className="w-8 h-8" />
              </div>
              <div>
                <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-950'}`}>
                  {translations.resetPassword}
                </h2>
                <p className={`text-sm mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{user.username}</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className={`cursor-pointer rounded-md p-2.5 transition-colors ${darkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'}`}
              disabled={isSaving}
            >
              <X className="w-7 h-7 group-hover:rotate-90 transition-transform duration-300" />
            </button>
          </div>
        </div>

        <div className={`p-8 space-y-5 ${darkMode ? 'bg-slate-900' : 'bg-white'}`}>
          <p className={`text-sm leading-relaxed ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
            {translations.resetPasswordMessage}
          </p>

          <div className="space-y-2">
            <label className={`block font-semibold text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              {translations.newPassword}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                pattern="[A-Za-z0-9]+"
                title={translations.passwordFormatError}
                onChange={(e) => {
                  const rawPassword = e.target.value;
                  setPassword(sanitizeEnglishAlphanumericCredential(rawPassword));
                  setError(
                    hasDisallowedCredentialCharacters(rawPassword) ? translations.passwordFormatError : ''
                  );
                }}
                className={`w-full px-4 py-3 pr-12 border rounded-md transition-colors outline-none focus:border-emerald-500 ${darkMode ? 'border-slate-700 bg-slate-800 text-slate-100 placeholder-slate-500' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                disabled={isSaving}
                title={showPassword ? translations.hidePassword : translations.showPassword}
                aria-label={showPassword ? translations.hidePassword : translations.showPassword}
                className={`absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${darkMode ? 'text-slate-300 hover:bg-slate-700 hover:text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className={`block font-semibold text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              {translations.confirmPassword}
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                pattern="[A-Za-z0-9]+"
                title={translations.passwordFormatError}
                onChange={(e) => {
                  const rawPassword = e.target.value;
                  setConfirmPassword(sanitizeEnglishAlphanumericCredential(rawPassword));
                  setError(
                    hasDisallowedCredentialCharacters(rawPassword) ? translations.passwordFormatError : ''
                  );
                }}
                className={`w-full px-4 py-3 pr-12 border rounded-md transition-colors outline-none focus:border-emerald-500 ${darkMode ? 'border-slate-700 bg-slate-800 text-slate-100 placeholder-slate-500' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'}`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((value) => !value)}
                disabled={isSaving}
                title={showConfirmPassword ? translations.hidePassword : translations.showPassword}
                aria-label={showConfirmPassword ? translations.hidePassword : translations.showPassword}
                className={`absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${darkMode ? 'text-slate-300 hover:bg-slate-700 hover:text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`}
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {error && (
            <div className={`rounded-md border px-4 py-3 text-sm ${darkMode ? 'border-rose-800/60 bg-rose-950/40 text-rose-300' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
              {error}
            </div>
          )}

          {showMismatchWarning && !error && (
            <div className={`rounded-md border px-4 py-3 text-sm ${darkMode ? 'border-amber-800/60 bg-amber-950/40 text-amber-300' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
              {translations.passwordMismatch}
            </div>
          )}

          {showLengthWarning && !error && !showMismatchWarning && (
            <div className={`rounded-md border px-4 py-3 text-sm ${darkMode ? 'border-amber-800/60 bg-amber-950/40 text-amber-300' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
              {translations.passwordMinLength}
            </div>
          )}
        </div>

        <div className={`px-8 py-6 border-t flex items-center justify-end gap-3 ${darkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-100 bg-white'}`}>
          <button
            onClick={onClose}
            disabled={isSaving}
            className={`px-8 py-3 rounded-md font-bold transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed border ${darkMode ? 'border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-700' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
          >
            {translations.cancel}
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving || !isFormValid}
            className={`px-8 py-3 text-white rounded-md font-bold transition-colors flex items-center gap-2 ${isSaving || !isFormValid ? 'bg-slate-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 cursor-pointer'}`}
          >
            <Save className="w-5 h-5" />
            {isSaving ? translations.saving : translations.save}
          </button>
        </div>
      </div>
    </div>
  );
}
