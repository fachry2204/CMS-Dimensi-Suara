import React, { useEffect, useRef, useState } from 'react';
import { Save, RefreshCw } from 'lucide-react';
import { api } from '../utils/api';

interface Props {
  token?: string;
}

type TemplateRow = { template_key: string; subject_template: string; body_template: string };

const DEFAULT_KEYS: string[] = [
  'release_status.Pending',
  'release_status.Request Edit',
  'release_status.Processing',
  'release_status.Live',
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
  'release_status.Live': ['{{fullName}}','{{title}}','{{status}}','{{upc}}','{{isrcBlock}}'],
  'release_status.Rejected': ['{{fullName}}','{{title}}','{{status}}','{{upc}}','{{isrcBlock}}','{{reason}}','{{description}}'],
  'user_register': ['{{fullName}}','{{username}}'],
  'user_register_status.Pending': ['{{fullName}}','{{status}}'],
  'user_register_status.Approved': ['{{fullName}}','{{status}}'],
  'user_register_status.Rejected': ['{{fullName}}','{{status}}','{{reason}}']
};

export const EmailTemplates: React.FC<Props> = ({ token }) => {
  const [rows, setRows] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const map = new Map<string, TemplateRow>(rows.map((r) => [r.template_key, r] as [string, TemplateRow]));

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getEmailTemplates(token || '');
      setRows(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message || 'Gagal memuat template');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const save = async (key: string, subject: string, body: string) => {
    setSavingKey(key);
    try {
      await api.saveEmailTemplate(token || '', { key, subject, body });
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
          <h2 className="text-xl font-bold text-slate-800">Template Email</h2>
          <p className="text-sm text-slate-500">Atur subjek dan isi HTML untuk berbagai notifikasi.</p>
        </div>
        <button onClick={load} className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>
      {error && <div className="mb-4 p-3 rounded border border-red-200 bg-red-50 text-red-700 text-sm">{error}</div>}
      <div className="space-y-6">
        {DEFAULT_KEYS.map(key => {
          const cur = map.get(key);
          const [subject, setSubject] = React.useState(cur?.subject_template || '');
          const [body, setBody] = React.useState(cur?.body_template || '');
          useEffect(() => {
            setSubject(cur?.subject_template || '');
            setBody(cur?.body_template || '');
          }, [cur?.subject_template, cur?.body_template]);
          const editorRef = useRef<HTMLDivElement>(null);
          const apply = (cmd: string, val?: string) => {
            document.execCommand(cmd, false, val);
            if (editorRef.current) {
              setBody(editorRef.current.innerHTML);
            }
          };
          const onInput = (e: React.FormEvent<HTMLDivElement>) => {
            setBody((e.target as HTMLDivElement).innerHTML);
          };
          useEffect(() => {
            if (editorRef.current && editorRef.current.innerHTML !== (cur?.body_template || '')) {
              editorRef.current.innerHTML = cur?.body_template || '';
            }
          }, [cur?.body_template]);
          return (
            <div key={key} className="bg-white border border-gray-200 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-sm font-bold text-slate-700">{key}</div>
                  <div className="text-xs text-slate-500">Placeholder: {(placeholdersByKey[key] || []).join(', ')}</div>
                </div>
                <button
                  onClick={() => save(key, subject, body)}
                  disabled={savingKey === key}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 disabled:opacity-50"
                >
                  <Save size={14} /> Save
                </button>
              </div>
              <div className="space-y-3">
                <input
                  placeholder="Subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={() => apply('bold')} className="px-2 py-1 border border-gray-200 rounded text-sm">B</button>
                  <button onClick={() => apply('italic')} className="px-2 py-1 border border-gray-200 rounded text-sm italic">I</button>
                  <button onClick={() => apply('underline')} className="px-2 py-1 border border-gray-200 rounded text-sm">U</button>
                  <button onClick={() => apply('insertUnorderedList')} className="px-2 py-1 border border-gray-200 rounded text-sm">• List</button>
                  <button onClick={() => apply('insertOrderedList')} className="px-2 py-1 border border-gray-200 rounded text-sm">1. List</button>
                  <button onClick={() => apply('formatBlock', '<h3>')} className="px-2 py-1 border border-gray-200 rounded text-sm">H3</button>
                  <button onClick={() => apply('formatBlock', '<p>')} className="px-2 py-1 border border-gray-200 rounded text-sm">P</button>
                  <button onClick={() => { const url = window.prompt('URL'); if (url) apply('createLink', url); }} className="px-2 py-1 border border-gray-200 rounded text-sm">Link</button>
                  <button onClick={() => apply('removeFormat')} className="px-2 py-1 border border-gray-200 rounded text-sm">Clear</button>
                  <button onClick={() => apply('undo')} className="px-2 py-1 border border-gray-200 rounded text-sm">Undo</button>
                  <button onClick={() => apply('redo')} className="px-2 py-1 border border-gray-200 rounded text-sm">Redo</button>
                </div>
                <div
                  ref={editorRef}
                  onInput={onInput}
                  contentEditable
                  className="w-full min-h-[220px] px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white prose prose-sm max-w-none focus:outline-none"
                  suppressContentEditableWarning
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EmailTemplates;
