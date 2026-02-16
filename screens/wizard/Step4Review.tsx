
import React, { useState } from 'react';
import { ReleaseData } from '../../types';
import { api } from '../../utils/api';
import { assetUrl } from '../../utils/url';
import { Disc, CheckCircle, Loader2, AlertCircle, FileAudio, User, Music2, FileText, Calendar, Globe, Tag, Mic2, Users, PlayCircle, ChevronLeft, X } from 'lucide-react';

interface Props {
  data: ReleaseData;
  onSave: (data: ReleaseData) => void;
  onBack: () => void;
}

export const Step4Review: React.FC<Props> = ({ data, onSave, onBack }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showValidationModal, setShowValidationModal] = useState(false);

  const handleSubmit = async () => {
    // --- VALIDATION START ---
    const errors: string[] = [];

    // 1. Validate Release Level
    if (!data.coverArt) {
        errors.push("Cover Art is required.");
    }
    if (!data.title) errors.push("Release Title is required.");
    if (!data.primaryArtists || data.primaryArtists.length === 0 || !data.primaryArtists[0]) {
        errors.push("Primary Artist is required.");
    }
    // Genre is only required for ALBUM/EP, not Single
    if (data.type !== 'SINGLE') {
        if (!data.genre) errors.push("Release Genre is required.");
    }
    if (!data.language) errors.push("Language / Territory is required.");
    if (!data.version) errors.push("Release Version is required.");
    if (!data.label) errors.push("Record Label is required.");
    if (!data.plannedReleaseDate) errors.push("Release Date is required.");

    // 2. Validate Track Level
    if (!data.tracks || data.tracks.length === 0) {
        errors.push("At least one track is required.");
    } else {
        data.tracks.forEach((track, idx) => {
            const trackNum = idx + 1;
            if (!track.title) errors.push(`Track ${trackNum}: Title is required.`);
            if (!track.audioFile) errors.push(`Track ${trackNum}: Audio file is missing.`);
            if (!track.genre) errors.push(`Track ${trackNum}: Genre is required.`);
            if (!track.composer) errors.push(`Track ${trackNum}: Composer is required.`);
            
            // Conditional Validation based on Instrumental
            if (track.isInstrumental !== 'Yes') {
                if (!track.lyricist) errors.push(`Track ${trackNum}: Lyricist is required (since it's not Instrumental).`);
                if (!track.explicitLyrics) errors.push(`Track ${trackNum}: Explicit Lyrics status is required.`);
            }
        });
    }

    if (errors.length > 0) {
        setValidationErrors(errors);
        setShowValidationModal(true);
        return;
    }
    // --- VALIDATION END ---

    setIsSubmitting(true);
    try {
        const token = localStorage.getItem('cms_token');
        if (!token) throw new Error("No auth token found. Please login again.");

        const result = await api.createRelease(token, data);

        const normalizedId = String(result.id ?? data.id ?? Date.now());
        const finalizedData: ReleaseData = {
            ...data,
            id: normalizedId,
            status: 'Pending',
            submissionDate: new Date().toISOString().split('T')[0]
        };
        
        // Propagate to App
        onSave(finalizedData);
        setSuccessMsg(result.message || 'Release submitted successfully');
        
    } catch (error: any) {
        console.error("Submission failed:", error);
        let message = error?.message || "Please try again.";
        if (error?.status === 413 || message === 'UPLOAD_TOO_LARGE' || /content too large|payload too large|413/i.test(message)) {
            message = "Total ukuran file (cover + audio + clip) terlalu besar untuk dikirim. Coba kompres atau perkecil ukuran file, atau kurangi jumlah track per sekali upload.";
        }
        alert(`Upload failed: ${message}`);
    } finally {
        setIsSubmitting(false);
    }
  };

  if (successMsg) {
      return (
          <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 animate-bounce">
                  <CheckCircle size={48} className="text-green-500" />
              </div>
              <h2 className="text-3xl font-bold text-slate-800 mb-2">Submission Successful!</h2>
              <p className="text-slate-500 mt-2 text-lg">Your release has been submitted for review.</p>
              
              <div className="mt-8 p-6 bg-slate-50 rounded-2xl border border-slate-200 text-left text-sm max-w-lg shadow-inner">
                <p className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <AlertCircle size={16} /> Status Summary:
                </p>
                <ul className="space-y-2 text-slate-600">
                    <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5"></span>
                        Files uploaded to Server
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5"></span>
                        Metadata saved to Database
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5"></span>
                        Status: Pending Review
                    </li>
                </ul>
              </div>

              <div className="mt-10">
                 <p className="text-slate-400 text-sm mb-4">You can view this in the "All Releases" tab.</p>
              </div>
          </div>
      )
  }

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-slate-800 mb-2">Final Review</h2>
        <p className="text-slate-500">Please verify all information before submitting your release.</p>
      </div>

      {/* SECTION 1: RELEASE METADATA SUMMARY */}
      <div className="mb-12 animate-fade-in-up">
        <h3 className="font-bold text-xl text-slate-800 mb-6 flex items-center gap-2">
            <FileText className="text-blue-500" /> 
            Release Information
        </h3>
        
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex flex-col md:flex-row gap-8">
            {/* Cover Art */}
            <div className="w-full md:w-56 flex-shrink-0">
                <div className="aspect-square rounded-xl overflow-hidden bg-gray-100 border border-gray-200 shadow-md">
                    {data.coverArt ? (
                        <img
                            src={
                              typeof data.coverArt === 'string'
                                ? assetUrl(data.coverArt)
                                : (data.coverArt instanceof Blob ? URL.createObjectURL(data.coverArt) : '')
                            }
                            alt="Cover"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/3000?text=No+Cover';
                            }}
                        />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                            <Disc size={40} className="mb-2" />
                            <span className="text-xs">No Cover</span>
                        </div>
                    )}
                </div>
                <div className="mt-3 text-center">
                    <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-100">
                        {data.tracks.length > 1 ? 'Album / EP' : 'Single'}
                    </span>
                </div>
            </div>

            {/* Metadata Grid */}
            <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-y-6 gap-x-4">
                <MetaItem label="Release Title" value={data.title} icon={<FileText size={14} />} />
                <MetaItem label="Primary Artist" value={data.primaryArtists.join(", ")} icon={<User size={14} />} />
                <MetaItem label="Label" value={data.label} icon={<Users size={14} />} />
                
                <MetaItem label="Language" value={data.language} icon={<Globe size={14} />} />
                <MetaItem label="Genre" value={data.tracks[0]?.genre || "Mixed"} icon={<Music2 size={14} />} />
                <MetaItem label="Version" value={data.version} icon={<Tag size={14} />} />
                
                <MetaItem label="Release Date" value={data.plannedReleaseDate || "TBD"} icon={<Calendar size={14} />} />
                <MetaItem label="UPC" value={data.upc || "Auto-Generated"} icon={<FileAudio size={14} />} />
                <MetaItem 
                    label="Distribution Type" 
                    value={data.isNewRelease ? "New Release" : `Re-release (Orig: ${data.originalReleaseDate})`} 
                    icon={<Disc size={14} />} 
                />
            </div>
        </div>
      </div>

      {/* SECTION 2: DETAILED TRACK METADATA */}
      <div className="mb-12 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
        <h3 className="font-bold text-xl text-slate-800 mb-6 flex items-center gap-2">
            <Music2 className="text-blue-500" /> 
            Track Metadata Details
        </h3>

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4 font-bold text-slate-600">#</th>
                            <th className="px-6 py-4 font-bold text-slate-600">Title & File</th>
                            <th className="px-6 py-4 font-bold text-slate-600">Credits (Comp/Lyr)</th>
                            <th className="px-6 py-4 font-bold text-slate-600">Explicit</th>
                            <th className="px-6 py-4 font-bold text-slate-600">ISRC</th>
                            <th className="px-6 py-4 font-bold text-slate-600">Audio Clip</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {data.tracks.map((track) => (
                            <tr key={track.id} className="hover:bg-slate-50/50">
                                <td className="px-6 py-4 font-bold text-slate-700">{track.trackNumber}</td>
                                <td className="px-6 py-4">
                                    <div className="font-bold text-slate-800">{track.title}</div>
                                    <div className="text-xs text-blue-500 flex items-center gap-1 mt-1 truncate max-w-[200px]" title={typeof track.audioFile === 'string' ? track.audioFile : track.audioFile?.name}>
                                        <FileAudio size={10} />
                                        {typeof track.audioFile === 'string'
                                            ? track.audioFile.split('/').slice(-1)[0]
                                            : (track.audioFile?.name || "No File")}
                                    </div>
                                    {track.videoFile && (
                                        <div className="text-xs text-purple-500 flex items-center gap-1 mt-0.5">
                                            <PlayCircle size={10} /> Video Attached
                                        </div>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-slate-600"><span className="text-slate-400 text-xs">C:</span> {track.composer}</div>
                                    <div className="text-slate-600"><span className="text-slate-400 text-xs">L:</span> {track.lyricist}</div>
                                    {track.contributors.length > 0 && (
                                        <div className="text-xs text-slate-400 mt-1">+{track.contributors.length} others</div>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded text-xs font-bold border ${
                                        track.explicitLyrics === 'Yes' ? 'bg-red-50 text-red-600 border-red-100' : 
                                        track.explicitLyrics === 'Clean' ? 'bg-green-50 text-green-600 border-green-100' :
                                        'bg-slate-50 text-slate-600 border-slate-100'
                                    }`}>
                                        {track.explicitLyrics}
                                    </span>
                                </td>
                                <td className="px-6 py-4 font-mono text-slate-500 text-xs">
                                    {track.isrc || "-"}
                                </td>
                                <td className="px-6 py-4">
                                    {track.audioClip ? (
                                        <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                                            <CheckCircle size={12} /> Trimmed
                                        </span>
                                    ) : (
                                        <span className="text-xs text-orange-400">Missing</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {/* Lyrics Preview if any */}
            {data.tracks.some(t => t.lyrics) && (
                 <div className="bg-slate-50 p-4 border-t border-gray-100">
                    <div className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1 mb-2">
                        <Mic2 size={12} /> Lyrics Detected
                    </div>
                    <p className="text-xs text-slate-400">
                        Lyrics data has been entered for {data.tracks.filter(t => t.lyrics).length} track(s) and will be submitted to stores.
                    </p>
                 </div>
            )}
        </div>
      </div>

      <div className="mt-12 flex flex-col items-end border-t border-gray-100 pt-8 pb-12">
        <div className="flex gap-4 w-full md:w-auto">
            <button 
                onClick={onBack}
                className="w-full md:w-auto px-6 py-4 rounded-xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 text-white hover:shadow-lg hover:shadow-orange-400/30 transform hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
            >
                <ChevronLeft size={20} />
                Back
            </button>
            
            <button 
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className={`
                    w-full md:w-auto px-10 py-4 font-bold rounded-xl flex items-center justify-center gap-3 transition-all
                    ${isSubmitting 
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                        : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-1'}
                `}
            >
                {isSubmitting ? (
                    <>
                        <Loader2 className="animate-spin" size={20} />
                        Processing Release...
                    </>
                ) : (
                    <>
                        Submit Release
                        <CheckCircle size={20} />
                    </>
                )}
            </button>
        </div>
      </div>

      {/* VALIDATION MODAL */}
      {showValidationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all scale-100 animate-fade-in-up">
                <div className="bg-red-50 p-6 border-b border-red-100 flex items-center gap-4">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <AlertCircle className="text-red-500" size={24} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-red-700">Incomplete Data</h3>
                        <p className="text-sm text-red-600">Please fix the following issues before submitting:</p>
                    </div>
                    <button 
                        onClick={() => setShowValidationModal(false)}
                        className="text-red-400 hover:text-red-600 transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>
                
                <div className="p-6 max-h-[60vh] overflow-y-auto">
                    <ul className="space-y-3">
                        {validationErrors.map((err, idx) => (
                            <li key={idx} className="flex items-start gap-3 text-slate-700 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                <span className="w-1.5 h-1.5 bg-red-500 rounded-full mt-2 flex-shrink-0"></span>
                                <span className="text-sm font-medium leading-relaxed">{err}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end">
                    <button 
                        onClick={() => setShowValidationModal(false)}
                        className="px-6 py-2 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-700 transition-colors shadow-lg shadow-slate-200"
                    >
                        Understood
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

// --- Helper Components ---

const MetaItem: React.FC<{ label: string; value: string; icon: React.ReactNode }> = ({ label, value, icon }) => (
    <div className="flex flex-col">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1">
            {icon} {label}
        </span>
        <span className="text-sm font-semibold text-slate-800 truncate" title={value}>
            {value || "-"}
        </span>
    </div>
);
