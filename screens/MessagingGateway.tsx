import React, { useEffect, useState } from 'react';
import { Server, Terminal, Loader2, Upload } from 'lucide-react';
import { api } from '../utils/api';

interface Props {
  token?: string;
}

type SmtpCfg = { host: string; port: number; secure: boolean; user: string; pass: string; from_email: string; from_name?: string };
type MpwaCfg = { base_url: string; token: string; device_id: string; enabled: boolean };

export const MessagingGateway: React.FC<Props> = ({ token }) => {
  const [smtp, setSmtp] = useState<SmtpCfg>({ host: '', port: 587, secure: false, user: '', pass: '', from_email: '', from_name: '' });
  const [mpwa, setMpwa] = useState<MpwaCfg>({ base_url: '', token: '', device_id: '', enabled: false });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testEmailTo, setTestEmailTo] = useState('');
  const [testEmailMsg, setTestEmailMsg] = useState('');
  const [testingEmail, setTestingEmail] = useState(false);
  const [testWaPhone, setTestWaPhone] = useState('');
  const [testWaMsg, setTestWaMsg] = useState('');
  const [testingWa, setTestingWa] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const g = await api.getGatewaySettings(token || '');
      setSmtp(g?.smtp || smtp);
      setMpwa(g?.mpwa || mpwa);
    } catch (e: any) {
      setError(e?.message || 'Gagal memuat gateway');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.updateGatewaySettings(token || '', { smtp, mpwa });
      await load();
    } catch (e: any) {
      setError(e?.message || 'Gagal menyimpan pengaturan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Messaging Gateway</h2>
        <p className="text-sm text-slate-500">Atur pengiriman Email (SMTP) dan WhatsApp (MPWA).</p>
      </div>

      {error && <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm">{error}</div>}

      {/* SMTP */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
            <Server size={24}/>
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">SMTP Email</h3>
            <p className="text-sm text-slate-500">Konfigurasi pengiriman email ke user.</p>
          </div>
        </div>
        {loading ? (
          <div className="flex items-center justify-center gap-2 text-slate-500 py-6">
            <Loader2 size={18} className="animate-spin"/> Memuat pengaturan...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Host</label>
              <input value={smtp.host} onChange={(e)=>setSmtp({...smtp, host: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-xl"/>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Port</label>
              <input type="number" value={smtp.port} onChange={(e)=>setSmtp({...smtp, port: parseInt(e.target.value||'587')})} className="w-full px-4 py-2 border border-gray-200 rounded-xl"/>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Secure (TLS/SSL)</label>
              <select value={smtp.secure ? 'true' : 'false'} onChange={(e)=>setSmtp({...smtp, secure: e.target.value==='true'})} className="w-full px-4 py-2 border border-gray-200 rounded-xl">
                <option value="false">Tidak</option>
                <option value="true">Ya</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">User</label>
              <input value={smtp.user} onChange={(e)=>setSmtp({...smtp, user: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-xl"/>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Password</label>
              <input type="password" value={smtp.pass} onChange={(e)=>setSmtp({...smtp, pass: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-xl"/>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">From Email</label>
              <input value={smtp.from_email} onChange={(e)=>setSmtp({...smtp, from_email: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-xl"/>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">From Name</label>
              <input value={smtp.from_name || ''} onChange={(e)=>setSmtp({...smtp, from_name: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-xl"/>
            </div>
            <div className="md:col-span-2 mt-6 border-t border-gray-100 pt-4">
              <label className="block text-sm font-bold text-slate-700 mb-2">Test Kirim Email</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input value={testEmailTo} onChange={(e)=>setTestEmailTo(e.target.value)} placeholder="user@domain.com" className="w-full px-4 py-2 border border-gray-200 rounded-xl"/>
                <input value={testEmailMsg} onChange={(e)=>setTestEmailMsg(e.target.value)} placeholder="Pesan (opsional)" className="w-full px-4 py-2 border border-gray-200 rounded-xl"/>
                <button onClick={async ()=>{ if(!testEmailTo) { alert('Masukkan email tujuan'); return; } setTestingEmail(true); try { await api.testGatewayEmail(token||'', { to: testEmailTo, body: testEmailMsg }); alert('Test email berhasil'); } catch(e:any){ alert('Gagal: '+(e?.message||'Unknown')); } finally { setTestingEmail(false);} }} disabled={testingEmail} className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold disabled:opacity-50">{testingEmail?'Mengirim...':'Kirim Test Email'}</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MPWA */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
            <Terminal size={24}/>
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">WA Gateway (MPWA)</h3>
            <p className="text-sm text-slate-500">Konfigurasi WhatsApp Gateway via MPWA.</p>
          </div>
        </div>
        {loading ? (
          <div className="flex items-center justify-center gap-2 text-slate-500 py-6">
            <Loader2 size={18} className="animate-spin"/> Memuat pengaturan...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-2">Aktifkan WA Gateway</label>
              <select 
                value={mpwa.enabled ? 'true' : 'false'} 
                onChange={(e) => setMpwa({...mpwa, enabled: e.target.value === 'true'})} 
                className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-slate-50 focus:bg-white transition-colors"
              >
                <option value="false">Tidak Aktif</option>
                <option value="true">Aktif (Kirim Notifikasi Otomatis)</option>
              </select>
              <p className="text-xs text-slate-500 mt-1">Jika aktif, sistem akan mengirim notifikasi WhatsApp otomatis untuk setiap perubahan status (Release, Pendaftaran, dll).</p>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-2">Base URL MPWA</label>
              <input value={mpwa.base_url} onChange={(e)=>setMpwa({...mpwa, base_url: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-xl"/>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Token API</label>
              <input type="text" value={mpwa.token} onChange={(e)=>setMpwa({...mpwa, token: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-xl"/>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Device ID</label>
              <input value={mpwa.device_id} onChange={(e)=>setMpwa({...mpwa, device_id: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-xl"/>
            </div>
            <div className="md:col-span-2 mt-6 border-t border-gray-100 pt-4">
              <label className="block text-sm font-bold text-slate-700 mb-2">Test Kirim WhatsApp</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input value={testWaPhone} onChange={(e)=>setTestWaPhone(e.target.value)} placeholder="628xxxxxxxxxx" className="w-full px-4 py-2 border border-gray-200 rounded-xl"/>
                <input value={testWaMsg} onChange={(e)=>setTestWaMsg(e.target.value)} placeholder="Pesan (opsional)" className="w-full px-4 py-2 border border-gray-200 rounded-xl"/>
                <button onClick={async ()=>{ 
                  if(!testWaPhone){ alert('Masukkan nomor WhatsApp'); return;} 
                  setTestingWa(true); 
                  try { 
                    await api.testGatewayWa(token||'', { 
                      phone: testWaPhone, 
                      message: testWaMsg,
                      endpoint: mpwa.base_url,
                      token: mpwa.token,
                      device_id: mpwa.device_id
                    }); 
                    alert('Test WA berhasil'); 
                  } catch(e:any){ 
                    alert('Gagal: '+(e?.message||'Unknown')); 
                  } finally { 
                    setTestingWa(false);
                  } 
                }} disabled={testingWa} className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold disabled:opacity-50">{testingWa?'Mengirim...':'Kirim Test WA'}</button>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end border-t border-gray-100 pt-6 mt-6">
          <button onClick={save} disabled={saving} className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold disabled:opacity-50">
            {saving ? (<><Loader2 size={18} className="animate-spin"/> Menyimpan...</>) : (<><Upload size={18}/> Simpan Pengaturan Gateway</>)}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MessagingGateway;
