import React, { useEffect, useMemo, useState } from 'react';
import { ReleaseData } from '../types';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';

interface Props {
  releases: ReleaseData[];
}

export const Artists: React.FC<Props> = ({ releases }) => {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<Record<string, { image?: string | null; url?: string | null }>>({});
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  const artists = useMemo(() => {
    const map: Record<string, { name: string; spotifyLink?: string; trackCount: number; releaseCount: number; albumCount: number; singleCount: number }> = {};
    releases.forEach(r => {
      const prim = (r.primaryArtists || []).map(a => typeof a === 'string' ? { name: a } : a);
      prim.forEach(a => {
        const key = (a.name || '').trim();
        if (!key) return;
        if (!map[key]) map[key] = { name: key, spotifyLink: a.spotifyLink, trackCount: 0, releaseCount: 0, albumCount: 0, singleCount: 0 };
        map[key].releaseCount += 1;
        if (Array.isArray(r.tracks) && r.tracks.length > 1) map[key].albumCount += 1; else map[key].singleCount += 1;
      });
      r.tracks?.forEach(t => {
        t.artists?.forEach(ta => {
          if (ta.role === 'MainArtist') {
            const key = (ta.name || '').trim();
            if (!key) return;
            if (!map[key]) map[key] = { name: key, spotifyLink: (ta as any).spotifyLink, trackCount: 0, releaseCount: 0, albumCount: 0, singleCount: 0 };
            map[key].trackCount += 1;
          }
        });
      });
    });
    return Object.values(map).sort((a, b) => b.trackCount - a.trackCount || a.name.localeCompare(b.name));
  }, [releases]);

  const filteredArtists = useMemo(() => {
    const norm = (s: string) => s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    const q = norm(String(query || ''));
    if (!q) return artists;
    return artists.filter(a => norm(a.name).includes(q));
  }, [artists, query]);

  useEffect(() => {
    setPage(1);
  }, [query]);

  const totalPages = Math.max(1, Math.ceil(filteredArtists.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const pageItems = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredArtists.slice(start, start + PAGE_SIZE);
  }, [filteredArtists, safePage]);

  const pageNumbers = useMemo(() => {
    const p = safePage;
    const t = totalPages;
    const nums: number[] = [];
    const start = Math.max(1, p - 2);
    const end = Math.min(t, p + 2);
    for (let i = start; i <= end; i++) nums.push(i);
    return nums;
  }, [safePage, totalPages]);

  const Pagination = () => (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="text-[11px] text-slate-500">
        Halaman {safePage} dari {totalPages}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setPage(1)}
          disabled={safePage === 1}
          className="px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors disabled:opacity-50 border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
        >
          First
        </button>
        <button
          type="button"
          onClick={() => setPage(safePage - 1)}
          disabled={safePage === 1}
          className="px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors disabled:opacity-50 border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
        >
          Prev
        </button>
        <div className="flex items-center gap-1.5">
          {pageNumbers.map(n => (
            <button
              key={n}
              type="button"
              onClick={() => setPage(n)}
              className={`w-9 h-9 rounded-lg border text-xs font-bold transition-colors ${
                n === safePage
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setPage(safePage + 1)}
          disabled={safePage === totalPages}
          className="px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors disabled:opacity-50 border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
        >
          Next
        </button>
        <button
          type="button"
          onClick={() => setPage(totalPages)}
          disabled={safePage === totalPages}
          className="px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors disabled:opacity-50 border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
        >
          Last
        </button>
      </div>
    </div>
  );

  // Fetch Spotify images/urls for cards
  useEffect(() => {
    let aborted = false;
    const run = async () => {
      const tasks = pageItems.map(async (a) => {
        if (profiles[a.name]) return;
        try {
          let prof: any = null;
          if (a.spotifyLink) {
            prof = await api.spotify.getArtistByLink(a.spotifyLink);
          }
          if (!prof || (!prof.image && !prof.thumbnail)) {
            const res = await api.spotify.searchArtist(a.name, 1);
            const first = Array.isArray(res?.items) ? res.items[0] : null;
            // Only use if name matches (case insensitive)
            if (first && first.name?.toLowerCase() === a.name.toLowerCase()) {
              prof = first;
            } else {
              prof = null;
            }
          }
          if (!aborted && prof) {
            setProfiles(prev => ({ ...prev, [a.name]: { image: prof.image || prof.thumbnail || null, url: prof.url || null } }));
          } else if (!aborted) {
            // Ensure we mark it as no profile so we don't keep searching
            setProfiles(prev => ({ ...prev, [a.name]: { image: null, url: null } }));
          }
        } catch {
          // ignore
        }
      });
      await Promise.allSettled(tasks);
    };
    if (pageItems.length > 0) run();
    return () => { aborted = true; };
  }, [pageItems, profiles]);

  const palette = [
    'from-blue-50 to-blue-100 border-blue-100',
    'from-indigo-50 to-indigo-100 border-indigo-100',
    'from-cyan-50 to-cyan-100 border-cyan-100',
    'from-emerald-50 to-emerald-100 border-emerald-100',
    'from-amber-50 to-amber-100 border-amber-100',
    'from-rose-50 to-rose-100 border-rose-100',
    'from-violet-50 to-violet-100 border-violet-100',
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-slate-800">Artists</h1>
          <button className="px-3 py-1 bg-green-600 text-white text-xs font-bold rounded-full shadow-sm hover:bg-green-700 transition-colors">
            Total Artis: {artists.length}
          </button>
        </div>
        <p className="text-xs text-slate-500">Daftar artis berdasarkan rilisan yang tersedia</p>
        <div className="mt-4">
          <div className="relative max-w-md">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari artis..."
              className="w-full pl-4 pr-10 py-2.5 border border-slate-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            {query.trim().length > 0 && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                title="Hapus pencarian"
              >
                ×
              </button>
            )}
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            Menampilkan {filteredArtists.length} dari {artists.length} artis
          </div>
        </div>
        {filteredArtists.length > 0 && (
          <div className="mt-4">
            <Pagination />
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {pageItems.map((a, idx) => {
          const bg = palette[idx % palette.length];
          const prof = profiles[a.name];
          return (
            <div key={a.name} className={`border rounded-xl p-4 flex flex-col gap-3 shadow-sm bg-gradient-to-br ${bg}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-white/70 flex items-center justify-center">
                  {prof?.image ? (
                    <img src={prof.image} alt={a.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs text-slate-500 font-bold">{a.name.charAt(0)}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-800 truncate">{a.name}</div>
                  <button
                    type="button"
                    onClick={() => navigate(`/aggregator/artists/${encodeURIComponent(a.name)}`)}
                    className="mt-1 inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border border-white/60 bg-white/80 text-slate-700 hover:bg-white transition-colors"
                    title="Buka detail artist"
                  >
                    Albums: {a.albumCount} • Singles: {a.singleCount}
                  </button>
                </div>
              </div>
              {prof?.url && (
                <a
                  href={prof.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full px-3 py-2 text-xs rounded text-center font-bold inline-flex items-center justify-center gap-2 bg-green-600 text-white hover:bg-green-700"
                  title="Open Spotify Artist Page"
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
                    <path d="M12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0zm5.284 17.383a.748.748 0 0 1-1.028.27c-2.813-1.72-6.356-2.107-10.533-1.146a.75.75 0 1 1-.33-1.464c4.55-1.026 8.474-.584 11.524 1.28.356.217.47.682.367 1.06zM17.5 14.1a.6.6 0 0 1-.824.216c-2.415-1.454-6.092-1.88-8.946-1.02a.6.6 0 1 1-.349-1.151c3.227-.978 7.283-.506 10.017 1.147.28.168.372.53.102.808zM15.9 10.9a.5.5 0 0 1-.69.181c-2.14-1.26-5.387-1.375-7.768-.734a.5.5 0 0 1-.259-.966c2.679-.72 6.233-.573 8.676.88.24.141.32.452.041.639z"/>
                  </svg>
                  Artist Page
                </a>
              )}
              <button
                onClick={() => navigate(`/aggregator/artists/${encodeURIComponent(a.name)}`)}
                className="w-full px-3 py-2 text-xs rounded bg-blue-600 text-white font-bold hover:bg-blue-700"
                title="Detail Artist"
              >
                Detail
              </button>
            </div>
          );
        })}
        {artists.length === 0 && (
          <div className="text-sm text-slate-500">Belum ada artis</div>
        )}
        {artists.length > 0 && filteredArtists.length === 0 && (
          <div className="text-sm text-slate-500">Artis tidak ditemukan</div>
        )}
      </div>
      {filteredArtists.length > 0 && (
        <div className="mt-6">
          <Pagination />
        </div>
      )}
    </div>
  );
};
