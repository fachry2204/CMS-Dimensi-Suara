import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ReleaseData } from '../types';
import { api } from '../utils/api';
import { ReleaseDetailModal } from '../components/ReleaseDetailModal';

interface Props {
  token: string;
  aggregators: string[];
  onReleaseUpdated?: (release: ReleaseData) => void;
  onEditRelease?: (release: ReleaseData) => void;
  onDeleteRelease?: (release: ReleaseData) => void;
  resolveOwnerName?: (raw: any) => string;
}

export const ReleaseDetailsPage: React.FC<Props> = ({ token, aggregators, onReleaseUpdated, onEditRelease, onDeleteRelease, resolveOwnerName }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [release, setRelease] = useState<ReleaseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetail = async () => {
      if (!id) { setError('Invalid release id'); setLoading(false); return; }
      try {
        const raw: any = await api.getRelease(token, id);
        const mapArtists = (arr: any) => Array.isArray(arr) ? arr : (typeof arr === 'string' ? [arr] : []);
        const primaryArtists = mapArtists(raw.primaryArtists);

        const ownerDisplayName =
          (typeof resolveOwnerName === 'function' ? resolveOwnerName(raw) : '') ||
          raw.ownerDisplayName ||
          '';

        const mapped: ReleaseData = {
          id: String(raw.id),
          status: raw.status,
          submissionDate: raw.submission_date,
          aggregator: raw.aggregator,
          coverArt: raw.cover_art || null,
          type: raw.release_type,
          upc: raw.upc || '',
          title: raw.title || '',
          language: raw.language || '',
          primaryArtists,
          label: raw.label || '',
          genre: raw.genre || '',
          subGenre: raw.sub_genre || '',
          pLine: raw.p_line || '',
          cLine: raw.c_line || '',
          version: raw.version || '',
          tracks: (raw.tracks || []).map((t: any) => {
            const p = mapArtists(t.primaryArtists ?? t.primary_artists);
            const f = mapArtists(t.featuredArtists ?? t.featured_artists);
            return {
              id: String(t.id ?? `${raw.id}_${t.track_number}`),
              audioFile: t.audio_file || null,
              audioClip: t.audio_clip || null,
              videoFile: null,
              trackNumber: String(t.track_number ?? ''),
              releaseDate: '',
              isrc: t.isrc || '',
              title: t.title || '',
              duration: t.duration || '',
              artists: [
                ...p.map((name: string) => ({ name, role: 'MainArtist' })),
                ...f.map((name: string) => ({ name, role: 'FeaturedArtist' })),
              ],
              genre: t.genre || '',
              subGenre: t.sub_genre || '',
              isInstrumental: undefined,
              explicitLyrics: t.explicit_lyrics || 'No',
              composer: t.composer || '',
              lyricist: t.lyricist || '',
              lyrics: t.lyrics || '',
              contributors: Array.isArray(t.contributors) ? t.contributors : []
            };
          }),
          isNewRelease: raw.original_release_date ? false : true,
          originalReleaseDate: raw.original_release_date || '',
          plannedReleaseDate: raw.planned_release_date || ''
        };
        (mapped as any).ownerDisplayName = ownerDisplayName;
        setRelease(mapped);
      } catch (e: any) {
        setError(e?.message || 'Failed to load release detail');
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id, token]);

  if (loading) return null;
  if (error) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl">{error}</div>
        <button onClick={() => navigate('/releases')} className="mt-4 px-4 py-2 bg-slate-100 rounded-lg">Back</button>
      </div>
    );
  }
  if (!release) return null;

  return (
    <ReleaseDetailModal 
      release={release}
      isOpen={true}
      onClose={() => navigate('/releases')}
      onUpdate={async (r) => {
        try {
          await api.updateReleaseWorkflow(token, r);
          if (onReleaseUpdated) onReleaseUpdated(r);
          navigate('/releases');
        } catch (e: any) {
          alert(e?.message || 'Gagal menyimpan status release');
        }
      }}
      availableAggregators={aggregators}
      mode="view"
      onEdit={onEditRelease}
      onDelete={onDeleteRelease}
    />
  );
};
