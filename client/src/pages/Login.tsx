import { useState } from 'react';
import { Camera, Eye, EyeOff, AlertCircle, Globe, Sun, Moon, KeyRound, X, Loader2 } from 'lucide-react';
import { loginTranslations, type Language } from '../locales/loginTranslations'; 
import { useAuth } from '../contexts/useAuth';

interface LoginProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  darkMode: boolean;
  setDarkMode: (mode: boolean) => void;
}

export function Login({ language, setLanguage, darkMode, setDarkMode }: LoginProps) {
  const t = loginTranslations[language];
  const { login } = useAuth();
  
  // State สำหรับหน้า Login หลัก
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<'invalid' | 'disabled' | 'server' | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // State สำหรับ Modal ลืมรหัสผ่าน
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [resetUsername, setResetUsername] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!username || !password) { setError('invalid'); return; }
    
    setIsLoading(true);
    setError(null);
    
    const result = await login(username, password);
    
    setIsLoading(false);
    
    if (!result.success) {
      if (result.error === 'account_disabled') {
        setError('disabled');
      } else if (result.error === 'invalid_credentials') {
        setError('invalid');
      } else {
        setError('server');
      }
    }
  };

  const handleResetPassword = () => {
    console.log('Password reset:', { resetUsername, resetNewPassword, resetConfirmPassword });
    setShowForgotPasswordModal(false);
    setResetUsername('');
    setResetNewPassword('');
    setResetConfirmPassword('');
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 relative ${
      darkMode ? 'bg-linear-to-br from-gray-900 via-gray-800 to-gray-900' : 'bg-linear-to-br from-[#0c274b] via-[#0c274b] to-[#1a3a5c]'
    }`}>
      {/* Language & Dark Mode Toggle - Login */}
      <div className="absolute top-4 right-4 flex gap-2 z-50">
        <button
          onClick={() => setLanguage(language === 'th' ? 'en' : 'th')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all cursor-pointer ${
            darkMode 
              ? 'bg-gray-700 text-white hover:bg-gray-600' 
              : 'bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span className="font-semibold">{language === 'th' ? 'TH' : 'EN'}</span>
        </button>
        <button
          onClick={() => setDarkMode(!darkMode)}
          className={`p-2 rounded-xl transition-all cursor-pointer ${
            darkMode 
              ? 'bg-gray-700 text-yellow-400 hover:bg-gray-600' 
              : 'bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm'
          }`}
        >
          {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>

      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#fcd500] rounded-full opacity-10 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#fed300] rounded-full opacity-10 blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md">
        <div className={`rounded-3xl shadow-2xl p-8 md:p-12 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="flex justify-center mb-6">
            <div className="w-32 h-32 bg-linear-to-br from-[#0c274b] to-blue-800 rounded-2xl flex items-center justify-center shadow-lg">
              <Camera className="w-20 h-20 text-white" />
            </div>
          </div>

          <div className="text-center mb-8">
            <h1 className={`text-2xl md:text-3xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-[#0c274b]'}`}>
              {t.appName}
            </h1>
            <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {t.appSubtitle}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="username" className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-[#0c274b]'}`}>
                {t.username}
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError(null);
                }}
                className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:border-[#fcd500] transition-colors ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder:text-gray-400' 
                    : 'bg-white border-gray-200 text-[#0c274b] placeholder:text-gray-400'
                }`}
                placeholder={t.usernamePlaceholder}
              />
            </div>

            <div>
              <label htmlFor="password" className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-[#0c274b]'}`}>
                {t.password}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(null);
                  }}
                  className={`w-full px-4 py-3 pr-12 border-2 rounded-xl focus:outline-none focus:border-[#fcd500] transition-colors ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder:text-gray-400' 
                      : 'bg-white border-gray-200 text-[#0c274b] placeholder:text-gray-400'
                  }`}
                  placeholder={t.passwordPlaceholder}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors cursor-pointer ${
                    darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-[#0c274b]'
                  }`}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className={`border rounded-xl p-4 ${
                darkMode ? 'bg-red-900/30 border-red-500/70' : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className={`text-sm font-medium mb-1 ${darkMode ? 'text-red-300' : 'text-red-800'}`}>
                      {t.errorTitle}
                    </p>
                    <ul className={`text-sm space-y-1 ${darkMode ? 'text-red-400' : 'text-red-700'}`}>
                      {error === 'invalid' && <li>{t.errorInvalid}</li>}
                      {error === 'disabled' && <li>{t.errorDisabled}</li>}
                      {error === 'server' && <li>{t.errorServer}</li>}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-linear-to-br from-[#0c274b] to-blue-800 text-white font-semibold py-3.5 rounded-xl hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 hover:from-[#0a1f3a] hover:to-blue-900 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
            >
              {isLoading && <Loader2 className="w-5 h-5 animate-spin" />}
              {isLoading ? (language === 'th' ? 'กำลังเข้าสู่ระบบ...' : 'Logging in...') : t.login}
            </button>

            {/* <div className="text-center">
              <button
                type="button"
                className={`text-sm transition-colors font-medium cursor-pointer ${
                  darkMode ? 'text-gray-400 hover:text-[#fcd500]' : 'text-[#0c274b] hover:text-[#fcd500]'
                }`}
                onClick={(e) => {
                  e.preventDefault();
                  setShowForgotPasswordModal(true);
                }}
              >
                {t.forgotPassword}
              </button>
            </div> */}
          </form>
        </div>

        <div className="text-center mt-6">
          <p className="text-white text-sm opacity-80">
            {t.copyright}
          </p>
        </div>
      </div>

      {/* Forgot Password Modal - Login Page */}
      {showForgotPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className={`w-full max-w-md flex flex-col rounded-2xl shadow-2xl overflow-hidden ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
            {/* Header */}
            <div className="bg-linear-to-r from-[#0c274b] to-[#0a1f3a] px-6 py-4 shrink-0 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <KeyRound className="w-6 h-6" />
                {t.resetPasswordTitle}
              </h2>
              <button
                onClick={() => setShowForgotPasswordModal(false)}
                className="text-white/80 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className={`p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <div className="space-y-4">
                {/* Info Message */}
                <div className={`p-3 rounded-lg ${darkMode ? 'bg-blue-500/10 border border-blue-500/30' : 'bg-blue-50 border border-blue-200'}`}>
                  <p className={`text-sm ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                    {t.resetPasswordMessage}
                  </p>
                </div>

                {/* Username */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {t.usernameOrEmail}
                  </label>
                  <input
                    type="text"
                    value={resetUsername}
                    onChange={(e) => setResetUsername(e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-lg border ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-[#fcd500]' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-[#0c274b]'
                    } focus:outline-none focus:ring-2 focus:ring-[#fcd500]/50 transition-all`}
                    placeholder={t.usernamePlaceholder}
                  />
                </div>

                {/* New Password */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {t.newPassword}
                  </label>
                  <input
                    type="password"
                    value={resetNewPassword}
                    onChange={(e) => setResetNewPassword(e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-lg border ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-[#fcd500]' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-[#0c274b]'
                    } focus:outline-none focus:ring-2 focus:ring-[#fcd500]/50 transition-all`}
                    placeholder={t.newPassword}
                  />
                </div>

                {/* Confirm Password */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {t.confirmPassword}
                  </label>
                  <input
                    type="password"
                    value={resetConfirmPassword}
                    onChange={(e) => setResetConfirmPassword(e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-lg border ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-[#fcd500]' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-[#0c274b]'
                    } focus:outline-none focus:ring-2 focus:ring-[#fcd500]/50 transition-all`}
                    placeholder={t.confirmPassword}
                  />
                </div>

                {/* Buttons */}
                <div className="flex gap-3 justify-center pt-4">
                  <button
                    onClick={() => {
                      setShowForgotPasswordModal(false);
                      setResetUsername('');
                      setResetNewPassword('');
                      setResetConfirmPassword('');
                    }}
                    className="px-8 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-all font-medium shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                    <span>{t.cancel}</span>
                  </button>
                  <button
                    onClick={handleResetPassword}
                    className="px-8 py-3 bg-linear-to-r from-[#0c274b] to-[#0a1f3a] hover:from-[#0c274b]/90 hover:to-[#0a1f3a]/90 text-white rounded-lg transition-all font-bold shadow-md hover:shadow-lg hover:scale-105 flex items-center gap-2 cursor-pointer"
                  >
                    <KeyRound className="w-5 h-5" />
                    <span>{t.resetPassword}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
