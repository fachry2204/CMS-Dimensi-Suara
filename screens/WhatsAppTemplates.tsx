import React, { useEffect, useState } from 'react';
import { Save, RefreshCw, MessageCircle } from 'lucide-react';
import { api } from '../utils/api';

interface Props {
  token?: string;
}

type TemplateRow = { template_key: string; body_template: string };

const DEFAULT_KEYS: string[] = [
  'release_status.Pending',
  'release_status.Request Edit',
  'release_status.Processing',
  'release_status.Released',
  'release_status.Rejected',
  'user_register',
  'user_register_status.Pending',
  'user_register_status.Approved',
  'user_register_status.Rejected'
];

const placeholdersByKey: Record<string, string[]> = {
  'release_status.Pending': ['{{fullName}}','{{title}}','{{status}}','{{upc}}','{{isrcBlock}}'],
  'release_status.Request Edit': ['{{fullName}}','{{title}}','{{status}}','{{upc}}','{{isrcBlock}}'],
  'release_status.Processing': ['{{fullName}}','{{title}}','{{status}}','{{upc}}','{{isrcBlock}}'],
  'release_status.Released': ['{{fullName}}','{{title}}','{{status}}','{{upc}}','{{isrcBlock}}'],
  'release_status.Rejected': ['{{fullName}}','{{title}}','{{status}}','{{upc}}','{{isrcBlock}}','{{reason}}','{{description}}'],
  'user_register': ['{{fullName}}','{{username}}'],
  'user_register_status.Pending': ['{{fullName}}','{{status}}'],
  'user_register_status.Approved': ['{{fullName}}','{{status}}'],
  'user_register_status.Rejected': ['{{fullName}}','{{status}}','{{reason}}']
};

export const WhatsAppTemplates: React.FC<Props> = ({ token }) => {
  const [rows, setRows] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const map = new Map<string, TemplateRow>(rows.map((r) => [r.template_key, r] as [string, TemplateRow]));

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getWhatsAppTemplates(token || '');
      setRows(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message || 'Gagal memuat template');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const save = async (key: string, body: string) => {
    setSavingKey(key);
    try {
      await api.saveWhatsAppTemplate(token || '', { key, body });
      await load();
    } catch (e: any) {
      alert(e?.message || 'Gagal menyimpan');
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Template WhatsApp</h2>
          <p className="text-sm text-slate-500">Atur isi pesan teks untuk berbagai notifikasi WhatsApp otomatis.</p>
        </div>
        <button onClick={load} className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>
      {error && <div className="mb-4 p-3 rounded border border-red-200 bg-red-50 text-red-700 text-sm">{error}</div>}
      <div className="space-y-6">
        {DEFAULT_KEYS.map(key => {
          const cur = map.get(key);
          const [body, setBody] = React.useState(cur?.body_template || '');
          useEffect(() => {
            setBody(cur?.body_template || '');
          }, [cur?.body_template]);

          const placeholders = placeholdersByKey[key] || [];

          return (
            <div key={key} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex items-center justify-between">
                <span className="text-sm font-bold text-slate-700 uppercase tracking-wider">{key.replace('_', ' ')}</span>
                <button 
                  onClick={() => save(key, body)} 
                  disabled={savingKey === key}
                  className="inline-flex items-center gap-2 px-4 py-1.5 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 disabled:opacity-50 transition-colors shadow-sm"
                >
                  <Save size={14} /> {savingKey === key ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Isi Pesan (WhatsApp)</label>
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={6}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm font-medium leading-relaxed resize-none"
                    placeholder="Tulis pesan di sini..."
                  />
                </div>
                {placeholders.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 mt-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest w-full mb-1">Placeholder Tersedia:</span>
                    {placeholders.map(p => (
                      <button
                        key={p}
                        onClick={() => setBody(prev => prev + ' ' + p)}
                        className="px-2 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-md hover:bg-blue-100 transition-colors border border-blue-100"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WhatsAppTemplates;
