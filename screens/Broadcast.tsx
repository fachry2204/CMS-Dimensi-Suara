import React, { useState } from 'react';
import { Send, Clock, Users, AlertTriangle } from 'lucide-react';
import { api } from '../utils/api';

interface Props {
  token?: string;
}

export const Broadcast: React.FC<Props> = ({ token }) => {
  const [channel, setChannel] = useState<'email'|'wa'|'both'>('email');
  const [subject, setSubject] = useState('');
  const [html, setHtml] = useState('');
  const [message, setMessage] = useState('');
  const [recipientsText, setRecipientsText] = useState('');
  const [delayMs, setDelayMs] = useState(1500);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const onSend = async () => {
    setSending(true);
    setResult(null);
    try {
      const recipients = recipientsText
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
      const payload: any = { channel, delayMs };
      if (channel !== 'wa') {
        payload.subject = subject;
        payload.html = html;
      }
      if (channel !== 'email') {
        payload.message = message;
      }
      if (recipients.length > 0) payload.recipients = recipients;
      const res = await api.broadcastMessage(token || '', payload);
      setResult(`Broadcast dimulai. Total target: ${res?.total ?? recipients.length}`);
    } catch (e: any) {
      setResult(e?.message || 'Broadcast gagal');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
          <Users size={24} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">Broadcast Pesan</h2>
          <p className="text-sm text-slate-500">Kirim ke banyak user dengan jeda antar pesan agar tidak terblokir.</p>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 rounded-lg text-sm mb-4 flex items-center gap-2">
        <AlertTriangle size={16}/> Gunakan jeda pengiriman yang cukup. 1000–2000ms disarankan agar aman.
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Channel</label>
            <select value={channel} onChange={(e) => setChannel(e.target.value as any)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
              <option value="email">Email</option>
              <option value="wa">WhatsApp (MPWA)</option>
              <option value="both">Keduanya</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Delay per pesan (ms)</label>
            <div className="flex items-center gap-2">
              <input type="number" value={delayMs} onChange={(e) => setDelayMs(parseInt(e.target.value || '1500', 10))} className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              <Clock size={16} className="text-slate-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Daftar Tujuan (opsional)</label>
            <input
              placeholder="email1@x.com, email2@x.com atau no WA dipisah koma"
              value={recipientsText}
              onChange={(e) => setRecipientsText(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
        </div>

        {channel !== 'wa' && (
          <>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Subject</label>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Body HTML</label>
              <textarea value={html} onChange={(e) => setHtml(e.target.value)} rows={8} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono" />
            </div>
          </>
        )}

        {channel !== 'email' && (
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Pesan WA</label>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          </div>
        )}

        <div className="flex justify-end">
          <button
            onClick={onSend}
            disabled={sending}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50"
          >
            <Send size={16} /> Kirim
          </button>
        </div>
      </div>

      {result && <div className="mt-4 p-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 text-sm">{result}</div>}
    </div>
  );
};

export default Broadcast;
