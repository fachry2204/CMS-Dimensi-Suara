import React, { useState, useRef, useEffect } from 'react';
import { ReleaseData, Track, TrackArtist, TrackContributor, ReleaseType } from '../../types';
import { Music, Trash2, PlusCircle, Info, ChevronDown, ChevronUp, FileAudio, Mic2, User, UserPlus, Loader2, Scissors, Play, Pause, X, Check, UploadCloud } from 'lucide-react';
import { ARTIST_ROLES, CONTRIBUTOR_TYPES, EXPLICIT_OPTIONS, TRACK_GENRES, SUB_GENRES_MAP } from '../../constants';
import { processFullAudio, cropAndConvertAudio, getAudioDuration } from '../../utils/audioProcessing';
import { api } from '../../utils/api';

interface Props {
  data: ReleaseData;
  updateData: (updates: Partial<ReleaseData> | ((prev: ReleaseData) => Partial<ReleaseData>)) => void;
  releaseType: ReleaseType;
}

// Sub-component for Audio Preview
const AudioPreview: React.FC<{ file: File | string }> = ({ file }) => {
    const [url, setUrl] = useState<string | null>(null);

    useEffect(() => {
        if (!file) {
            setUrl(null);
            return;
        }
        if (typeof file === 'string') {
            setUrl(file);
            return;
        }
        if (file instanceof Blob) {
            const objectUrl = URL.createObjectURL(file);
            setUrl(objectUrl);
            return () => URL.revokeObjectURL(objectUrl);
        }
        // Unknown type fallback
        setUrl(null);
    }, [file]);

    if (!url) return null;

    return (
        <audio controls className="w-full h-8">
            <source src={url} type={typeof file === 'string' ? 'audio/mpeg' : file.type} />
            Your browser does not support the audio element.
        </audio>
    );
};

