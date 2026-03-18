import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Eye, EyeOff, KeyRound, Mail } from 'lucide-react';
import { api } from '../utils/api';
import { getShadowColor } from '../utils/colorUtils';

export const ResetPasswordScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [branding, setBranding] = useState<{
    logo: string | null;
    login_background: string | null;
    login_title: string;
    login_footer: string;
    login_button_color: string;
    login_form_bg_color: string;
    enable_registration: string;
    login_title_color: string;
    login_footer_color: string;
    login_form_bg_opacity: number;
    login_bg_opacity: number;
    login_glass_effect: string;
    login_form_text_color: string;
  }>({
    logo: null,
    login_background: null,
    login_title: 'Agregator & Publishing Musik',
    login_footer: 'Protected CMS Area. Authorized personnel only.',
    login_button_color: 'linear-gradient(to right, #2563eb, #0891b2)',
    login_form_bg_color: '#ffffff',
    enable_registration: 'true',
    login_title_color: '#1e293b',
    login_footer_color: '#94a3b8',
    login_form_bg_opacity: 90,
    login_bg_opacity: 100,
    login_glass_effect: 'false',
    login_form_text_color: '#334155'
  });

  useEffect(() => {
    fetch('/api/settings/branding')
      .then((res) => res.json())
      .then((data) => setBranding((prev) => ({ ...prev, ...(data || {}) })))
      .catch(() => {});
  }, []);

  const qs = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const initialEmail = (qs.get('email') || '').trim();
  const initialToken = (qs.get('token') || '').trim();
  const hideEmailToken = Boolean(initialEmail || initialToken);

  const [email, setEmail] = useState(initialEmail);
  const [token, setToken] = useState(initialToken);
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setSuccess(null);
    const e = String(email || '').trim().toLowerCase();
    const t = String(token || '').trim();
    if (!e || !t) {
      setError('Link reset tidak lengkap. Pastikan email dan token tersedia.');
      return;
    }
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
    if (!emailOk) {
      setError('Format email tidak valid.');
      return;
    }
    const pwd = password || '';
    const strong = pwd.length >= 8 && /[A-Z]/.test(pwd) && /[a-z]/.test(pwd) && /[0-9]/.test(pwd) && /[^A-Za-z0-9]/.test(pwd);
    if (!strong) {
      setError('Password kurang kuat. Gunakan ≥8 char, huruf besar, kecil, angka, simbol.');
      return;
    }
    if (password !== password2) {
      setError('Password dan konfirmasi tidak sama.');
      return;
    }
    try {
      setLoading(true);
      await api.resetPassword({ email: e, token: t, password: pwd });
      setSuccess('Password berhasil direset. Silakan login dengan password baru.');
    } catch (err: any) {
      setError(err?.message || 'Gagal reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 relative overflow-hidden">
      <div
        className="absolute inset-0 z-0 bg-cover bg-center transition-opacity duration-500 bg-gradient-to-br from-blue-50 via-white to-blue-100"
        style={{
          backgroundImage: branding.login_background ? `url(${branding.login_background})` : undefined,
          opacity: (branding.login_bg_opacity ?? 100) / 100
        }}
      />

      <div
        className={`w-full max-w-sm rounded-2xl px-6 pb-6 pt-6 md:px-8 md:pb-8 md:pt-8 animate-fade-in-up relative z-10 ${
          branding.login_glass_effect !== 'true' ? 'backdrop-blur-sm shadow-2xl shadow-blue-900/10 border border-white/50' : ''
        }`}
        style={
          branding.login_glass_effect === 'true'
            ? {
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: `0 8px 32px 0 ${getShadowColor(branding.login_button_color)}`
              }
            : undefined
        }
      >
        {branding.login_glass_effect !== 'true' && (
          <div
            className="absolute inset-0 rounded-2xl -z-10 transition-opacity duration-300"
            style={{
              background: branding.login_form_bg_color,
              opacity: (branding.login_form_bg_opacity ?? 90) / 100
            }}
          />
        )}

        <div className="flex flex-col items-center mb-4">
          <div className="px-4 py-1 rounded-xl">
            <h2 className="text-xl font-bold tracking-wide text-center" style={{ color: branding.login_title_color }}>
              Reset Password
            </h2>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 text-xs p-3 rounded-lg flex items-start gap-2 border border-red-100 mb-3">
            <AlertCircle size={16} className="mt-0.5" />
            <div>{error}</div>
          </div>
        )}
        {success && (
          <div className="bg-green-50 text-green-700 text-xs p-3 rounded-lg flex items-start gap-2 border border-green-100 mb-3">
            <CheckCircle2 size={16} className="mt-0.5" />
            <div>{success}</div>
          </div>
        )}

        <div className="space-y-3">
          {!hideEmailToken && (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-bold ml-1" style={{ color: branding.login_form_text_color || '#334155' }}>
                  Email
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                    <Mail size={16} />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50/10 border border-slate-200/50 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all font-normal text-xs text-slate-700 placeholder:text-slate-400 backdrop-blur-sm"
                    style={{ color: branding.login_form_text_color || '#334155' }}
                    placeholder="Email terdaftar"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold ml-1" style={{ color: branding.login_form_text_color || '#334155' }}>
                  Token
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                    <KeyRound size={16} />
                  </div>
                  <input
                    type="text"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50/10 border border-slate-200/50 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all font-normal text-xs text-slate-700 placeholder:text-slate-400 backdrop-blur-sm"
                    style={{ color: branding.login_form_text_color || '#334155' }}
                    placeholder="Token reset"
                  />
                </div>
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold ml-1" style={{ color: branding.login_form_text_color || '#334155' }}>
              Password Baru
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                <KeyRound size={16} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-10 py-2.5 bg-slate-50/10 border border-slate-200/50 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all font-normal text-xs text-slate-700 placeholder:text-slate-400 backdrop-blur-sm"
                style={{ color: branding.login_form_text_color || '#334155' }}
                placeholder="Masukkan password baru"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold ml-1" style={{ color: branding.login_form_text_color || '#334155' }}>
              Konfirmasi Password Baru
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                <KeyRound size={16} />
              </div>
              <input
                type={showPassword2 ? 'text' : 'password'}
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                className="w-full pl-9 pr-10 py-2.5 bg-slate-50/10 border border-slate-200/50 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all font-normal text-xs text-slate-700 placeholder:text-slate-400 backdrop-blur-sm"
                style={{ color: branding.login_form_text_color || '#334155' }}
                placeholder="Ulangi password baru"
              />
              <button
                type="button"
                onClick={() => setShowPassword2((v) => !v)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword2 ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={submit}
            className={`w-full py-3 rounded-lg font-medium text-white shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all transform active:scale-95 text-xs ${
              loading ? 'bg-slate-300 cursor-not-allowed' : 'hover:brightness-110 hover:-translate-y-1'
            }`}
            style={{ background: loading ? undefined : branding.login_button_color, opacity: 1 }}
          >
            {loading ? 'Memproses...' : 'Reset Password'}
          </button>

          <button
            type="button"
            onClick={() => navigate('/login')}
            className="w-full py-3 rounded-lg font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 shadow-sm transition-all transform active:scale-95 text-[12px]"
          >
            Kembali ke Login
          </button>
        </div>

        <div className="mt-6 text-center space-y-3">
          <p className="text-[10px]" style={{ color: branding.login_footer_color }}>
            {branding.login_footer}
          </p>
        </div>
      </div>
    </div>
  );
};
