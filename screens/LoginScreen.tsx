
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Music4, User, Lock, ArrowRight, AlertCircle, Eye, EyeOff, Loader2, Building2, ChevronLeft, CheckCircle2 } from 'lucide-react';

import { api } from '../utils/api';
import { COUNTRIES_WITH_DIAL_CODES } from '../constants';

interface Props {
  onLogin: (user: any, token: string) => void;
  initialMode?: 'login' | 'register';
}

export const LoginScreen: React.FC<Props> = ({ onLogin, initialMode = 'login' }) => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [accountType, setAccountType] = useState<'PERSONAL' | 'COMPANY' | null>(null);
  const [step, setStep] = useState(1);

  const [companyName, setCompanyName] = useState('');
  const [nik, setNik] = useState('');
  const [fullName, setFullName] = useState('');
  const [address, setAddress] = useState('');
  const [country, setCountry] = useState('');
  const [province, setProvince] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [subdistrict, setSubdistrict] = useState('');
  const [postalCode, setPostalCode] = useState('');

  const [regEmail, setRegEmail] = useState('');
  const [regPhoneLocal, setRegPhoneLocal] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPasswordConfirm, setRegPasswordConfirm] = useState('');
  const [picName, setPicName] = useState('');
  const [picPosition, setPicPosition] = useState('');
  const [picPhoneLocal, setPicPhoneLocal] = useState('');

  const [ktpFile, setKtpFile] = useState<File | null>(null);
  const [npwpFile, setNpwpFile] = useState<File | null>(null);
  const [nibFile, setNibFile] = useState<File | null>(null);
  const [kemenkumhamFile, setKemenkumhamFile] = useState<File | null>(null);

  const [docPaths, setDocPaths] = useState({
    ktpDocPath: '',
    npwpDocPath: '',
    nibDocPath: '',
    kemenkumhamDocPath: ''
  });

  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [docError, setDocError] = useState('');
  const [docPreviews, setDocPreviews] = useState<{ ktp?: string; npwp?: string; nib?: string; kemenkumham?: string }>({});

  const [statusModalStatus, setStatusModalStatus] = useState<string | null>(null);
  const [statusModalUser, setStatusModalUser] = useState<string | null>(null);

  const [cropField, setCropField] = useState<'ktp' | 'npwp' | 'nib' | 'kemenkumham' | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropImageUrl, setCropImageUrl] = useState<string | null>(null);
  const [cropScale, setCropScale] = useState(1);
  const [cropAngle, setCropAngle] = useState(0);
  const [cropTranslate, setCropTranslate] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [cropRect, setCropRect] = useState<{ x: number; y: number; w: number; h: number }>({ x: 128, y: 64, w: 256, h: 192 });
  const [cropDragMode, setCropDragMode] = useState<null | 'moveRect' | 'moveImage' | 'resize'>(null);
  const [cropDragStart, setCropDragStart] = useState<{ x: number; y: number; rect?: { x: number; y: number; w: number; h: number }; translate?: { x: number; y: number } } | null>(null);

  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  const [countries] = useState(COUNTRIES_WITH_DIAL_CODES);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  type WilayahItem = { code: string; name: string };

  const [provinces, setProvinces] = useState<WilayahItem[]>([]);
  const [regencies, setRegencies] = useState<WilayahItem[]>([]);
  const [districts, setDistricts] = useState<WilayahItem[]>([]);
  const [villages, setVillages] = useState<WilayahItem[]>([]);
  const [provinceCode, setProvinceCode] = useState('');
  const [regencyCode, setRegencyCode] = useState('');
  const [districtCode, setDistrictCode] = useState('');
  const [villageCode, setVillageCode] = useState('');
  const [wilayahError, setWilayahError] = useState('');
  const [isWilayahLoading, setIsWilayahLoading] = useState(false);
  const [isPostalLoading, setIsPostalLoading] = useState(false);

  const selectedCountryDialCode =
    countries.find((c) => c.name === country)?.dialCode || '';

  useEffect(() => {
    if (country !== 'Indonesia') {
      setProvinces([]);
      setRegencies([]);
      setDistricts([]);
      setVillages([]);
      setProvinceCode('');
      setRegencyCode('');
      setDistrictCode('');
      setVillageCode('');
      setWilayahError('');
      setIsWilayahLoading(false);
      return;
    }
    if (provinces.length > 0 || isWilayahLoading) return;
    const loadProvinces = async () => {
      try {
        setIsWilayahLoading(true);
        setWilayahError('');
        const res = await fetch('/api/wilayah/provinces');
        if (!res.ok) throw new Error('Failed to load provinces');
        const json = await res.json();
        const data = (json && json.data) || [];
        setProvinces(data);
      } catch (e: any) {
        setWilayahError('Gagal memuat data provinsi, silakan isi manual jika perlu.');
      } finally {
        setIsWilayahLoading(false);
      }
    };
    loadProvinces();
  }, [country, provinces.length, isWilayahLoading]);

  useEffect(() => {
    if (!provinceCode) {
      setRegencies([]);
      setDistricts([]);
      setVillages([]);
      setRegencyCode('');
      setDistrictCode('');
      setVillageCode('');
      return;
    }
    const loadRegencies = async () => {
      try {
        setIsWilayahLoading(true);
        setWilayahError('');
        const res = await fetch(`/api/wilayah/regencies/${provinceCode}`);
        if (!res.ok) throw new Error('Failed to load regencies');
        const json = await res.json();
        const data = (json && json.data) || [];
        setRegencies(data);
      } catch (e: any) {
        setWilayahError('Gagal memuat data kota/kabupaten, silakan isi manual jika perlu.');
      } finally {
        setIsWilayahLoading(false);
      }
    };
    loadRegencies();
  }, [provinceCode]);

  useEffect(() => {
    if (!regencyCode) {
      setDistricts([]);
      setVillages([]);
      setDistrictCode('');
      setVillageCode('');
      return;
    }
    const loadDistricts = async () => {
      try {
        setIsWilayahLoading(true);
        setWilayahError('');
        const res = await fetch(`/api/wilayah/districts/${regencyCode}`);
        if (!res.ok) throw new Error('Failed to load districts');
        const json = await res.json();
        const data = (json && json.data) || [];
        setDistricts(data);
      } catch (e: any) {
        setWilayahError('Gagal memuat data kecamatan, silakan isi manual jika perlu.');
      } finally {
        setIsWilayahLoading(false);
      }
    };
    loadDistricts();
  }, [regencyCode]);

  useEffect(() => {
    if (!districtCode) {
      setVillages([]);
      setVillageCode('');
      return;
    }
    const loadVillages = async () => {
      try {
        setIsWilayahLoading(true);
        setWilayahError('');
        const res = await fetch(`/api/wilayah/villages/${districtCode}`);
        if (!res.ok) throw new Error('Failed to load villages');
        const json = await res.json();
        const data = (json && json.data) || [];
        setVillages(data);
      } catch (e: any) {
        setWilayahError('Gagal memuat data kelurahan, silakan isi manual jika perlu.');
      } finally {
        setIsWilayahLoading(false);
      }
    };
    loadVillages();
  }, [districtCode]);

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

  const resetRegistrationState = () => {
    setAccountType(null);
    setStep(1);
    setCompanyName('');
    setNik('');
    setFullName('');
    setAddress('');
    setCountry('');
    setProvince('');
    setCity('');
    setDistrict('');
    setSubdistrict('');
    setPostalCode('');
    setRegEmail('');
    setRegPhoneLocal('');
    setRegPassword('');
    setRegPasswordConfirm('');
    setPicName('');
    setPicPosition('');
    setPicPhoneLocal('');
    setKtpFile(null);
    setNpwpFile(null);
    setNibFile(null);
    setKemenkumhamFile(null);
    setDocPaths({
      ktpDocPath: '',
      npwpDocPath: '',
      nibDocPath: '',
      kemenkumhamDocPath: ''
    });
    setDocError('');
    setRegError('');
    setRegSuccess('');
    setDocPreviews({});
  };

  const handleSelectAccountType = (type: 'PERSONAL' | 'COMPANY') => {
    setAccountType(type);
    setStep(1);
    setRegError('');
    setRegSuccess('');
  };

  const handleDocChange = async (field: 'ktp' | 'npwp' | 'nib' | 'kemenkumham', file: File | null) => {
    setDocError('');
    if (!file) return;
    if (field === 'ktp') setKtpFile(file);
    if (field === 'npwp') setNpwpFile(file);
    if (field === 'nib') setNibFile(file);
    if (field === 'kemenkumham') setKemenkumhamFile(file);

    try {
      setIsUploadingDoc(true);
      const res = await api.uploadUserDoc(null, field, file);
      const path = res.path as string;
      setDocPaths((prev) => ({
        ...prev,
        ktpDocPath: field === 'ktp' ? path : prev.ktpDocPath,
        npwpDocPath: field === 'npwp' ? path : prev.npwpDocPath,
        nibDocPath: field === 'nib' ? path : prev.nibDocPath,
        kemenkumhamDocPath: field === 'kemenkumham' ? path : prev.kemenkumhamDocPath
      }));
    } catch (e: any) {
      setDocError(e.message || 'Gagal upload dokumen');
    } finally {
      setIsUploadingDoc(false);
    }
  };

  const validateStep = (currentStep: number) => {
    if (!accountType) {
      setRegError('Silakan pilih tipe pendaftaran terlebih dahulu.');
      return false;
    }
    if (currentStep === 1) {
      if (
        !nik ||
        !fullName ||
        !address ||
        !country ||
        (accountType === 'COMPANY' && !companyName)
      ) {
        setRegError(
          accountType === 'COMPANY'
            ? 'NIK, Nama Direktur, Nama Perusahaan, Alamat, dan Negara wajib diisi.'
            : 'NIK, Nama Lengkap, Alamat, dan Negara wajib diisi.'
        );
        return false;
      }
      if (country === 'Indonesia') {
        if (!province || !city || !district || !subdistrict || !postalCode) {
          setRegError('Lengkapi Provinsi, Kota, Kecamatan, Kelurahan, dan Kodepos.');
          return false;
        }
      }
      return true;
    }
    if (currentStep === 2) {
      if (!regEmail || !regPassword || !regPasswordConfirm || !picName || !picPosition) {
        setRegError('Email, password, dan data PIC wajib diisi.');
        return false;
      }
      if (regPassword !== regPasswordConfirm) {
        setRegError('Password dan konfirmasi tidak sama.');
        return false;
      }
      return true;
    }
    if (currentStep === 3) {
      if (!ktpFile || !docPaths.ktpDocPath || !npwpFile || !docPaths.npwpDocPath) {
        setRegError('KTP dan NPWP wajib diupload.');
        return false;
      }
      if (accountType === 'COMPANY') {
        if (!nibFile || !docPaths.nibDocPath || !kemenkumhamFile || !docPaths.kemenkumhamDocPath) {
          setRegError('NIB dan dokumen Kemenkumham wajib diupload untuk perusahaan.');
          return false;
        }
      }
      return true;
    }
    return true;
  };

  const goNextStep = () => {
    setRegError('');
    if (!validateStep(step)) return;
    if (step < 4) setStep(step + 1);
  };

  const goPrevStep = () => {
    setRegError('');
    if (step > 1) setStep(step - 1);
  };

  const handleRegisterSubmit = async () => {
    if (!validateStep(3)) return;
    try {
      setIsRegistering(true);
      setRegError('');
      setRegSuccess('');

      const phoneLocalClean = regPhoneLocal.replace(/^0+/, '').trim();
      const picPhoneLocalClean = picPhoneLocal.replace(/^0+/, '').trim();
      const phone = selectedCountryDialCode
        ? `${selectedCountryDialCode}${phoneLocalClean}`
        : phoneLocalClean;
      const picPhone = selectedCountryDialCode
        ? `${selectedCountryDialCode}${picPhoneLocalClean}`
        : picPhoneLocalClean;

      const payload = {
        username: regEmail,
        email: regEmail,
        password: regPassword,
        accountType,
        companyName,
        nik,
        fullName,
        address,
        country,
        province,
        city,
        district,
        subdistrict,
        postalCode,
        phone,
        picName,
        picPosition,
        picPhone,
        ktpDocPath: docPaths.ktpDocPath,
        npwpDocPath: docPaths.npwpDocPath,
        nibDocPath: docPaths.nibDocPath,
        kemenkumhamDocPath: docPaths.kemenkumhamDocPath
      };

      await api.register(payload);
      setRegSuccess('Pendaftaran berhasil. Akun akan direview sebelum diaktifkan.');
      setMode('login');
      setUsername(regEmail);
      setPassword('');
      resetRegistrationState();
    } catch (e: any) {
      const dup = e?.payload?.duplicate;
      if (Array.isArray(dup) && dup.length > 0) {
        const mapLabel: Record<string, string> = {
          EMAIL: 'Email',
          PHONE: 'Nomor WhatsApp',
          COMPANY: 'Nama Perusahaan'
        };
        const labels = dup.map((d: string) => mapLabel[d] || d).join(', ');
        setRegError(`Data duplikat: ${labels}. Gunakan data yang berbeda.`);
      } else {
        setRegError(e.message || 'Pendaftaran gagal');
      }
    } finally {
      setIsRegistering(false);
    }
  };

  const renderLogin = () => (
    <>
      <div className="text-center mb-10">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-blue-500/30">
          <Music4 size={32} />
        </div>
        {wilayahError && (
          <p className="text-xs text-red-500">{wilayahError}</p>
        )}
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
          onClick={() => {
            resetRegistrationState();
            navigate('/register');
          }}
          className="text-xs font-semibold text-blue-600 hover:text-blue-700"
        >
          Belum punya akun? Daftar di sini
        </button>
      </div>
    </>
  );

  const renderRegisterStep1 = () => (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 mb-4">
        <button
          type="button"
          onClick={() => handleSelectAccountType('PERSONAL')}
          className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold
            ${accountType === 'PERSONAL'
              ? 'border-blue-500 bg-blue-50 text-blue-700'
              : 'border-slate-200 bg-slate-50 text-slate-700'
            }`}
        >
          <User size={16} />
          Personal
        </button>
        <button
          type="button"
          onClick={() => handleSelectAccountType('COMPANY')}
          className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold
            ${accountType === 'COMPANY'
              ? 'border-blue-500 bg-blue-50 text-blue-700'
              : 'border-slate-200 bg-slate-50 text-slate-700'
            }`}
        >
          <Building2 size={16} />
          Perusahaan
        </button>
      </div>

      {accountType === 'COMPANY' && (
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">Nama Perusahaan</label>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-sm"
            placeholder="Masukkan nama perusahaan"
          />
        </div>
      )}

      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-700">NIK</label>
        <input
          type="text"
          value={nik}
          onChange={(e) => setNik(e.target.value)}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-sm"
          placeholder="Masukkan NIK"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-700">
          {accountType === 'COMPANY' ? 'Nama Direktur' : 'Nama Lengkap'}
        </label>
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-sm"
          placeholder={accountType === 'COMPANY' ? 'Masukkan nama direktur' : 'Masukkan nama lengkap'}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-700">Alamat Lengkap</label>
        <textarea
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-sm min-h-[70px]"
          placeholder="Masukkan alamat lengkap"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-700">Negara</label>
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-sm"
        >
          <option value="">Pilih negara</option>
          {countries.map((c) => (
            <option key={c.name} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {country === 'Indonesia' ? (
        <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700">Provinsi</label>
            {provinces.length > 0 ? (
              <select
                value={provinceCode}
                onChange={(e) => {
                  const code = e.target.value;
                  setProvinceCode(code);
                  const selected = provinces.find((p) => p.code === code);
                  setProvince(selected?.name || '');
                  setCity('');
                  setDistrict('');
                  setSubdistrict('');
                  setPostalCode('');
                }}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 text-xs"
              >
                <option value="">Pilih provinsi</option>
                {provinces.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 text-xs"
                placeholder="Provinsi"
              />
            )}
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700">Kota / Kabupaten</label>
            {regencies.length > 0 ? (
              <select
                value={regencyCode}
                onChange={(e) => {
                  const code = e.target.value;
                  setRegencyCode(code);
                  const selected = regencies.find((r) => r.code === code);
                  setCity(selected?.name || '');
                  setDistrict('');
                  setSubdistrict('');
                  setPostalCode('');
                }}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 text-xs"
              >
                <option value="">Pilih kota / kabupaten</option>
                {regencies.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 text-xs"
                placeholder="Kota / Kabupaten"
              />
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700">Kecamatan</label>
            {districts.length > 0 ? (
              <select
                value={districtCode}
                onChange={(e) => {
                  const code = e.target.value;
                  setDistrictCode(code);
                  const selected = districts.find((d) => d.code === code);
                  setDistrict(selected?.name || '');
                  setSubdistrict('');
                  setPostalCode('');
                }}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 text-xs"
              >
                <option value="">Pilih kecamatan</option>
                {districts.map((d) => (
                  <option key={d.code} value={d.code}>
                    {d.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 text-xs"
                placeholder="Kecamatan"
              />
            )}
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700">Kelurahan</label>
            {villages.length > 0 ? (
              <select
                value={villageCode}
                onChange={async (e) => {
                  const code = e.target.value;
                  setVillageCode(code);
                  const selected = villages.find((v) => v.code === code);
                  const name = selected?.name || '';
                  setSubdistrict(name);
                  if (!name || !district || !city || !province) {
                    setPostalCode('');
                    return;
                  }
                  try {
                    setIsPostalLoading(true);
                    const params = new URLSearchParams({
                      province,
                      city,
                      district,
                      village: name
                    });
                    const res = await fetch(`/api/wilayah/postal-code?${params.toString()}`);
                    if (!res.ok) {
                      setPostalCode('');
                      return;
                    }
                    const data = await res.json();
                    if (data && data.code) {
                      setPostalCode(String(data.code));
                    } else {
                      setPostalCode('');
                    }
                  } catch {
                    setPostalCode('');
                  } finally {
                    setIsPostalLoading(false);
                  }
                }}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 text-xs"
              >
                <option value="">Pilih kelurahan</option>
                {villages.map((v) => (
                  <option key={v.code} value={v.code}>
                    {v.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={subdistrict}
                onChange={(e) => setSubdistrict(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 text-xs"
                placeholder="Kelurahan"
              />
            )}
          </div>
        </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700">Kodepos</label>
            <input
              type="text"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 text-xs"
              placeholder={isPostalLoading ? 'Mencari kodepos...' : 'Kodepos'}
            />
          </div>
        </div>
      ) : country ? (
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">Kota</label>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-sm"
            placeholder="Masukkan kota"
          />
        </div>
      ) : null}
    </div>
  );

  const renderRegisterStep2 = () => (
    <div className="space-y-5">
      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-700">Email</label>
        <input
          type="email"
          value={regEmail}
          onChange={(e) => setRegEmail(e.target.value)}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-sm"
          placeholder="Masukkan email"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-700">No Handphone</label>
        <div className="flex items-center gap-2">
          <div className="px-3 py-3 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-700 min-w-[80px] text-center">
            {selectedCountryDialCode || '+..'}
          </div>
          <input
            type="tel"
            value={regPhoneLocal}
            onChange={(e) => setRegPhoneLocal(e.target.value.replace(/[^0-9]/g, ''))}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-sm"
            placeholder="Nomor tanpa angka 0 di depan"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">Password</label>
          <input
            type="password"
            value={regPassword}
            onChange={(e) => setRegPassword(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-sm"
            placeholder="Password"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">Retype Password</label>
          <input
            type="password"
            value={regPasswordConfirm}
            onChange={(e) => setRegPasswordConfirm(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-sm"
            placeholder="Konfirmasi password"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-700">Nama PIC</label>
        <input
          type="text"
          value={picName}
          onChange={(e) => setPicName(e.target.value)}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-sm"
          placeholder="Nama PIC"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-700">Posisi PIC</label>
        <input
          type="text"
          value={picPosition}
          onChange={(e) => setPicPosition(e.target.value)}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-sm"
          placeholder="Posisi PIC"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-700">No Handphone PIC</label>
        <div className="flex items-center gap-2">
          <div className="px-3 py-3 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-700 min-w-[80px] text-center">
            {selectedCountryDialCode || '+..'}
          </div>
          <input
            type="tel"
            value={picPhoneLocal}
            onChange={(e) => setPicPhoneLocal(e.target.value.replace(/[^0-9]/g, ''))}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-sm"
            placeholder="Nomor tanpa angka 0 di depan"
          />
        </div>
      </div>
    </div>
  );

  const handleFileSelect = (field: 'ktp' | 'npwp' | 'nib' | 'kemenkumham', file: File | null) => {
    setDocError('');
    if (!file) return;
    if (file.type && file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setCropField(field);
      setCropFile(file);
      setCropImageUrl(url);
      setCropScale(1);
      return;
    }
    handleDocChange(field, file);
  };

  const applyCrop = () => {
    if (!cropFile || !cropImageUrl || !cropField) return;
    const img = new Image();
    img.onload = () => {
      const CONTAINER_W = 512;
      const CONTAINER_H = 360;
      const previewCanvas = document.createElement('canvas');
      previewCanvas.width = CONTAINER_W;
      previewCanvas.height = CONTAINER_H;
      const pctx = previewCanvas.getContext('2d');
      if (!pctx) return;

      const baseScale = Math.min(CONTAINER_W / img.width, CONTAINER_H / img.height);
      const scale = baseScale * cropScale;

      pctx.clearRect(0, 0, CONTAINER_W, CONTAINER_H);
      pctx.save();
      pctx.translate(CONTAINER_W / 2 + cropTranslate.x, CONTAINER_H / 2 + cropTranslate.y);
      pctx.rotate((cropAngle * Math.PI) / 180);
      pctx.scale(scale, scale);
      pctx.drawImage(img, -img.width / 2, -img.height / 2);
      pctx.restore();

      const sx = Math.max(0, Math.min(CONTAINER_W, cropRect.x));
      const sy = Math.max(0, Math.min(CONTAINER_H, cropRect.y));
      const sw = Math.max(1, Math.min(CONTAINER_W - sx, cropRect.w));
      const sh = Math.max(1, Math.min(CONTAINER_H - sy, cropRect.h));

      const imageData = pctx.getImageData(sx, sy, sw, sh);
      const outCanvas = document.createElement('canvas');
      const maxOut = 2048;
      const scaleOut = Math.min(1, maxOut / Math.max(sw, sh));
      outCanvas.width = Math.round(sw * scaleOut);
      outCanvas.height = Math.round(sh * scaleOut);
      const octx = outCanvas.getContext('2d');
      if (!octx) return;
      const tmp = document.createElement('canvas');
      tmp.width = sw;
      tmp.height = sh;
      const tctx = tmp.getContext('2d');
      if (!tctx) return;
      tctx.putImageData(imageData, 0, 0);
      octx.imageSmoothingQuality = 'high';
      octx.drawImage(tmp, 0, 0, outCanvas.width, outCanvas.height);

      const dataUrl = outCanvas.toDataURL('image/jpeg', 0.92);
      outCanvas.toBlob((blob) => {
        if (!blob) return;
        const croppedFile = new File([blob], cropFile.name, { type: 'image/jpeg' });
        setDocPreviews((prev) => ({ ...prev, [cropField]: dataUrl }));
        handleDocChange(cropField, croppedFile);
        URL.revokeObjectURL(cropImageUrl);
        setCropField(null);
        setCropFile(null);
        setCropImageUrl(null);
        setCropTranslate({ x: 0, y: 0 });
        setCropAngle(0);
      }, 'image/jpeg', 0.92);
    };
    img.src = cropImageUrl;
  };

  const cancelCrop = () => {
    if (cropImageUrl) {
      URL.revokeObjectURL(cropImageUrl);
    }
    setCropField(null);
    setCropFile(null);
    setCropImageUrl(null);
  };

  const renderDocUploadItem = (
    label: string,
    field: 'ktp' | 'npwp' | 'nib' | 'kemenkumham',
    file: File | null,
    required: boolean
  ) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-slate-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        {file && (
          <span className="text-[11px] text-green-600 flex items-center gap-1">
            <CheckCircle2 size={12} />
            Terupload
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <label className="flex-1 px-4 py-3 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-xs text-slate-600 cursor-pointer hover:border-blue-400 hover:bg-blue-50">
          <input
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0] || null;
              if (f) handleFileSelect(field, f);
            }}
          />
          {file ? file.name : 'Pilih file'}
        </label>
        {docPreviews[field] && (
          <div className="w-16 h-16 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center">
            <img src={docPreviews[field]} alt={label} className="w-full h-full object-contain" />
          </div>
        )}
      </div>
    </div>
  );

  const renderRegisterStep3 = () => (
    <div className="space-y-5">
      {accountType === 'COMPANY' && renderDocUploadItem('Upload NIB', 'nib', nibFile, true)}
      {accountType === 'COMPANY' &&
        renderDocUploadItem('Upload Dokumen Kemenkumham', 'kemenkumham', kemenkumhamFile, true)}
      {renderDocUploadItem(
        accountType === 'COMPANY'
          ? 'Upload KTP Direktur'
          : 'Upload KTP',
        'ktp',
        ktpFile,
        true
      )}
      {renderDocUploadItem('Upload NPWP', 'npwp', npwpFile, true)}
      {docError && (
        <p className="text-xs text-red-500">{docError}</p>
      )}
      {isUploadingDoc && (
        <p className="text-xs text-slate-400">Mengupload dokumen...</p>
      )}
    </div>
  );

  const renderRegisterStep4 = () => (
    <div className="space-y-4 text-xs text-slate-700">
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1">
        <p className="font-semibold text-slate-800 text-sm">Data Akun</p>
        {accountType === 'COMPANY' && <p>Nama Perusahaan: {companyName}</p>}
        <p>NIK: {nik}</p>
        <p>{accountType === 'COMPANY' ? 'Nama Direktur' : 'Nama Lengkap'}: {fullName}</p>
        <p>Negara: {country}</p>
        {country === 'Indonesia' && (
          <>
            <p>
              Provinsi/Kota: {province} / {city}
            </p>
            <p>
              Kecamatan/Kelurahan: {district} / {subdistrict}
            </p>
            <p>Kodepos: {postalCode}</p>
          </>
        )}
        {country !== 'Indonesia' && city && <p>Kota: {city}</p>}
        <p>Alamat: {address}</p>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1">
        <p className="font-semibold text-slate-800 text-sm">Kontak & PIC</p>
        <p>Email: {regEmail}</p>
        <p>No Handphone: {regPhoneLocal && selectedCountryDialCode ? `${selectedCountryDialCode}${regPhoneLocal}` : regPhoneLocal}</p>
        <p>Nama PIC: {picName}</p>
        <p>Posisi PIC: {picPosition}</p>
        <p>No HP PIC: {picPhoneLocal && selectedCountryDialCode ? `${selectedCountryDialCode}${picPhoneLocal}` : picPhoneLocal}</p>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1">
        <p className="font-semibold text-slate-800 text-sm">Dokumen</p>
        {accountType === 'COMPANY' && (
          <>
            <div className="flex items-center gap-2">
              <p className="flex-1">NIB:</p>
              {docPreviews.nib && (
                <div className="w-12 h-12 rounded-md overflow-hidden border border-slate-200 bg-slate-100">
                  <img src={docPreviews.nib} alt="NIB" className="w-full h-full object-contain" />
                </div>
              )}
              {!docPreviews.nib && <span>{nibFile ? 'Sudah diupload' : 'Belum diupload'}</span>}
            </div>
            <div className="flex items-center gap-2">
              <p className="flex-1">Dokumen Kemenkumham:</p>
              {docPreviews.kemenkumham && (
                <div className="w-12 h-12 rounded-md overflow-hidden border border-slate-200 bg-slate-100">
                  <img src={docPreviews.kemenkumham} alt="Dokumen Kemenkumham" className="w-full h-full object-contain" />
                </div>
              )}
              {!docPreviews.kemenkumham && (
                <span>{kemenkumhamFile ? 'Sudah diupload' : 'Belum diupload'}</span>
              )}
            </div>
          </>
        )}
        <div className="flex items-center gap-2">
          <p className="flex-1">{accountType === 'COMPANY' ? 'KTP Direktur:' : 'KTP:'}</p>
          {docPreviews.ktp && (
            <div className="w-12 h-12 rounded-md overflow-hidden border border-slate-200 bg-slate-100">
              <img src={docPreviews.ktp} alt="KTP" className="w-full h-full object-contain" />
            </div>
          )}
          {!docPreviews.ktp && <span>{ktpFile ? 'Sudah diupload' : 'Belum diupload'}</span>}
        </div>
        <div className="flex items-center gap-2">
          <p className="flex-1">NPWP:</p>
          {docPreviews.npwp && (
            <div className="w-12 h-12 rounded-md overflow-hidden border border-slate-200 bg-slate-100">
              <img src={docPreviews.npwp} alt="NPWP" className="w-full h-full object-contain" />
            </div>
          )}
          {!docPreviews.npwp && <span>{npwpFile ? 'Sudah diupload' : 'Belum diupload'}</span>}
        </div>
      </div>
    </div>
  );

  const renderRegister = () => (
    <>
      <div className="flex items-center justify-between mb-6">
        <button
          type="button"
          onClick={() => {
            resetRegistrationState();
            navigate('/login');
          }}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
        >
          <ChevronLeft size={14} />
          Kembali ke Login
        </button>
        <div className="text-right">
          <p className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">
            Pendaftaran Akun
          </p>
          <p className="text-sm font-bold text-slate-800">
            {accountType === 'COMPANY' ? 'Perusahaan' : accountType === 'PERSONAL' ? 'Personal' : 'Pilih Tipe Akun'}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex-1 flex items-center">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                ${step === s ? 'bg-blue-600 text-white' : step > s ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-600'}
              `}
            >
              {step > s ? <CheckCircle2 size={14} /> : s}
            </div>
            {s < 4 && (
              <div
                className={`flex-1 h-[2px] mx-1
                  ${step > s ? 'bg-green-500' : 'bg-slate-200'}
                `}
              />
            )}
          </div>
        ))}
      </div>

      {regError && (
        <div className="mb-4 bg-red-50 text-red-600 text-xs p-3 rounded-xl flex items-center gap-2 border border-red-100">
          <AlertCircle size={14} />
          {regError}
        </div>
      )}

      <div className="mb-6">
        {step === 1 && renderRegisterStep1()}
        {step === 2 && renderRegisterStep2()}
        {step === 3 && renderRegisterStep3()}
        {step === 4 && renderRegisterStep4()}
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={goPrevStep}
          disabled={step === 1}
          className={`flex-1 py-3 rounded-xl border text-xs font-semibold
            ${step === 1 ? 'border-slate-200 text-slate-300 cursor-not-allowed' : 'border-slate-300 text-slate-700 hover:border-slate-400'}
          `}
        >
          Sebelumnya
        </button>
        {step < 4 ? (
          <button
            type="button"
            onClick={goNextStep}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-xs font-semibold shadow-md shadow-blue-500/25 hover:brightness-110 active:scale-95"
          >
            Lanjut
          </button>
        ) : (
          <button
            type="button"
            onClick={handleRegisterSubmit}
            disabled={isRegistering}
            className={`flex-1 py-3 rounded-xl text-xs font-semibold shadow-md shadow-blue-500/25 active:scale-95
              ${isRegistering ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:brightness-110'}
            `}
          >
            {isRegistering ? 'Memproses...' : 'Submit Pendaftaran'}
          </button>
        )}
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-100 p-4">
      <div
        className={`w-full bg-white rounded-3xl shadow-2xl shadow-blue-900/10 border border-white p-8 md:p-10 animate-fade-in-up
          ${mode === 'register' ? 'max-w-3xl' : 'max-w-md'}
        `}
      >
        {mode === 'login' ? renderLogin() : renderRegister()}
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

      {cropImageUrl && cropField && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4">
            <p className="text-sm font-semibold text-slate-800">Crop {cropField.toUpperCase()}</p>
            <div className="w-full flex items-center justify-center">
              <div
                className="relative bg-slate-100 rounded-xl overflow-hidden"
                style={{ width: 512, height: 360 }}
                onMouseDown={(e) => {
                  const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const y = e.clientY - rect.top;
                  const inRect =
                    x >= cropRect.x && x <= cropRect.x + cropRect.w &&
                    y >= cropRect.y && y <= cropRect.y + cropRect.h;
                  if (inRect) {
                    setCropDragMode('moveRect');
                    setCropDragStart({ x, y, rect: { ...cropRect } });
                  } else {
                    setCropDragMode('moveImage');
                    setCropDragStart({ x, y, translate: { ...cropTranslate } });
                  }
                }}
                onMouseMove={(e) => {
                  if (!cropDragMode || !cropDragStart) return;
                  const rectEl = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                  const x = e.clientX - rectEl.left;
                  const y = e.clientY - rectEl.top;
                  if (cropDragMode === 'moveRect' && cropDragStart.rect) {
                    const dx = x - cropDragStart.x;
                    const dy = y - cropDragStart.y;
                    setCropRect((prev) => ({
                      ...prev,
                      x: Math.max(0, Math.min(512 - prev.w, (cropDragStart.rect!.x + dx))),
                      y: Math.max(0, Math.min(360 - prev.h, (cropDragStart.rect!.y + dy)))
                    }));
                  } else if (cropDragMode === 'moveImage' && cropDragStart.translate) {
                    const dx = x - cropDragStart.x;
                    const dy = y - cropDragStart.y;
                    setCropTranslate({ x: cropDragStart.translate.x + dx, y: cropDragStart.translate.y + dy });
                  }
                }}
                onMouseUp={() => {
                  setCropDragMode(null);
                  setCropDragStart(null);
                }}
                onMouseLeave={() => {
                  setCropDragMode(null);
                  setCropDragStart(null);
                }}
              >
                <img
                  src={cropImageUrl}
                  alt="Crop"
                  className="absolute left-1/2 top-1/2 select-none"
                  style={{
                    transform: `translate(-50%, -50%) translate(${cropTranslate.x}px, ${cropTranslate.y}px) scale(${cropScale}) rotate(${cropAngle}deg)`,
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain'
                  }}
                  draggable={false}
                />
                <div
                  className="absolute border-2 border-white/80 shadow-inner"
                  style={{
                    left: cropRect.x,
                    top: cropRect.y,
                    width: cropRect.w,
                    height: cropRect.h,
                    boxShadow: '0 0 0 9999px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(0,0,0,0.3)',
                    borderRadius: 6
                  }}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-slate-600">Zoom</p>
                <input
                  type="range"
                  min={0.2}
                  max={4}
                  step={0.01}
                  value={cropScale}
                  onChange={(e) => setCropScale(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-slate-600">Rotasi</p>
                <input
                  type="range"
                  min={-15}
                  max={15}
                  step={0.1}
                  value={cropAngle}
                  onChange={(e) => setCropAngle(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-slate-600">Lebar/Tinggi Crop</p>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={64}
                    max={512}
                    step={1}
                    value={cropRect.w}
                    onChange={(e) => setCropRect((prev) => ({ ...prev, w: Math.min(512 - prev.x, parseInt(e.target.value)) }))}
                    className="flex-1"
                  />
                  <input
                    type="range"
                    min={64}
                    max={360}
                    step={1}
                    value={cropRect.h}
                    onChange={(e) => setCropRect((prev) => ({ ...prev, h: Math.min(360 - prev.y, parseInt(e.target.value)) }))}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={cancelCrop}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-700"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={applyCrop}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700"
              >
                Simpan Crop
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