export const Step2TrackInfo: React.FC<Props> = ({ data, updateData, releaseType }) => {
  const [expandedTrackId, setExpandedTrackId] = useState<string | null>(null);
  
  // Track processing state
  const [processingState, setProcessingState] = useState<{ [key: string]: boolean }>({});

  // Trimmer State
  const [trimmerState, setTrimmerState] = useState<{
    isOpen: boolean;
    trackId: string | null;
    rawFile: File | null;
    duration: number;
    startTime: number;
    isPlaying: boolean;
  }>({
    isOpen: false,
    trackId: null,
    rawFile: null,
    duration: 0,
    startTime: 0,
    isPlaying: false
  });

  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  
  // Stable Audio URL State to prevent src changing on every render
  const [stableAudioUrl, setStableAudioUrl] = useState<string | null>(null);

  useEffect(() => {
    if (trimmerState.rawFile) {
        const url = URL.createObjectURL(trimmerState.rawFile);
        setStableAudioUrl(url);
        return () => URL.revokeObjectURL(url);
    }
    setStableAudioUrl(null);
  }, [trimmerState.rawFile]);

  // Initialize first track if empty
  useEffect(() => {
    if (data.tracks.length === 0) {
       addTrack();
    }
  }, []);

  // Ensure only 1 track for Single Release
  useEffect(() => {
    if (releaseType === 'SINGLE' && data.tracks.length > 1) {
      updateData(prev => ({ tracks: [prev.tracks[0]] }));
    }
  }, [releaseType, data.tracks.length]);

  // Sync Track Data for Single Release
  useEffect(() => {
    if (releaseType === 'SINGLE' && data.tracks.length > 0) {
      const track = data.tracks[0];
      let updates: Partial<Track> = {};
      let hasUpdates = false;

      // 1. Sync Title
      if (track.title !== data.title) {
          updates.title = data.title;
          hasUpdates = true;
      }

      // 2. Sync Artists (Primary Artists -> MainArtist)
      const expectedArtists = data.primaryArtists
          .filter(name => name.trim() !== "")
          .map(name => ({ name, role: "MainArtist" }));
      
      const artistsToUse = expectedArtists.length > 0 ? expectedArtists : [{ name: "", role: "MainArtist" }];

      // Compare current vs expected
      const currentNames = track.artists.map(a => a.name).join('|');
      const expectedNames = artistsToUse.map(a => a.name).join('|');

      if (currentNames !== expectedNames) {
          updates.artists = artistsToUse;
          hasUpdates = true;
      }

      if (hasUpdates) {
          updateTrack(track.id, updates);
      }
    }
  }, [data.title, data.primaryArtists, releaseType]); // Only sync when Step 1 data changes

  // --- Trimmer Helpers ---
  const handleTrimmerPlayToggle = () => {
    if (previewAudioRef.current) {
        if (trimmerState.isPlaying) {
            previewAudioRef.current.pause();
            setTrimmerState(prev => ({ ...prev, isPlaying: false }));
        } else {
            previewAudioRef.current.currentTime = trimmerState.startTime;
            const playPromise = previewAudioRef.current.play();
            if (playPromise !== undefined) {
                playPromise
                    .then(() => {
                         setTrimmerState(prev => ({ ...prev, isPlaying: true }));
                    })
                    .catch(error => {
                        console.log("Playback interrupted or failed:", error);
                        // Reset playing state if failed
                        setTrimmerState(prev => ({ ...prev, isPlaying: false }));
                    });
            }
        }
    }
  };

  const handleTrimmerSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStart = Number(e.target.value);
    setTrimmerState(prev => ({ ...prev, startTime: newStart }));
    
    // Update audio position if playing or paused
    if (previewAudioRef.current) {
        // If the difference is significant, update current time
        if (Math.abs(previewAudioRef.current.currentTime - newStart) > 0.5) {
             previewAudioRef.current.currentTime = newStart;
        }
    }
  };

  const closeTrimmer = () => {
    if (previewAudioRef.current) {
        previewAudioRef.current.pause();
    }
    setTrimmerState({
        isOpen: false,
        trackId: null,
        rawFile: null,
        duration: 0,
        startTime: 0,
        isPlaying: false
    });
  };

  const saveTrimmedAudio = async () => {
      if (!trimmerState.rawFile || !trimmerState.trackId) return;
      
      const track = data.tracks.find(t => t.id === trimmerState.trackId);
      const trackTitle = track?.title || `Track-${track?.trackNumber}`;
      const processKey = `${trimmerState.trackId}-audioClip`;

      setProcessingState(prev => ({ ...prev, [processKey]: true }));
      updateTrack(trimmerState.trackId, { processingClip: true });
      closeTrimmer(); // Close inline trimmer

      try {
        const token = localStorage.getItem('cms_token') || '';
        if (token) {
            const trackIndex = data.tracks.findIndex(t => t.id === trimmerState.trackId);
            if (trackIndex >= 0) {
                const fieldName = `track_${trackIndex}_clip`;
                try {
                    const resp = await api.uploadTmpReleaseFile(
                        token,
                        { title: data.title, primaryArtists: data.primaryArtists },
                        fieldName,
                        trimmerState.rawFile
                    );
                    const candidate =
                      (resp && resp.paths && resp.paths[fieldName]) ||
                      (resp && resp.paths && resp.paths['file']) ||
                      (resp && resp.path) ||
                      (resp && resp.url) ||
                      (resp && resp[fieldName]) ||
                      '';
                    if (candidate) {
                        const prev = await api.generateClipPreview(token, candidate, trimmerState.startTime, 60);
                        const previewPath = prev.previewPath || candidate;
                        updateTrack(trimmerState.trackId, { tempClipPath: candidate, audioClip: previewPath, previewStart: trimmerState.startTime });
                    }
                } catch (e) {
                    console.error('Upload tmp audio clip failed:', e);
                    // Keep local clip and defer upload to final submit
                }
            }
        }
      } catch (error) {
          console.error(error);
          alert("Failed to trim audio.");
      } finally {
        setProcessingState(prev => {
            const newState = { ...prev };
            delete newState[processKey];
            return newState;
        });
        updateTrack(trimmerState.trackId, { processingClip: false });
      }
  };

  const toggleExpand = (id: string) => {
    setExpandedTrackId(expandedTrackId === id ? null : id);
  };

  const addTrack = () => {
    // Optimistic check to prevent unnecessary updates
    if (releaseType === 'SINGLE' && data.tracks.length >= 1) return;

    const newTrackId = Date.now().toString() + Math.random().toString(36).substr(2, 5);

    updateData(prev => {
      // Strict check inside updater to prevent race conditions (e.g. React Strict Mode)
      if (releaseType === 'SINGLE' && prev.tracks.length >= 1) {
          return {};
      }

      let initialArtists: TrackArtist[] = [{ name: "", role: "MainArtist" }];
      let initialTitle = "";

      if (releaseType === 'SINGLE') {
        const inheritedArtists: TrackArtist[] = prev.primaryArtists
          .filter(name => name.trim() !== "")
          .map(name => ({ name, role: "MainArtist" }));

        if (inheritedArtists.length > 0) {
          initialArtists = inheritedArtists;
        }
        initialTitle = prev.title || "";
      }

      const newTrack: Track = {
        id: newTrackId,
        title: initialTitle,
        trackNumber: (prev.tracks.length + 1).toString(),
        duration: "",
        releaseDate: prev.plannedReleaseDate || "",
        isrc: "",
        genre: "",
        isInstrumental: "No",
        explicitLyrics: "No",
        composer: "",
        lyricist: "",
        lyrics: "",
        artists: initialArtists,
        contributors: [],
      };
      
      return { tracks: [...prev.tracks, newTrack] };
    });
    
    // Set expanded outside the updater
    setExpandedTrackId(newTrackId);
  };

  const removeTrack = (id: string) => {
    if (releaseType === 'SINGLE') return;
    if (confirm('Are you sure you want to remove this track?')) {
      updateData(prev => ({ tracks: prev.tracks.filter(t => t.id !== id) }));
    }
  };

  const updateTrack = (id: string, updates: Partial<Track>) => {
    updateData(prev => ({
      tracks: prev.tracks.map(t => (t.id === id ? { ...t, ...updates } : t)),
    }));
  };

  const [convertProgress, setConvertProgress] = useState<Record<string, { audio?: number; clip?: number }>>({});
  const setAudioProgress = (trackId: string, p: number) => {
    setConvertProgress(prev => ({ ...prev, [trackId]: { ...(prev[trackId] || {}), audio: p } }));
  };
  const setClipProgress = (trackId: string, p: number) => {
    setConvertProgress(prev => ({ ...prev, [trackId]: { ...(prev[trackId] || {}), clip: p } }));
  };

  // --- File Handlers ---
  const handleFileChange = async (trackId: string, field: 'audioFile' | 'audioClip' | 'iplFile', file: File | null) => {
    if (!file) {
        updateTrack(trackId, { [field]: null });
        return;
    }

    const processKey = `${trackId}-${field}`;
    const track = data.tracks.find(t => t.id === trackId);
    // Fallback title if empty
    const trackNameBase = track?.title && track.title.trim() !== "" ? track.title : `Track-${track?.trackNumber}`;

    if (field === 'iplFile') {
        updateTrack(trackId, { [field]: file });
        return;
    }

    // 1. Handle Full Audio (WAV Force Convert & Rename)
    if (field === 'audioFile') {
        if (file) {
            updateTrack(trackId, { audioFile: file });
        }
        setProcessingState(prev => ({ ...prev, [processKey]: true }));
        updateTrack(trackId, { processingAudio: true });
            try {
            const token = localStorage.getItem('cms_token') || '';
            if (token) {
                const trackIndex = data.tracks.findIndex(t => t.id === trackId);
                if (trackIndex >= 0) {
                    const fieldName = `track_${trackIndex}_audio`;
                    try {
                        // Use chunked upload for almost all audio files (threshold > 1MB) to bypass typical Nginx 2MB limits
                        const useChunk = (file?.size || 0) > (1 * 1024 * 1024);
                        const resp = useChunk
                          ? await api.uploadTmpReleaseFileChunked(
                              token,
                              { title: data.title, primaryArtists: data.primaryArtists },
                              fieldName,
                              file,
                              10 * 1024 * 1024,
                              (p: number) => setAudioProgress(trackId, p)
                            )
                          : await api.uploadTmpReleaseFile(
                              token,
                              { title: data.title, primaryArtists: data.primaryArtists },
                              fieldName,
                              file
                            );
                    const candidate =
                      (resp && resp.paths && resp.paths[fieldName]) ||
                      (resp && resp.paths && resp.paths['file']) ||
                      (resp && resp.path) ||
                      (resp && resp.url) ||
                      (resp && resp[fieldName]) ||
                      '';
                    if (candidate) {
                        updateTrack(trackId, { tempAudioPath: candidate, audioFile: candidate });
                    }
                    } catch (e) {
                        console.error('Upload tmp audio failed:', e);
                        // Keep local file and defer upload to final submit
                    }
                }
            }
        } catch (error) {
            console.error("File processing error:", error);
            alert("Error processing Full Audio.");
        } finally {
            setProcessingState(prev => {
                const newState = { ...prev };
                delete newState[processKey];
                return newState;
            });
            updateTrack(trackId, { processingAudio: false });
        }
    } 
    
    // 2. Handle Audio Clip (Open Trimmer)
    else if (field === 'audioClip') {
        if (file) {
            updateTrack(trackId, { audioClip: file });
        }
        try {
            const duration = await getAudioDuration(file);
            // If user uploads a ready 60s clip, accept it directly and upload to TMP
            if (duration >= 58 && duration <= 62) {
                const token = localStorage.getItem('cms_token') || '';
                if (token) {
                    const trackIndex = data.tracks.findIndex(t => t.id === trackId);
                    if (trackIndex >= 0) {
                        const fieldName = `track_${trackIndex}_clip`;
                        try {
                            setProcessingState(prev => ({ ...prev, [`${trackId}-audioClip`]: true }));
                            updateTrack(trackId, { processingClip: true });
                            // Same for clip, lower threshold to 1MB
                            const useChunk = (file?.size || 0) > (1 * 1024 * 1024);
                            const resp = useChunk
                              ? await api.uploadTmpReleaseFileChunked(
                                  token,
                                  { title: data.title, primaryArtists: data.primaryArtists },
                                  fieldName,
                                  file,
                                  10 * 1024 * 1024,
                                  (p: number) => setClipProgress(trackId, p)
                                )
                              : await api.uploadTmpReleaseFile(
                                  token,
                                  { title: data.title, primaryArtists: data.primaryArtists },
                                  fieldName,
                                  file
                                );
                            const candidate =
                              (resp && resp.paths && resp.paths[fieldName]) ||
                              (resp && resp.paths && resp.paths['file']) ||
                              (resp && resp.path) ||
                              (resp && resp.url) ||
                              (resp && resp[fieldName]) ||
                              '';
                            if (candidate) {
                                updateTrack(trackId, { tempClipPath: candidate, audioClip: candidate, previewStart: 0 });
                                return;
                            }
                        } catch (e) {
                            console.error('Upload tmp 60s clip failed:', e);
                            // Fallback to trimmer UI below
                        } finally {
                            setProcessingState(prev => {
                                const p = { ...prev };
                                delete p[`${trackId}-audioClip`];
                                return p;
                            });
                            updateTrack(trackId, { processingClip: false });
                        }
                    }
                }
            }
            // Otherwise, open trimmer to produce a 60s clip
            setTrimmerState({
                isOpen: true,
                trackId: trackId,
                rawFile: file,
                duration: duration,
                startTime: 0,
                isPlaying: false
            });
        } catch (e) {
            alert("Could not read audio file for clipping.");
        }
    }
  };

  // --- Nested Array Handlers ---
  const handleArtistChange = (trackId: string, index: number, field: keyof TrackArtist, value: string) => {
    const track = data.tracks.find(t => t.id === trackId);
    if (!track) return;
    const newArtists = [...track.artists];
    newArtists[index] = { ...newArtists[index], [field]: value };
    updateTrack(trackId, { artists: newArtists });
  };

  const addArtist = (trackId: string) => {
    const track = data.tracks.find(t => t.id === trackId);
    if (!track) return;
    updateTrack(trackId, { artists: [...track.artists, { name: "", role: "MainArtist" }] });
  };

  const removeArtist = (trackId: string, index: number) => {
    const track = data.tracks.find(t => t.id === trackId);
    if (!track) return;
    if (track.artists.length > 1) {
        updateTrack(trackId, { artists: track.artists.filter((_, i) => i !== index) });
    }
  };

  const handleContributorChange = (trackId: string, index: number, field: keyof TrackContributor, value: string) => {
    const track = data.tracks.find(t => t.id === trackId);
    if (!track) return;
    const newContribs = [...track.contributors];
    newContribs[index] = { ...newContribs[index], [field]: value };
    updateTrack(trackId, { contributors: newContribs });
  };

  const addContributor = (trackId: string) => {
    const track = data.tracks.find(t => t.id === trackId);
    if (!track) return;
    updateTrack(trackId, { contributors: [...track.contributors, { name: "", type: "Performer", role: "" }] });
  };

  const removeContributor = (trackId: string, index: number) => {
    const track = data.tracks.find(t => t.id === trackId);
    if (!track) return;
    updateTrack(trackId, { contributors: track.contributors.filter((_, i) => i !== index) });
  };

  return (
    <div className="w-full max-w-5xl mx-auto relative">
       <div className="flex justify-between items-end mb-5 border-b border-gray-100 pb-4">
        <div>
            <h2 className="text-sm font-medium text-slate-800 mb-1">Tracklist</h2>
            <p className="text-[10px] text-slate-500">Upload audio and fill in details for each track.</p>
        </div>
        
        {releaseType === 'ALBUM' && (
          <button 
              onClick={addTrack}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 shadow-sm transition-all hover:-translate-y-0.5 text-[10px]"
          >
              <PlusCircle size={12} />
              Add Track
          </button>
        )}
      </div>
      
      <div className="space-y-4">
        {data.tracks.map((track, index) => {
            const isExpanded = releaseType === 'SINGLE' || expandedTrackId === track.id;
            const isProcessingAudio = processingState[`${track.id}-audioFile`];
            const isProcessingClip = processingState[`${track.id}-audioClip`];
            
            // Check if Trimmer should be active for this specific track
            const isTrimmerActive = trimmerState.isOpen && trimmerState.trackId === track.id && trimmerState.rawFile;

            return (
                <div key={track.id} className={`bg-white rounded-xl border transition-all duration-300 ${isExpanded ? 'border-blue-200 shadow-sm ring-1 ring-blue-50' : 'border-gray-200 hover:border-blue-300'}`}>
                    {/* Header */}
                    <div 
                        className={`flex items-center justify-between p-3 ${releaseType === 'SINGLE' ? '' : 'cursor-pointer'}`}
                        onClick={() => releaseType !== 'SINGLE' && toggleExpand(track.id)}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-medium text-xs ${isExpanded ? 'bg-blue-500 text-white' : 'bg-gray-100 text-slate-500'}`}>
                                {track.trackNumber}
                            </div>
                            <div>
                                <h3 className={`font-medium text-[10px] ${track.title ? 'text-slate-800' : 'text-slate-400 italic'}`}>
                                {track.title || "Untitled Track"}
                            </h3>
                                <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-1">
                                    {isProcessingAudio ? (
                                        <span className="flex items-center gap-1 text-blue-600 font-medium">
                                            <Loader2 size={12} className="animate-spin" /> Converting...
                                        </span>
                                    ) : track.audioFile ? (
                                        typeof track.audioFile === 'string' ? (
                                            <span className="flex items-center gap-1 text-green-600 font-medium">
                                                <FileAudio size={12} /> Uploaded
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-yellow-600 font-medium">
                                                <UploadCloud size={12} /> Local (will upload)
                                            </span>
                                        )
                                    ) : null}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                             {/* Only show delete button if it's an Album */}
                             {releaseType === 'ALBUM' && (
                               <button 
                                  onClick={(e) => { e.stopPropagation(); removeTrack(track.id); }}
                                  className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                               >
                                  <Trash2 size={18} />
                               </button>
                             )}
                            {releaseType !== 'SINGLE' && (
                                isExpanded ? <ChevronUp className="text-blue-500" /> : <ChevronDown className="text-gray-400" />
                            )}
                        </div>
                    </div>

                    {/* Content */}
                    {isExpanded && (
                        <div className="p-6 pt-2 border-t border-gray-100 animate-fade-in">
                            
                            {/* 1. File Uploads */}
                            <div className="bg-slate-50 rounded-xl p-4 mb-4 border border-slate-100">
                                <h4 className="text-[10px] font-medium text-slate-700 mb-2 uppercase tracking-wider flex items-center gap-2">
                                    <FileAudio size={14} /> Files
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* FULL AUDIO */}
                                    <div className="md:col-span-2 space-y-2">
                                        <label className="block text-[10px] font-medium text-slate-700 mb-1 flex items-center justify-between">
                                            <span>Full Audio (WAV 24-bit / 48kHz) <span className="text-red-500">*</span></span>
                                            {isProcessingAudio && (
                                              <span className="text-[10px] text-blue-500 flex items-center gap-2">
                                                <Loader2 size={10} className="animate-spin"/>
                                                <span>Uploading {Math.round(convertProgress[track.id]?.audio || 0)}%</span>
                                              </span>
                                            )}
                                        </label>
                                        
                                        <label className={`
                                            relative flex flex-row items-center justify-between w-full px-4 py-2
                                            border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 group
                                            ${track.audioFile ? 'border-blue-300 bg-blue-50/50' : 'border-gray-300 bg-white hover:bg-gray-50 hover:border-blue-300'}
                                            ${isProcessingAudio ? 'opacity-50 cursor-not-allowed' : ''}
                                        `}>
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                {track.audioFile ? (
                                                    <>
                                                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 flex-shrink-0">
                                                            <FileAudio size={14} />
                                                        </div>
                                                        <div className="flex flex-col min-w-0">
                                                            <p className="text-[10px] font-medium text-blue-900 truncate">
                                                                {typeof track.audioFile === 'string' ? 'Existing Audio' : track.audioFile.name}
                                                            </p>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] text-blue-500">Uploaded</span>
                                                                <div className="scale-75 origin-left w-32">
                                                                    <AudioPreview file={track.audioFile} />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 group-hover:bg-blue-100 group-hover:text-blue-500 transition-colors flex-shrink-0">
                                                            <FileAudio size={14} />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <p className="text-[10px] font-medium text-gray-600 group-hover:text-blue-600 transition-colors">Click to upload Full Audio</p>
                                                            <p className="text-[10px] text-gray-400">WAV 24-bit / 48kHz</p>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                            
                                            {!track.audioFile && (
                                                <div className="hidden sm:block">
                                                    <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded text-[10px] font-medium border border-gray-200">Select File</span>
                                                </div>
                                            )}

                                            <input 
                                                type="file" 
                                                accept="audio/*"
                                                className="hidden" 
                                                disabled={isProcessingAudio}
                                                onChange={(e) => handleFileChange(track.id, 'audioFile', e.target.files?.[0] || null)}
                                            />
                                        </label>
                                    </div>
                                    
                                    {/* AUDIO CLIP */}
                                    <div className="md:col-span-2 space-y-2">
                                        <label className="block text-[10px] font-medium text-slate-700 mb-1 flex items-center justify-between">
                                            <span>Audio Clip (60s, 24-bit / 48kHz) <span className="text-red-500">*</span></span>
                                            {isProcessingClip && (
                                              <span className="text-[10px] text-orange-500 flex items-center gap-2">
                                                <Loader2 size={10} className="animate-spin"/>
                                                <span>Processing {Math.round(convertProgress[track.id]?.clip || 0)}%</span>
                                              </span>
                                            )}
                                        </label>
                                        
                                        <label className={`
                                            relative flex flex-row items-center justify-between w-full px-4 py-2
                                            border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 group
                                            ${track.audioClip ? 'border-orange-300 bg-orange-50/50' : 'border-gray-300 bg-white hover:bg-gray-50 hover:border-orange-300'}
                                            ${isProcessingClip ? 'opacity-50 cursor-not-allowed' : ''}
                                        `}>
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                {track.audioClip ? (
                                                    <>
                                                        <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 flex-shrink-0">
                                                            <Scissors size={14} />
                                                        </div>
                                                        <div className="flex flex-col min-w-0">
                                                            <p className="text-[10px] font-medium text-orange-900 truncate">
                                                                {typeof track.audioClip === 'string' ? 'Existing Clip' : track.audioClip.name}
                                                            </p>
                                                            <div className="flex items-center gap-2 w-full">
                                                                <span className="text-[10px] text-orange-500 whitespace-nowrap">Ready</span>
                                                                <div className="scale-75 origin-left w-[133%]">
                                                                    <AudioPreview file={track.audioClip} />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 group-hover:bg-orange-100 group-hover:text-orange-500 transition-colors flex-shrink-0">
                                                            <Scissors size={14} />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <p className="text-[10px] font-medium text-gray-600 group-hover:text-orange-600 transition-colors">Click to upload Audio Clip</p>
                                                            <p className="text-[10px] text-gray-400">Opens Trimmer Tool on upload</p>
                                                        </div>
                                                    </>
                                                )}
                                            </div>

                                            {!track.audioClip && (
                                                <div className="hidden sm:block">
                                                    <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded text-[10px] font-medium border border-gray-200">Select File</span>
                                                </div>
                                            )}

                                            <input 
                                                type="file" 
                                                accept="audio/*"
                                                className="hidden" 
                                                disabled={isProcessingClip}
                                                onChange={(e) => handleFileChange(track.id, 'audioClip', e.target.files?.[0] || null)}
                                            />
                                        </label>

                                        {/* INLINE TRIMMER UI */}
                                        {isTrimmerActive && (
                                            <div className="mt-4 p-4 bg-white rounded-xl border-2 border-blue-100 shadow-sm animate-fade-in">
                                                <div className="flex justify-between items-center mb-4">
                                                    <h3 className="text-[10px] font-medium text-slate-800 flex items-center gap-2">
                                                        <Scissors size={14} className="text-blue-500" />
                                                        Trim Audio Clip
                                                    </h3>
                                                    <button onClick={closeTrimmer} className="text-slate-400 hover:text-slate-600">
                                                        <X size={16} />
                                                    </button>
                                                </div>

                                                <div className="bg-slate-50 rounded-xl p-3 mb-4 border border-slate-200">
                                                    <div className="text-center mb-3">
                                                        <div className="text-sm font-mono font-medium text-blue-600">
                                                            {new Date(trimmerState.startTime * 1000).toISOString().substr(14, 5)} - {new Date((trimmerState.startTime + 60) * 1000).toISOString().substr(14, 5)}
                                                        </div>
                                                        <p className="text-[10px] text-slate-400 mt-1">Duration: 60 Seconds</p>
                                                    </div>

                                                    <div className="flex items-center gap-3">
                                                         <button 
                                                            onClick={handleTrimmerPlayToggle}
                                                            className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-colors flex-shrink-0"
                                                         >
                                                            {trimmerState.isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-1" />}
                                                         </button>
                                                         <div className="flex-1 relative">
                                                             <input 
                                                                type="range" 
                                                                min="0" 
                                                                max={Math.max(0, trimmerState.duration - 60)} 
                                                                step="1" 
                                                                value={trimmerState.startTime}
                                                                onChange={handleTrimmerSliderChange}
                                                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                                             />
                                                         </div>
                                                    </div>
                                                </div>
                                                
                                                {/* Hidden Audio for preview logic */}
                                                <audio 
                                                    ref={previewAudioRef} 
                                                    src={stableAudioUrl || undefined} 
                                                    onTimeUpdate={(e) => {
                                                        if (e.currentTarget.currentTime >= trimmerState.startTime + 60) {
                                                            e.currentTarget.currentTime = trimmerState.startTime;
                                                        }
                                                    }}
                                                />

                                                <div className="flex gap-3 justify-end">
                                                    <button 
                                                        onClick={closeTrimmer}
                                                        className="px-4 py-2 text-slate-500 font-medium text-xs hover:bg-slate-100 rounded-lg transition-colors"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button 
                                                        onClick={saveTrimmedAudio}
                                                        className="px-4 py-2 bg-blue-600 text-white font-medium text-xs rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                                                    >
                                                        <Check size={14} />
                                                        Crop 60s Clip
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* IPL Document (if required by version) */}
                                    {['Cover','Remix','Remastered'].includes(data.version) && (
                                      <div className="space-y-2 md:col-span-2">
                                        <label className="text-[10px] font-medium text-slate-600 flex items-center justify-between">
                                            <span>IPL Document (Izin Penggunaan Lagu)</span>
                                            <Info size={12} className="text-slate-400" />
                                        </label>
                                        <input 
                                            type="file"
                                            onChange={(e) => handleFileChange(track.id, 'iplFile', e.target.files?.[0] || null)}
                                            className="block w-full text-[10px] text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-medium cursor-pointer border border-gray-200 rounded-lg bg-white file:bg-amber-100 file:text-amber-700 hover:file:bg-amber-200"
                                        />
                                        {track.iplFile && (
                                          <p className="text-[10px] text-amber-600 font-medium mt-1 truncate">
                                            📄 Attached: {typeof track.iplFile === 'string' ? 'Existing Document' : track.iplFile.name}
                                          </p>
                                        )}
                                      </div>
                                    )}
                                </div>
                            </div>

                            {/* 2. Basic Metadata */}
                            <div className="border border-gray-200 rounded-lg p-3 mb-4 relative">
                                <h4 className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-3 absolute -top-2 left-3 bg-white px-1">Track Metadata</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {releaseType === 'ALBUM' && (
                                      <div>
                                          <label className="block text-[10px] font-medium text-slate-700 mb-1">Track Number <span className="text-red-500">*</span></label>
                                          <input 
                                              value={track.trackNumber}
                                              onChange={(e) => updateTrack(track.id, { trackNumber: e.target.value })}
                                              className="w-full px-2.5 py-1.5 text-[10px] border border-gray-300 rounded focus:border-blue-500 focus:outline-none"
                                              placeholder="1"
                                          />
                                      </div>
                                    )}
                                    {/* Release Date Field Removed as per request */}
                                    <div>
                                        <label className="block text-[10px] font-medium text-slate-700 mb-1">ISRC Code (Jika sudah rilis sebelumnya)</label>
                                        <input 
                                            value={track.isrc}
                                            onChange={(e) => updateTrack(track.id, { isrc: e.target.value })}
                                            className="w-full px-2.5 py-1.5 text-[10px] border border-gray-300 rounded focus:border-blue-500 focus:outline-none bg-gray-50 placeholder-gray-400"
                                            placeholder="e.g. USABC1234567"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-medium text-slate-700 mb-1">Track Title <span className="text-red-500">*</span></label>
                                        <input 
                                            value={track.title}
                                            onChange={(e) => updateTrack(track.id, { title: e.target.value })}
                                            className="w-full px-2.5 py-1.5 text-[10px] border border-gray-300 rounded focus:border-blue-500 focus:outline-none"
                                            placeholder="Enter song title"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* 3. Artists */}
                            <div className="border border-gray-200 rounded-lg p-3 mb-4 relative">
                                <h4 className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-3 absolute -top-2 left-3 bg-white px-1">Artists</h4>
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-medium text-slate-700 mb-1 flex items-center gap-2">
                                        Primary Artists <span className="text-red-500">*</span>
                                    </label>
                                    {track.artists.map((artist, idx) => (
                                        <div key={idx} className="flex gap-2">
                                            <input 
                                                value={artist.name}
                                                onChange={(e) => handleArtistChange(track.id, idx, 'name', e.target.value)}
                                                className="flex-[2] px-2.5 py-1.5 text-[10px] border border-gray-300 rounded focus:border-blue-500 focus:outline-none"
                                                placeholder="Artist Name"
                                            />
                                            <div className="flex-1 relative">
                                                <select 
                                                    value={artist.role}
                                                    onChange={(e) => handleArtistChange(track.id, idx, 'role', e.target.value)}
                                                    className="w-full px-2.5 py-1.5 text-[10px] border border-gray-300 rounded focus:border-blue-500 focus:outline-none appearance-none bg-white"
                                                >
                                                    {ARTIST_ROLES.map(role => <option key={role} value={role}>{role}</option>)}
                                                </select>
                                                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-500">
                                                    <ChevronDown size={12} />
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => removeArtist(track.id, idx)}
                                                className={`p-1.5 rounded transition-colors ${track.artists.length > 1 ? 'text-red-500 bg-red-50 hover:bg-red-100' : 'text-gray-300 bg-gray-50 cursor-not-allowed'}`}
                                                disabled={track.artists.length <= 1}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <button 
                                    onClick={() => addArtist(track.id)}
                                    className="mt-2 text-[10px] font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                >
                                    <PlusCircle size={14} /> Add Artist
                                </button>
                            </div>

                            <hr className="border-gray-100 mb-4" />

                            {/* 4. Details */}
                            <div className="border border-gray-200 rounded-lg p-3 mb-4 relative">
                                <h4 className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-3 absolute -top-2 left-3 bg-white px-1">Track Details</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                                    <div>
                                        <label className="block text-[10px] font-medium text-slate-700 mb-1">Instrumental <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <select 
                                                value={track.isInstrumental || 'No'}
                                                onChange={(e) => {
                                                    const val = e.target.value as 'Yes' | 'No';
                                                    updateTrack(track.id, { 
                                                        isInstrumental: val,
                                                        explicitLyrics: val === 'Yes' ? 'No' : track.explicitLyrics,
                                                        lyricist: val === 'Yes' ? '' : track.lyricist,
                                                        lyrics: val === 'Yes' ? '' : track.lyrics
                                                    });
                                                }}
                                                className="w-full px-2.5 py-1.5 text-[10px] border border-gray-300 rounded focus:border-blue-500 focus:outline-none appearance-none bg-white"
                                            >
                                                <option value="No">No</option>
                                                <option value="Yes">Yes</option>
                                            </select>
                                            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-500">
                                                <ChevronDown size={12} />
                                            </div>
                                        </div>
                                    </div>
                                    {track.isInstrumental !== 'Yes' && (
                                        <div className="transition-all duration-300 opacity-100">
                                            <label className="block text-[10px] font-medium text-slate-700 mb-1">Explicit Lyrics <span className="text-red-500">*</span></label>
                                            <div className="relative">
                                                <select 
                                                    value={track.explicitLyrics}
                                                    onChange={(e) => updateTrack(track.id, { explicitLyrics: e.target.value })}
                                                    className="w-full px-2.5 py-1.5 text-[10px] border border-gray-300 rounded focus:border-blue-500 focus:outline-none appearance-none bg-white"
                                                >
                                                    {EXPLICIT_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                </select>
                                                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-500">
                                                    <ChevronDown size={12} />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                                    <div>
                                        <label className="block text-[10px] font-medium text-slate-700 mb-1">Genre <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <select 
                                                value={track.genre}
                                                onChange={(e) => updateTrack(track.id, { genre: e.target.value, subGenre: "" })}
                                                className="w-full px-2.5 py-1.5 text-[10px] border border-gray-300 rounded focus:border-blue-500 focus:outline-none appearance-none bg-white"
                                            >
                                                <option value="">Select Genre</option>
                                                {TRACK_GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                                            </select>
                                            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-500">
                                                <ChevronDown size={12} />
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-medium text-slate-700 mb-1">Sub Genre</label>
                                        <div className="relative">
                                            <select 
                                                value={track.subGenre || ""}
                                                onChange={(e) => updateTrack(track.id, { subGenre: e.target.value })}
                                                className="w-full px-2.5 py-1.5 text-[10px] border border-gray-300 rounded focus:border-blue-500 focus:outline-none appearance-none bg-white"
                                            >
                                                <option value="">Select Sub Genre</option>
                                                {(SUB_GENRES_MAP[track.genre] || []).map(sg => (
                                                    <option key={sg} value={sg}>{sg}</option>
                                                ))}
                                            </select>
                                            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-500">
                                                <ChevronDown size={12} />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-medium text-slate-700 mb-1">Composer <span className="text-red-500">*</span></label>
                                        <input 
                                            value={track.composer}
                                            onChange={(e) => updateTrack(track.id, { composer: e.target.value })}
                                            className="w-full px-2.5 py-1.5 text-[10px] border border-gray-300 rounded focus:border-blue-500 focus:outline-none"
                                            placeholder="Full Name"
                                        />
                                    </div>
                                    {track.isInstrumental !== 'Yes' && (
                                    <div>
                                        <label className="block text-[10px] font-medium text-slate-700 mb-1">Lyricist <span className="text-red-500">*</span></label>
                                        <input 
                                            value={track.lyricist}
                                            onChange={(e) => updateTrack(track.id, { lyricist: e.target.value })}
                                            className="w-full px-2.5 py-1.5 text-[10px] border border-gray-300 rounded focus:border-blue-500 focus:outline-none"
                                            placeholder="Full Name"
                                        />
                                    </div>
                                    )}
                                </div>
                            </div>

                            {/* 5. Lyrics & Contributors */}
                            {track.isInstrumental !== 'Yes' && (
                              <div className="border border-gray-200 rounded-lg p-3 mb-4 relative">
                                  <h4 className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-3 absolute -top-2 left-3 bg-white px-1">Lyrics</h4>
                                  <textarea 
                                      value={track.lyrics}
                                      onChange={(e) => updateTrack(track.id, { lyrics: e.target.value })}
                                      className="w-full px-2.5 py-1.5 text-[10px] border border-gray-300 rounded focus:border-blue-500 focus:outline-none h-24 resize-y"
                                      placeholder="Enter song lyrics here..."
                                  />
                              </div>
                            )}

                            <div className="border border-gray-200 rounded-lg p-3 mb-4 relative">
                                <h4 className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-3 absolute -top-2 left-3 bg-white px-1">Additional Contributors</h4>
                                
                                <div className="space-y-2">
                                    {track.contributors.map((contrib, idx) => (
                                        <div key={idx} className="flex flex-col md:flex-row gap-2">
                                            <input 
                                                value={contrib.name}
                                                onChange={(e) => handleContributorChange(track.id, idx, 'name', e.target.value)}
                                                className="flex-[2] px-2.5 py-1.5 text-[10px] border border-gray-300 rounded focus:border-blue-500 focus:outline-none"
                                                placeholder="Name"
                                            />
                                            <div className="flex-1 relative">
                                                <select 
                                                    value={contrib.type}
                                                    onChange={(e) => handleContributorChange(track.id, idx, 'type', e.target.value)}
                                                    className="w-full px-2.5 py-1.5 text-[10px] border border-gray-300 rounded focus:border-blue-500 focus:outline-none appearance-none bg-white"
                                                >
                                                    {CONTRIBUTOR_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                                                </select>
                                                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-500">
                                                    <ChevronDown size={12} />
                                                </div>
                                            </div>
                                            <input 
                                                value={contrib.role}
                                                onChange={(e) => handleContributorChange(track.id, idx, 'role', e.target.value)}
                                                className="flex-1 px-2.5 py-1.5 text-[10px] border border-gray-300 rounded focus:border-blue-500 focus:outline-none"
                                                placeholder="Role (e.g. Drums)"
                                            />
                                            <button 
                                                onClick={() => removeContributor(track.id, idx)}
                                                className="p-1.5 text-red-500 bg-white border border-gray-200 hover:bg-red-50 rounded transition-colors"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <button 
                                    onClick={() => addContributor(track.id)}
                                    className="mt-2 text-[10px] font-medium text-slate-500 hover:text-blue-600 flex items-center gap-2 px-3 py-1.5 border border-dashed border-gray-300 rounded hover:border-blue-400 transition-all bg-white"
                                >
                                    <UserPlus size={12} /> Add Contributor
                                </button>
                            </div>

                        </div>
                    )}
                </div>
            );
        })}
      </div>

      {releaseType === 'ALBUM' && (
        <button 
            onClick={addTrack}
            className="w-full mt-4 py-2.5 border-2 border-dashed border-blue-200 rounded-xl text-blue-500 text-xs font-medium hover:bg-blue-50 hover:border-blue-400 transition-all flex items-center justify-center gap-2"
        >
            <PlusCircle size={16} />
            Add Another Track
        </button>
      )}
    </div>
  );
};
