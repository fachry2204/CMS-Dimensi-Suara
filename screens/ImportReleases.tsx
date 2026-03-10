import React, { useState } from 'react';
import { ArrowLeft, UploadCloud, CheckSquare, Square, FileSpreadsheet, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api, API_BASE_URL } from '../utils/api';

export const ImportReleases: React.FC = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('cms_token') || '';
  const [rows, setRows] = useState<any[]>([]);
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{inserted:number; errors:string[]}|null>(null);

  const handleUpload = async (file: File) => {
    setIsLoading(true);
    setRows([]);
    setSelected({});
    setResult(null);
    try {
      const res = await api.releasesImportPreview(token, file);
      const list = res.rows || [];
      setRows(list);
      // Default select all
      const sel: Record<number, boolean> = {};
      list.forEach((_, idx: number) => { sel[idx] = true; });
      setSelected(sel);
    } catch (e: any) {
      alert(e?.message || 'Gagal membaca file');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAll = (checked: boolean) => {
    const sel: Record<number, boolean> = {};
    rows.forEach((_, idx) => { sel[idx] = checked; });
    setSelected(sel);
  };

  const processSelected = async () => {
    const chosen = rows.filter((_, idx) => !!selected[idx]);
    if (chosen.length === 0) {
      alert('Pilih minimal satu baris untuk diimport.');
      return;
    }
    setIsLoading(true);
    setResult(null);
    try {
      const res = await api.releasesImportRows(token, chosen);
      setResult(res);
      // Optional: refresh after import
      setTimeout(() => {
        navigate('/releases');
        setTimeout(() => {
          try { window.location.reload(); } catch {}
        }, 150);
      }, 800);
    } catch (e: any) {
      alert(e?.message || 'Gagal memproses import');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/releases')} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600">
          <ArrowLeft size={20} />
        </button>
        <div>
          <div className="text-xl font-bold text-slate-800">Import Release</div>
          <div className="text-slate-500 text-sm">Upload file Excel, preview, pilih baris, lalu proses import.</div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6">
        <div className="flex gap-3">
          <button
            onClick={() => {
              try {
                const url = `${API_BASE_URL}/releases/import/template`;
                window.open(url, '_blank');
              } catch {}
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 flex items-center gap-2"
          >
            <FileSpreadsheet size={16} /> Download Contoh File
          </button>
          <label className="px-4 py-2 bg-slate-100 rounded-lg text-xs font-medium cursor-pointer hover:bg-slate-200 flex items-center gap-2">
            <UploadCloud size={16} />
            <input
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(file);
              }}
            />
            Upload File Excel
          </label>
          <button
            onClick={() => { setRows([]); setSelected({}); setResult(null); }}
            className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium hover:bg-slate-50 flex items-center gap-2"
          >
            <RefreshCw size={16} /> Reset
          </button>
        </div>
        {isLoading && <div className="mt-3 text-xs text-slate-500">Memproses...</div>}
      </div>

      {rows.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="p-3 border-b border-slate-200 flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-700">Preview Data Import</div>
            <div className="flex gap-2">
              <button
                onClick={() => toggleAll(true)}
                className="px-3 py-1.5 bg-slate-100 rounded text-xs font-medium hover:bg-slate-200"
              >
                Pilih Semua
              </button>
              <button
                onClick={() => toggleAll(false)}
                className="px-3 py-1.5 bg-slate-100 rounded text-xs font-medium hover:bg-slate-200"
              >
                Hapus Pilihan
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2">Pilih</th>
                  <th className="px-3 py-2">Title</th>
                  <th className="px-3 py-2">Version</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Primary Artists</th>
                  <th className="px-3 py-2">Record Label</th>
                  <th className="px-3 py-2">Genre</th>
                  <th className="px-3 py-2">SubGenre</th>
                  <th className="px-3 py-2">PLine</th>
                  <th className="px-3 py-2">CLine</th>
                  <th className="px-3 py-2">Planned</th>
                  <th className="px-3 py-2">Original</th>
                  <th className="px-3 py-2">Targets</th>
                  <th className="px-3 py-2">Distribution History</th>
                  <th className="px-3 py-2">Owner Email</th>
                  <th className="px-3 py-2">Aggregator</th>
                  <th className="px-3 py-2">UPC</th>
                  <th className="px-3 py-2">ISRC</th>
                  <th className="px-3 py-2">Author</th>
                  <th className="px-3 py-2">Komposer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-3 py-2">
                      <button
                        onClick={() => setSelected(prev => ({ ...prev, [idx]: !prev[idx] }))}
                        className="p-1 rounded hover:bg-slate-100"
                        title="Pilih baris"
                      >
                        {selected[idx] ? <CheckSquare size={16} className="text-green-600" /> : <Square size={16} className="text-slate-400" />}
                      </button>
                    </td>
                    <td className="px-3 py-2">{r.Title}</td>
                    <td className="px-3 py-2">{r.Version}</td>
                    <td className="px-3 py-2">{r.ReleaseType}</td>
                    <td className="px-3 py-2">{r.PrimaryArtists}</td>
                    <td className="px-3 py-2">{r.RecordLabel}</td>
                    <td className="px-3 py-2">{r.Genre}</td>
                    <td className="px-3 py-2">{r.SubGenre}</td>
                    <td className="px-3 py-2">{r.PLine}</td>
                    <td className="px-3 py-2">{r.CLine}</td>
                    <td className="px-3 py-2">{r.PlannedReleaseDate}</td>
                    <td className="px-3 py-2">{r.OriginalReleaseDate}</td>
                    <td className="px-3 py-2">{r.DistributionTargets}</td>
                    <td className="px-3 py-2">{r.DistributionHistory}</td>
                    <td className="px-3 py-2">{r.OwnerEmail}</td>
                    <td className="px-3 py-2">{r.Aggregator}</td>
                    <td className="px-3 py-2">{r.UPC}</td>
                    <td className="px-3 py-2">{r.ISRC}</td>
                    <td className="px-3 py-2">{r.Author}</td>
                    <td className="px-3 py-2">{r.Komposer}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-3 border-t border-slate-200 flex justify-end">
            <button
              onClick={processSelected}
              disabled={isLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700"
            >
              {isLoading ? 'Memproses...' : 'Proses Import'}
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
          <div>Berhasil ditambahkan: {result.inserted}</div>
          {result.errors && result.errors.length > 0 && (
            <div className="mt-2 text-red-600">
              {result.errors.map((e, i) => <div key={i}>{e}</div>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
