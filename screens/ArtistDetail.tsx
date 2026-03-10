import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ReleaseData } from '../types';
import { api } from '../utils/api';
import { assetUrl } from '../utils/url';
import { ChevronLeft, Edit2, X, Save, ExternalLink } from 'lucide-react';

const SpotifyIcon = (props: any) => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0zm5.284 17.383a.748.748 0 0 1-1.028.27c-2.813-1.72-6.356-2.107-10.533-1.146a.75.75 0 1 1-.33-1.464c4.55-1.026 8.474-.584 11.524 1.28.356.217.47.682.367 1.06zM17.5 14.1a.6.6 0 0 1-.824.216c-2.415-1.454-6.092-1.88-8.946-1.02a.6.6 0 1 1-.349-1.151c3.227-.978 7.283-.506 10.017 1.147.28.168.372.53.102.808zM15.9 10.9a.5.5 0 0 1-.69.181c-2.14-1.26-5.387-1.375-7.768-.734a.5.5 0 0 1-.259-.966c2.679-.72 6.233-.573 8.676.88.24.141.32.452.041.639z"/>
  </svg>
);

interface Props {
  releases: ReleaseData[];
  token: string;
  onArtistUpdated?: () => void;
}

export const ArtistDetail: React.FC<Props> = ({ releases, token, onArtistUpdated }) => {
  const params = useParams();
  const navigate = useNavigate();
  const artistName = decodeURIComponent(params.name || '');
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [trackTab, setTrackTab] = useState<'SINGLE' | 'ALBUM'>('SINGLE');
  const userRole = localStorage.getItem('cms_role') || '';

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [newSpotifyLink, setNewSpotifyLink] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const artistInfo = useMemo(() => {
    let spotifyLink: string | undefined;
    releases.forEach(r => {
      (r.primaryArtists || []).forEach(a => {
        const nm = typeof a === 'string' ? a : a.name;
        if (nm && nm.trim().toLowerCase() === artistName.toLowerCase()) {
          if (!spotifyLink && typeof a !== 'string') spotifyLink = a.spotifyLink || undefined;
        }
      });
      r.tracks?.forEach(t => {
        t.artists?.forEach(ta => {
          if (ta.role === 'MainArtist' && ta.name && ta.name.trim().toLowerCase() === artistName.toLowerCase()) {
            if (!spotifyLink) spotifyLink = (ta as any).spotifyLink || undefined;
          }
        });
      });
    });
    return { spotifyLink };
  }, [releases, artistName]);

  useEffect(() => {
    if (artistInfo.spotifyLink) {
      setNewSpotifyLink(artistInfo.spotifyLink);
    }
  }, [artistInfo.spotifyLink]);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        let prof: any = null;
        // 1) Try by stored spotifyLink (if available)
        if (artistInfo.spotifyLink) {
          prof = await api.spotify.getArtistByLink(artistInfo.spotifyLink);
        }
        // 2) Fallback to search by name
        if (!prof || (!prof.thumbnail && !prof.image)) {
          const res = await api.spotify.searchArtist(artistName, 1);
          const first = Array.isArray(res?.items) ? res.items[0] : null;
          // Only use if name matches (case insensitive)
          if (first && first.name?.toLowerCase() === artistName.toLowerCase()) {
            // If both exist, prefer object with image
            if (first && (!prof || !prof.thumbnail)) prof = first;
            // Ensure url present
            if (prof && !prof.url && first?.url) prof.url = first.url;
          } else if (!artistInfo.spotifyLink) {
            // Only nullify if we didn't have a direct link success
            prof = null;
          }
        }
        setProfile(prof || null);
      } catch {
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };
    if (artistName) run();
  }, [artistName, artistInfo.spotifyLink]);

  const handleUpdateSpotify = async () => {
    if (!token) return;
    setIsUpdating(true);
    try {
      await api.updateArtistSpotify(token, artistName, newSpotifyLink);
      setIsEditModalOpen(false);
      onArtistUpdated?.();
      // Optional: show success message
    } catch (err: any) {
      alert("Gagal memperbarui link: " + (err.message || "Unknown error"));
    } finally {
      setIsUpdating(false);
    }
  };

  const artistReleases = useMemo(() => {
    const norm = (s?: string) => String(s || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    const target = norm(artistName);
    const uniq: Record<string, boolean> = {};
    const out: ReleaseData[] = [];

    releases.forEach(r => {
      const primaryMatch = (r.primaryArtists || []).some(a => {
        const nm = typeof a === 'string' ? a : a?.name;
        return norm(nm) === target;
      });
      const trackMainMatch = (r.tracks || []).some((t: any) => {
        const artists = Array.isArray(t?.artists) ? t.artists : [];
        return artists.some((a: any) => a?.role === 'MainArtist' && norm(a?.name) === target);
      });
      if (!primaryMatch && !trackMainMatch) return;
      const id = String((r as any).id || '');
      if (id && uniq[id]) return;
      if (id) uniq[id] = true;
      out.push(r);
    });

    const parseDate = (v: any) => {
      const raw = String(v || '').trim();
      if (!raw) return 0;
      const d = new Date(raw);
      const t = d.getTime();
      return Number.isFinite(t) ? t : 0;
    };

    return out.sort((a: any, b: any) => {
      const ad = parseDate(a.plannedReleaseDate) || parseDate(a.originalReleaseDate) || parseDate(a.submissionDate) || 0;
      const bd = parseDate(b.plannedReleaseDate) || parseDate(b.originalReleaseDate) || parseDate(b.submissionDate) || 0;
      return bd - ad;
    });
  }, [releases, artistName]);

  const getReleaseKind = (r: ReleaseData) => {
    const type = String((r as any).type || '').toUpperCase();
    if (type === 'ALBUM') return 'ALBUM';
    if (type === 'SINGLE') return 'SINGLE';
    const cnt = Array.isArray((r as any).tracks) ? (r as any).tracks.length : 0;
    return cnt > 1 ? 'ALBUM' : 'SINGLE';
  };

  const statusBadge = (statusRaw: any) => {
    const s = String(statusRaw || '').trim();
    const v = s.toLowerCase();
    if (v === 'live') return { label: 'Released', cls: 'bg-green-100 text-green-700 border-green-200' };
    if (v === 'processing') return { label: 'Processing', cls: 'bg-blue-100 text-blue-700 border-blue-200' };
    if (v === 'rejected') return { label: 'Rejected', cls: 'bg-red-100 text-red-700 border-red-200' };
    if (v === 'request edit') return { label: 'Request Edit', cls: 'bg-orange-100 text-orange-700 border-orange-200' };
    if (v === 'draft') return { label: 'Draft', cls: 'bg-slate-100 text-slate-700 border-slate-200' };
    if (v === 'pending') return { label: 'Pending', cls: 'bg-yellow-100 text-yellow-700 border-yellow-200' };
    return { label: s || '-', cls: 'bg-slate-100 text-slate-700 border-slate-200' };
  };

  const imageUrl = profile?.image || profile?.thumbnail || null;
  const openUrl = profile?.url || (profile?.id ? `https://open.spotify.com/artist/${profile.id}` : null);
  const displayName = artistName;

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-8">
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => navigate('/aggregator/artists')}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600"
          title="Kembali ke Daftar Artist"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-slate-800">Artist Detail</h1>
      </div>
      <div className="bg-green-50 border border-green-100 rounded-xl p-6 mb-8 flex items-center gap-4 shadow-md">
        <div className="w-20 h-20 rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center">
          {imageUrl ? (
            <img src={imageUrl} alt={displayName} className="w-full h-full object-cover" />
          ) : (
            <div className="text-slate-400 text-sm">{displayName.charAt(0)}</div>
          )}
        </div>
        <div className="flex-1">
          <div className="text-lg font-bold text-slate-800 flex items-center gap-2">
            {displayName}
            {(userRole === 'Admin' || userRole === 'Operator') && (
              <button 
                onClick={() => setIsEditModalOpen(true)}
                className="p-1.5 hover:bg-green-100 rounded-full text-green-600 transition-colors"
                title="Edit Spotify Link"
              >
                <Edit2 size={14} />
              </button>
            )}
          </div>
          {openUrl ? (
            <a 
              href={openUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-lg bg-green-600 text-white hover:bg-green-700"
              title="Open Spotify Artist Page"
            >
              <SpotifyIcon /> Artist Page
            </a>
          ) : (
            !loading && <div className="text-xs text-red-600 font-medium">Artist Tidak Terdaftar di Spotify</div>
          )}
          {(profile?.followers || profile?.popularity) && (
            <div className="mt-2 flex items-center gap-2">
              {typeof profile?.followers === 'number' && profile.followers > 0 && (
                <button
                  type="button"
                  onClick={() => { if (openUrl) window.open(openUrl, '_blank', 'noopener,noreferrer'); }}
                  disabled={!openUrl}
                  className="px-3 py-1 rounded-full text-[11px] font-bold border transition-colors disabled:opacity-50 border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                  title={openUrl ? 'Buka halaman Spotify artist' : 'Spotify URL tidak tersedia'}
                >
                  Followers: {profile.followers.toLocaleString()}
                </button>
              )}
              {typeof profile?.popularity === 'number' && (
                <button
                  type="button"
                  onClick={() => { if (openUrl) window.open(openUrl, '_blank', 'noopener,noreferrer'); }}
                  disabled={!openUrl}
                  className="px-3 py-1 rounded-full text-[11px] font-bold border transition-colors disabled:opacity-50 border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                  title={openUrl ? 'Buka halaman Spotify artist' : 'Spotify URL tidak tersedia'}
                >
                  Popularity: {profile.popularity}/100
                </button>
              )}
            </div>
          )}
          {loading && <div className="text-xs text-slate-500">Loading Spotify profile...</div>}
          {!loading && !profile && <div className="text-xs text-slate-500">Spotify profile tidak tersedia</div>}
        </div>
      </div>

      {/* Edit Spotify Link Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-800">Edit Spotify Link</h3>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 hover:bg-slate-200 rounded-full text-slate-400 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl flex gap-3">
                <ExternalLink size={18} className="text-blue-500 shrink-0 mt-0.5" />
                <div className="text-xs text-blue-700 leading-relaxed">
                  Masukkan link profil artis atau URI Spotify. Link ini akan diperbarui di seluruh rilis dan lagu milik <strong>{displayName}</strong>.
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Artist Spotify Link</label>
                <input 
                  type="text"
                  value={newSpotifyLink}
                  onChange={(e) => setNewSpotifyLink(e.target.value)}
                  placeholder="https://open.spotify.com/artist/..."
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors"
              >
                Batal
              </button>
              <button 
                onClick={handleUpdateSpotify}
                disabled={isUpdating}
                className="px-6 py-2 bg-green-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-green-200 hover:bg-green-700 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isUpdating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Simpan Perubahan
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="flex gap-2">
            <button
              onClick={() => setTrackTab('SINGLE')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg border ${
                trackTab === 'SINGLE' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200'
              }`}
            >
              Single
            </button>
            <button
              onClick={() => setTrackTab('ALBUM')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg border ${
                trackTab === 'ALBUM' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200'
              }`}
            >
              EP/Album
            </button>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                  <th className="px-4 py-3">Cover</th>
                  <th className="px-4 py-3">Release</th>
                  <th className="px-4 py-3">UPC</th>
                  <th className="px-4 py-3">Tracks</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {artistReleases
                  .filter(r => getReleaseKind(r) === trackTab)
                  .map((release: any) => {
                    const cover = release.coverArt;
                    const coverUrl = typeof cover === 'string' ? assetUrl(cover) : null;
                    const cnt = Array.isArray(release.tracks) ? release.tracks.length : 0;
                    const badge = statusBadge(release.status);
                    return (
                      <tr key={String(release.id)} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3">
                          <div className="w-10 h-10 rounded-md bg-slate-100 overflow-hidden border border-slate-200">
                            {coverUrl ? (
                              <img
                                src={coverUrl}
                                className="w-full h-full object-cover"
                                onError={(e) => { (e.target as HTMLImageElement).src = '/assets/placeholder-cover.jpg'; }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400">-</div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-bold text-slate-800">{release.title || '-'}</div>
                          <div className="text-[11px] text-slate-500">{trackTab === 'ALBUM' ? 'EP/Album' : 'Single'}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-700">{release.upc || '-'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-700">{cnt || '-'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[11px] font-bold ${badge.cls}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end">
                            <button
                              onClick={() => navigate(`/releases/${release.id}/view`)}
                              className="px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100 transition-colors"
                            >
                              Lihat Detail
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                {artistReleases.filter(r => getReleaseKind(r) === trackTab).length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-sm text-slate-500">
                      Belum ada release untuk artis ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
