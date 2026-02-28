
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Music4, User, Lock, ArrowRight, AlertCircle, Eye, EyeOff, Loader2, Mail } from 'lucide-react';

import { api } from '../utils/api';
// register mode removed

interface Props {
  onLogin: (user: any, token: string) => void;
}

export const LoginScreen: React.FC<Props> = ({ onLogin }) => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [dbStatus, setDbStatus] = useState<'connected' | 'disconnected' | 'unknown'>('unknown');

  useEffect(() => {
    const checkHealth = async () => {
      try {
        // Use relative path to leverage Vite proxy
        const res = await fetch('/api/health');
        if (res.ok) {
            const data = await res.json();
            setServerStatus(data.status === 'online' ? 'online' : 'offline');
            setDbStatus(data.database);
        } else {
            setServerStatus('offline');
            setDbStatus('unknown');
        }
      } catch (e) {
        setServerStatus('offline');
        setDbStatus('unknown');
      }
    };
    
    checkHealth();
    const interval = setInterval(checkHealth, 10000); // Check every 10s
    return () => clearInterval(interval);
  }, []);

  // register mode removed

  // register mode removed

  // register mode removed

  // register mode removed

  // register mode removed

  // register mode removed

  const [statusModalStatus, setStatusModalStatus] = useState<string | null>(null);
  const [statusModalUser, setStatusModalUser] = useState<string | null>(null);

  // Branding State
  const [branding, setBranding] = useState<{logo: string | null, login_background: string | null}>({
      logo: null,
      login_background: null
  });

  useEffect(() => {
      // Fetch branding
      fetch('/api/settings/branding')
          .then(res => res.json())
          .then(data => setBranding(data))
          .catch(err => console.error("Failed to fetch branding:", err));
  }, []);

  // register mode removed

  // register mode removed

  // register mode removed

  useEffect(() => {}, []);

  // register mode removed

  // register mode removed

  // register mode removed

  // register mode removed

  // register mode removed

  // register mode removed

  // register mode removed

  // register mode removed

  // register mode removed

  // register mode removed

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const data = await api.login(username, password);
      const user = data.user;
      const status = ((user.status as string) || '').toLowerCase();
      if (user.role === 'User' && status && !['approved', 'active'].includes(status)) {
        setStatusModalUser(user.username || username);
        setStatusModalStatus(user.status || 'Pending');
        setIsLoading(false);
        return;
      }
      onLogin(user, data.token);
      navigate('/');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Login gagal. Pastikan server berjalan.');
      setIsLoading(false);
    }
  };

  // register mode removed

  // register mode removed

  // register mode removed

  // register mode removed

  // register mode removed

  // register mode removed

  // register mode removed

  const renderLogin = () => (
    <>
      <div className="text-center mb-6">
        {branding.logo ? (
            <img src={branding.logo} alt="Logo" className="h-32 object-contain mx-auto mb-3" />
        ) : (
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-xl flex items-center justify-center text-white mx-auto mb-3 shadow-lg shadow-blue-500/30">
                <Music4 size={24} />
            </div>
        )}
        
        <h1 className="text-xl font-bold text-slate-800 tracking-tight">Dimensi Suara CMS</h1>
        <p className="text-slate-500 text-xs mt-1">Sign in to manage your music distribution</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        {error && (
          <div className="bg-red-50 text-red-600 text-xs p-3 rounded-lg flex items-center gap-2 border border-red-100 animate-pulse">
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-700 ml-1">Email</label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
              <Mail size={16} />
            </div>
            <input
              type="email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all font-normal text-xs text-slate-700 placeholder:text-slate-400"
              placeholder="Enter email"
              required
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-700 ml-1">Password</label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
              <Lock size={16} />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all font-normal text-xs text-slate-700 placeholder:text-slate-400"
              placeholder="Enter password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={`w-full py-3 rounded-lg font-medium text-white shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all transform active:scale-95 text-xs
            ${isLoading 
              ? 'bg-slate-300 cursor-not-allowed' 
              : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:brightness-110 hover:-translate-y-1'
            }`}
        >
          {isLoading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Signing In...
            </>
          ) : (
            <>
              Sign In
              <ArrowRight size={16} />
            </>
          )}
        </button>

        <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink-0 mx-4 text-slate-400 text-[10px]">ATAU</span>
            <div className="flex-grow border-t border-slate-200"></div>
        </div>

        <button
          type="button"
          onClick={() => navigate('/register')}
          className="w-full py-3 rounded-lg font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 shadow-sm flex items-center justify-center gap-2 transition-all transform active:scale-95 text-xs"
        >
          Belum punya akun? Daftar di sini
        </button>
      </form>

      <div className="mt-6 text-center space-y-3">
        <div className="flex justify-center gap-3 text-[10px] font-medium bg-slate-100 py-1.5 rounded-md mb-2">
            <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${serverStatus === 'online' ? 'bg-green-500 animate-pulse' : serverStatus === 'checking' ? 'bg-yellow-500' : 'bg-red-500'}`} />
                <span className={`${serverStatus === 'online' ? 'text-green-700' : 'text-slate-500'}`}>
                    Server: {serverStatus === 'checking' ? 'Checking...' : serverStatus.toUpperCase()}
                </span>
            </div>
            {serverStatus === 'online' && (
                 <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${dbStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className={`${dbStatus === 'connected' ? 'text-green-700' : 'text-red-500'}`}>
                        DB: {dbStatus === 'connected' ? 'CONNECTED' : 'DISCONNECTED'}
                    </span>
                </div>
            )}
        </div>
        <p className="text-[10px] text-slate-400">
          Protected CMS Area. Authorized personnel only.
        </p>
      </div>
    </>
  );

  // register mode removed

  // register mode removed

  // register mode removed

  // register mode removed

  // register mode removed

  // register mode removed

  // register mode removed

  // register mode removed

  // register mode removed

  return (
    <div 
        className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-100 p-4 bg-cover bg-center"
        style={branding.login_background ? { backgroundImage: `url(${branding.login_background})` } : {}}
    >
      <div className="w-full max-w-sm bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl shadow-blue-900/10 border border-white/50 p-6 md:p-8 animate-fade-in-up">
        {renderLogin()}
      </div>

      {statusModalStatus && statusModalUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3">
              <AlertCircle size={24} className="text-amber-500" />
              <div>
                <p className="text-sm font-semibold text-slate-800">Status Akun Belum Approved</p>
                <p className="text-xs text-slate-500 mt-1">
                  Hi {statusModalUser}, saat ini status akun kamu adalah{' '}
                  <span className="font-semibold">{statusModalStatus}</span>. Kamu belum bisa login ke CMS
                  sampai status berubah menjadi Approved.
                </p>
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <button
                type="button"
                onClick={() => {
                  setStatusModalStatus(null);
                  setStatusModalUser(null);
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700"
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}

      
    </div>
  );
};
