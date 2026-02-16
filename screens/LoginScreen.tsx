
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Music4, User, Lock, ArrowRight, AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';

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

  // register mode removed

  // register mode removed

  // register mode removed

  // register mode removed

  // register mode removed

  // register mode removed

  const [statusModalStatus, setStatusModalStatus] = useState<string | null>(null);
  const [statusModalUser, setStatusModalUser] = useState<string | null>(null);

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
      <div className="text-center mb-10">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-blue-500/30">
          <Music4 size={32} />
        </div>
        
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Dimensi Suara CMS</h1>
        <p className="text-slate-500 text-sm mt-1">Sign in to manage your music distribution</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-6">
        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-4 rounded-xl flex items-center gap-2 border border-red-100 animate-pulse">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700 ml-1">Username</label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
              <User size={18} />
            </div>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium text-slate-700 placeholder:text-slate-400"
              placeholder="Enter username"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700 ml-1">Password</label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
              <Lock size={18} />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-11 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium text-slate-700 placeholder:text-slate-400"
              placeholder="Enter password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={`w-full py-4 rounded-xl font-bold text-white shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all transform active:scale-95
            ${isLoading 
              ? 'bg-slate-300 cursor-not-allowed' 
              : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:brightness-110 hover:-translate-y-1'
            }`}
        >
          {isLoading ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              Signing In...
            </>
          ) : (
            <>
              Sign In
              <ArrowRight size={20} />
            </>
          )}
        </button>
      </form>

      <div className="mt-8 text-center space-y-3">
        <p className="text-xs text-slate-400">
          Protected CMS Area. Authorized personnel only.
        </p>
        <button
          type="button"
          onClick={() => navigate('/register')}
          className="text-xs font-semibold text-blue-600 hover:text-blue-700"
        >
          Belum punya akun? Daftar di sini
        </button>
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-100 p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl shadow-blue-900/10 border border-white p-8 md:p-10 animate-fade-in-up">
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
