import React, { useEffect, useState } from 'react';
import { ClipboardList, RefreshCw, AlertTriangle, CheckCircle, Clock, Mail, MessageCircle, Activity } from 'lucide-react';
import { api } from '../utils/api';

interface Props {
  token?: string;
  userRole?: string;
}

type EmailLog = {
  id: number;
  user_id: number | null;
  related_type: string | null;
  related_id: number | null;
  to_email: string;
  subject: string;
  status: 'PENDING' | 'SENT' | 'FAILED';
  error_message?: string | null;
  created_at: string;
  sent_at?: string | null;
  server_response?: string | null;
};

type BroadcastLog = {
  id: number;
  channel: 'email' | 'wa' | 'both';
  recipient: string;
  subject?: string;
  message?: string;
  status: 'PENDING' | 'SENT' | 'FAILED';
  error_message?: string | null;
  sent_at?: string | null;
  created_at: string;
};

export const SystemMonitoring: React.FC<Props> = ({ token, userRole }) => {
  const [activeTab, setActiveTab] = useState<'email' | 'whatsapp' | 'broadcast'>('email');
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [broadcastLogs, setBroadcastLogs] = useState<BroadcastLog[]>([]);
  const [resendingId, setResendingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(20);

  const pretty = (s?: string | null) => {
    if (!s) return '-';
    return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  const fetchEmailLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getEmailLogs(token || '', {
        status: statusFilter || undefined,
        type: typeFilter || undefined,
        page,
        limit
      });
      setLogs(Array.isArray(data?.data) ? data.data : []);
      setTotal(Number(data?.total || 0));
    } catch (e: any) {
      setError(e?.message || 'Gagal memuat email logs');
    } finally {
      setLoading(false);
    }
  };

  const fetchBroadcastLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getBroadcastLogs(token || '');
      setBroadcastLogs(Array.isArray(data) ? data : []);
      setTotal(data.length);
    } catch (e: any) {
      setError(e?.message || 'Gagal memuat broadcast logs');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async (id: number, type: 'email' | 'broadcast') => {
    if (!token) return;
    setResendingId(id);
    try {
        if (type === 'email') {
            await api.resendEmailLog(token, id);
        } else {
            await api.resendBroadcastLog(token, id);
        }
        alert('Pesan berhasil dikirim ulang!');
        if (type === 'email') fetchEmailLogs();
        else fetchBroadcastLogs();
    } catch (e: any) {
        alert('Gagal mengirim ulang: ' + (e?.message || 'Unknown error'));
    } finally {
        setResendingId(null);
    }
  };

  useEffect(() => {
    if (activeTab === 'email') fetchEmailLogs();
    else fetchBroadcastLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, typeFilter, page, limit, activeTab]);

  const totalPages = Math.max(Math.ceil(total / limit), 1);

  const statusBadge = (s: string) => {
    if (s === 'SENT') return <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-700 font-bold inline-flex items-center gap-1"><CheckCircle size={12}/> Sent</span>;
    if (s === 'FAILED') return <span className="px-2 py-1 text-xs rounded bg-red-100 text-red-700 font-bold inline-flex items-center gap-1"><AlertTriangle size={12}/> Failed</span>;
    return <span className="px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-800 font-bold inline-flex items-center gap-1"><Clock size={12}/> Pending</span>;
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
          <Activity size={24} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">System Monitoring</h2>
          <p className="text-sm text-slate-500">Pantau status pengiriman email dan broadcast pesan.</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 bg-slate-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => { setActiveTab('email'); setPage(1); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'email' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-white/50'
          }`}
        >
          <Mail size={16} /> Monitoring Email
        </button>
        <button
          onClick={() => { setActiveTab('whatsapp'); setPage(1); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'whatsapp' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-white/50'
          }`}
        >
          <MessageCircle size={16} /> Monitoring WhatsApp
        </button>
        <button
          onClick={() => { setActiveTab('broadcast'); setPage(1); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'broadcast' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-white/50'
          }`}
        >
          <Activity size={16} /> Status Broadcast
        </button>
      </div>
      
      {activeTab === 'email' && (
        <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-4">
          <div className="flex flex-col md:flex-row items-center gap-3">
            <select value={statusFilter} onChange={(e) => { setPage(1); setStatusFilter(e.target.value); }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
              <option value="">Semua Status</option>
              <option value="PENDING">Pending</option>
              <option value="SENT">Sent</option>
              <option value="FAILED">Failed</option>
            </select>
            <select value={typeFilter} onChange={(e) => { setPage(1); setTypeFilter(e.target.value); }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
              <option value="">Semua Tipe</option>
              <option value="RELEASE_STATUS">Release Status</option>
              <option value="USER_REGISTER">User Register</option>
            </select>
            <select value={limit} onChange={(e) => { setPage(1); setLimit(parseInt(e.target.value, 10)); }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <button onClick={fetchEmailLogs} className="ml-auto inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''}/> Refresh
            </button>
          </div>
        </div>
      )}

      {activeTab === 'broadcast' && (
        <div className="flex justify-end mb-4">
          <button onClick={fetchBroadcastLogs} className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''}/> Refresh Status
          </button>
        </div>
      )}

      {activeTab === 'whatsapp' && (
        <div className="flex justify-end mb-4">
          <button onClick={fetchBroadcastLogs} className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''}/> Refresh Status
          </button>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          {activeTab === 'email' ? (
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left font-bold">Time</th>
                  <th className="px-4 py-3 text-left font-bold">To</th>
                  <th className="px-4 py-3 text-left font-bold">Subject</th>
                  <th className="px-4 py-3 text-left font-bold">Type</th>
                  <th className="px-4 py-3 text-left font-bold">Status</th>
                  <th className="px-4 py-3 text-left font-bold">Error</th>
                  <th className="px-4 py-3 text-right font-bold">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-500">Memuat data...</td></tr>
                ) : error ? (
                  <tr><td colSpan={7} className="px-4 py-6 text-center text-red-600">{error}</td></tr>
                ) : logs.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-500">Belum ada log email.</td></tr>
                ) : (
                  logs.map(log => (
                    <tr key={log.id} className="border-t border-slate-100">
                      <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</td>
                      <td className="px-4 py-3 font-mono">{log.to_email}</td>
                      <td className="px-4 py-3 text-slate-700">{log.subject}</td>
                      <td className="px-4 py-3 text-slate-600">{pretty(log.related_type)}</td>
                      <td className="px-4 py-3">{statusBadge(log.status)}</td>
                      <td className="px-4 py-3 text-slate-500 truncate max-w-[200px]" title={log.error_message || ''}>{log.error_message || '-'}</td>
                      <td className="px-4 py-3 text-right">
                        {log.status === 'FAILED' && (
                          <button 
                            onClick={() => handleResend(log.id, 'email')}
                            disabled={resendingId === log.id}
                            className="p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                            title="Kirim Ulang"
                          >
                            <RefreshCw size={14} className={resendingId === log.id ? 'animate-spin' : ''} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : activeTab === 'whatsapp' ? (
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left font-bold">Time</th>
                  <th className="px-4 py-3 text-left font-bold">Recipient</th>
                  <th className="px-4 py-3 text-left font-bold">Message</th>
                  <th className="px-4 py-3 text-left font-bold">Status</th>
                  <th className="px-4 py-3 text-left font-bold">Error</th>
                  <th className="px-4 py-3 text-right font-bold">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-500">Memuat data...</td></tr>
                ) : error ? (
                  <tr><td colSpan={6} className="px-4 py-6 text-center text-red-600">{error}</td></tr>
                ) : broadcastLogs.filter(l => l.channel === 'wa').length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-500">Belum ada log WhatsApp.</td></tr>
                ) : (
                  broadcastLogs.filter(l => l.channel === 'wa').map(log => (
                    <tr key={log.id} className="border-t border-slate-100">
                      <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</td>
                      <td className="px-4 py-3 font-mono">{log.recipient}</td>
                      <td className="px-4 py-3 text-slate-700 truncate max-w-[300px]" title={log.message}>{log.message}</td>
                      <td className="px-4 py-3">{statusBadge(log.status)}</td>
                      <td className="px-4 py-3 text-slate-500 truncate max-w-[200px]" title={log.error_message || ''}>{log.error_message || '-'}</td>
                      <td className="px-4 py-3 text-right">
                        {log.status === 'FAILED' && (
                          <button 
                            onClick={() => handleResend(log.id, 'broadcast')}
                            disabled={resendingId === log.id}
                            className="p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                            title="Kirim Ulang"
                          >
                            <RefreshCw size={14} className={resendingId === log.id ? 'animate-spin' : ''} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left font-bold">Time</th>
                  <th className="px-4 py-3 text-left font-bold">Channel</th>
                  <th className="px-4 py-3 text-left font-bold">Recipient</th>
                  <th className="px-4 py-3 text-left font-bold">Subject / Msg</th>
                  <th className="px-4 py-3 text-left font-bold">Status</th>
                  <th className="px-4 py-3 text-left font-bold">Error</th>
                  <th className="px-4 py-3 text-right font-bold">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-500">Memuat data...</td></tr>
                ) : error ? (
                  <tr><td colSpan={7} className="px-4 py-6 text-center text-red-600">{error}</td></tr>
                ) : broadcastLogs.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-500">Belum ada log broadcast.</td></tr>
                ) : (
                  broadcastLogs.map(log => (
                    <tr key={log.id} className="border-t border-slate-100">
                      <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${log.channel === 'email' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'}`}>
                          {log.channel}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono">{log.recipient}</td>
                      <td className="px-4 py-3 text-slate-700 truncate max-w-[200px]" title={log.subject || log.message}>{log.subject || log.message}</td>
                      <td className="px-4 py-3">{statusBadge(log.status)}</td>
                      <td className="px-4 py-3 text-slate-500 truncate max-w-[200px]" title={log.error_message || ''}>{log.error_message || '-'}</td>
                      <td className="px-4 py-3 text-right">
                        {log.status === 'FAILED' && (
                          <button 
                            onClick={() => handleResend(log.id, 'broadcast')}
                            disabled={resendingId === log.id}
                            className="p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                            title="Kirim Ulang"
                          >
                            <RefreshCw size={14} className={resendingId === log.id ? 'animate-spin' : ''} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {activeTab === 'email' && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-sm">
            <div className="text-slate-500">Total: {total}</div>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(p - 1, 1))} disabled={page <= 1} className="px-3 py-1 rounded border border-gray-200 disabled:opacity-50">Prev</button>
              <span className="text-slate-600">Page {page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(p + 1, totalPages))} disabled={page >= totalPages} className="px-3 py-1 rounded border border-gray-200 disabled:opacity-50">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemMonitoring;
