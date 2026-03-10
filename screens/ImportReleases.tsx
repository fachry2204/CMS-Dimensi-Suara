import React, { useState } from 'react';
import { ArrowLeft, UploadCloud, CheckSquare, Square, FileSpreadsheet, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { api } from '../utils/api';

export const ImportReleases: React.FC = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('cms_token') || '';
  const [rows, setRows] = useState<any[]>([]);
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{inserted:number; errors:string[]}|null>(null);
  const selectedCount = Object.values(selected).filter(Boolean).length;

  const toISODate = (v: any): string => {
    if (!v) return '';
    if (v instanceof Date) {
      const yyyy = v.getFullYear();
      const mm = String(v.getMonth() + 1).padStart(2, '0');
      const dd = String(v.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
    if (typeof v === 'number' && Number.isFinite(v)) {
      const dc: any = (XLSX as any).SSF?.parse_date_code ? (XLSX as any).SSF.parse_date_code(v) : null;
      if (dc && dc.y && dc.m && dc.d) {
        const yyyy = String(dc.y).padStart(4, '0');
        const mm = String(dc.m).padStart(2, '0');
        const dd = String(dc.d).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      }
    }
    const s = String(v).trim();
    const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (mdy) {
      const a = Number(mdy[1]);
      const b = Number(mdy[2]);
      const y = Number(mdy[3]);
      let month = a;
      let day = b;
      if (a > 12 && b <= 12) {
        day = a;
        month = b;
      } else if (b > 12 && a <= 12) {
        month = a;
        day = b;
      }
      const yyyy = String(y).padStart(4, '0');
      const mm = String(month).padStart(2, '0');
      const dd = String(day).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
    const ymd = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (ymd) {
      const yyyy = String(ymd[1]).padStart(4, '0');
      const mm = String(ymd[2]).padStart(2, '0');
      const dd = String(ymd[3]).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
    return s;
  };

  const normalizeTerritory = (value: any): string => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    const lower = raw.toLowerCase();
    if (lower === 'indonesian' || lower === 'bahasa indonesia' || lower === 'bahasa' || lower === 'indo' || lower === 'id') {
      return 'Indonesia';
    }
    if (lower === 'usa' || lower === 'us' || lower === 'united states of america') {
      return 'United States';
    }
    if (lower === 'uk' || lower === 'england' || lower === 'great britain') {
      return 'United Kingdom';
    }
    return raw;
  };

  const parseExcelFile = async (file: File) => {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array', cellDates: true });
    const sheetName = wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    const rawRows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
    return rawRows.map((r) => ({
      Title: String(r.Title || '').trim(),
      Version: String(r.Version || 'Original').trim(),
      ReleaseType: String(r.ReleaseType || 'SINGLE').trim(),
      Language: normalizeTerritory(r.Language),
      PrimaryArtists: String(r.PrimaryArtists || '').trim(),
      RecordLabel: String(r.RecordLabel || '').trim(),
      Genre: String(r.Genre || '').trim(),
      SubGenre: String(r.SubGenre || '').trim(),
      PLine: String(r.PLine || '').trim(),
      CLine: String(r.CLine || '').trim(),
      PlannedReleaseDate: toISODate(r.PlannedReleaseDate),
      OriginalReleaseDate: toISODate(r.OriginalReleaseDate),
      DistributionTargets: String(r.DistributionTargets || '').trim(),
      DistributionHistory: String(r.DistributionHistory || '').trim(),
      OwnerEmail: String(r.OwnerEmail || '').trim(),
      Aggregator: String(r.Aggregator || '').trim(),
      UPC: String(r.UPC || '').trim(),
      ISRC: String(r.ISRC || '').trim(),
      Author: String(r.Author || '').trim(),
      Komposer: String(r.Komposer || '').trim()
    }));
  };

  const handleUpload = async (file: File) => {
    setIsLoading(true);
    setRows([]);
    setSelected({});
    setResult(null);
    try {
      const list = await parseExcelFile(file);
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
      let usersByEmail = new Map<string, any>();
      try {
        const users = await api.getUsers(token);
        if (Array.isArray(users)) {
          users.forEach((u: any) => {
            if (u?.email) usersByEmail.set(String(u.email).toLowerCase(), u);
          });
        }
      } catch {}

      const optionMap: Record<string, any> = {
        'SOCIAL': { id: 'SOCIAL', label: 'Social Media', logo: '/assets/platforms/social.svg' },
        'YOUTUBE_MUSIC': { id: 'YOUTUBE_MUSIC', label: 'YouTube Music', logo: '/assets/platforms/youtube-music.svg' },
        'ALL_DSP': { id: 'ALL_DSP', label: 'All DSP', logo: '/assets/platforms/alldsp.svg' }
      };

      let inserted = 0;
      const errors: string[] = [];
      for (const row of chosen) {
        try {
          const title = String(row.Title || '').trim();
          if (!title) {
            errors.push('Missing Title');
            continue;
          }
          const version = String(row.Version || 'Original').trim() || 'Original';
          const type = (String(row.ReleaseType || 'SINGLE').toUpperCase() === 'ALBUM') ? 'ALBUM' : 'SINGLE';
          const primaryArtists = String(row.PrimaryArtists || '')
            .split(',')
            .map((s: string) => s.trim())
            .filter(Boolean);
          const distributionTargets = String(row.DistributionTargets || '')
            .split(',')
            .map((s: string) => s.trim())
            .filter(Boolean)
            .map((id: string) => optionMap[id])
            .filter(Boolean);

          const distHistRaw = String(row.DistributionHistory || '').trim().toLowerCase();
          const hasHistory = ['yes', 'y', 'true', '1'].includes(distHistRaw);

          const ownerEmail = String(row.OwnerEmail || '').trim().toLowerCase();
          const owner = ownerEmail ? usersByEmail.get(ownerEmail) : null;
          const payload: any = {
            title,
            version,
            type,
            primaryArtists,
            label: String(row.RecordLabel || '').trim() || null,
            genre: String(row.Genre || '').trim() || null,
            subGenre: String(row.SubGenre || '').trim() || null,
            pLine: String(row.PLine || '').trim() || null,
            cLine: String(row.CLine || '').trim() || null,
            language: normalizeTerritory(row.Language) || null,
            plannedReleaseDate: toISODate(row.PlannedReleaseDate) || null,
            originalReleaseDate: hasHistory ? (toISODate(row.OriginalReleaseDate) || null) : null,
            isNewRelease: !hasHistory,
            distributionTargets,
            aggregator: String(row.Aggregator || '').trim() || null,
            upc: String(row.UPC || '').trim() || null,
            tracks: []
          };
          if (owner && owner.id) {
            payload.userId = owner.id;
          }
          const isrc = String(row.ISRC || '').trim();
          const author = String(row.Author || '').trim();
          const komposer = String(row.Komposer || '').trim();
          if (type === 'SINGLE' && (isrc || author || komposer)) {
            payload.tracks = [
              {
                id: `import-${title}-${version}`,
                trackNumber: 1,
                title,
                version,
                primaryArtists,
                featuredArtists: [],
                audioFile: null,
                isrc: isrc || null,
                explicitLyrics: null,
                composer: komposer || null,
                lyricist: author ? [author] : null,
                producer: null,
                genre: payload.genre,
                subGenre: payload.subGenre,
                previewStart: 0
              }
            ];
          }

          const res = await api.createRelease(token, payload);
          if (res?.isDuplicate) {
            errors.push(`Duplikat: ${title} (${version})`);
          } else {
            inserted += 1;
          }
        } catch (e: any) {
          errors.push(e?.message || 'Import gagal');
        }
      }

      setResult({ inserted, errors });
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
                const headers = [
                  'Title','Version','ReleaseType','Language','PrimaryArtists',
                  'RecordLabel','Genre','SubGenre','PLine','CLine',
                  'PlannedReleaseDate','OriginalReleaseDate',
                  'DistributionTargets','DistributionHistory',
                  'OwnerEmail','Aggregator','UPC','ISRC','Author','Komposer'
                ];
                const sample = [{
                  Title: 'Contoh Lagu Demo',
                  Version: 'Original',
                  ReleaseType: 'SINGLE',
                  Language: 'Indonesia',
                  PrimaryArtists: 'Artist Satu, Artist Dua',
                  RecordLabel: 'Dimensi Suara Records',
                  Genre: 'Pop',
                  SubGenre: 'Indie Pop',
                  PLine: '2026 Dimensi Suara',
                  CLine: '2026 Dimensi Suara',
                  PlannedReleaseDate: new Date(Date.now() + 7*24*60*60*1000).toISOString().slice(0,10),
                  OriginalReleaseDate: '',
                  DistributionTargets: 'SOCIAL,YOUTUBE_MUSIC,ALL_DSP',
                  DistributionHistory: 'Yes',
                  OwnerEmail: 'owner@example.com',
                  Aggregator: 'SoundOn',
                  UPC: '123456789012',
                  ISRC: 'USABC1234567',
                  Author: 'Lyric Writer Name',
                  Komposer: 'Composer Name'
                }];
                const wb = XLSX.utils.book_new();
                const ws = XLSX.utils.json_to_sheet(sample, { header: headers });
                (ws as any)['!cols'] = headers.map((h: string) => ({ wch: Math.max(h.length, 18) }));
                XLSX.utils.book_append_sheet(wb, ws, 'Releases');
                const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
                const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'release_import_template.xlsx';
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
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
            <div className="text-xs text-slate-600">
              Total: {rows.length} • Dipilih: {selectedCount}
            </div>
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
