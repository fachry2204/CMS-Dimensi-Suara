
import React, { useState } from 'react';
import { Disc, Music, Calendar, Eye, Edit3, Barcode } from 'lucide-react';
import { ReleaseData } from '../types';

interface Props {
  releases: ReleaseData[];
  onViewRelease: (release: ReleaseData) => void;
  onUpdateRelease: (release: ReleaseData) => void;
  availableAggregators: string[];
}

export const AllReleases: React.FC<Props> = ({ releases, onViewRelease, onUpdateRelease, availableAggregators }) => {
  // Modal state removed, using App.tsx routing instead

  return (
    <div className="p-8 w-full max-w-[1400px] mx-auto min-h-screen">
       <div className="flex justify-between items-center mb-8">
            <div>
                <h1 className="text-3xl font-bold text-slate-800 tracking-tight">All Releases</h1>
                <p className="text-slate-500 mt-1">Manage your music catalog.</p>
            </div>
            <div className="flex gap-3">
                <input 
                    type="text" 
                    placeholder="Search release..." 
                    className="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white"
                />
            </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Release</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Release Date</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Codes (UPC / ISRC)</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {releases.map((release) => {
                            // Determine type
                            const type = release.tracks.length > 1 ? "Album/EP" : "Single";
                            
                            // Date priority: Planned > Original > Submission
                            const displayDate = release.plannedReleaseDate || release.originalReleaseDate || release.submissionDate || "N/A";
                            const status = release.status || "Pending";

                            // Determine color based on status
                            let statusClass = "bg-gray-100 text-gray-600";
                            if (status === 'Live') statusClass = "bg-green-100 text-green-700";
                            if (status === 'Processing') statusClass = "bg-blue-100 text-blue-700";
                            if (status === 'Pending') statusClass = "bg-yellow-100 text-yellow-700";
                            if (status === 'Rejected') statusClass = "bg-red-100 text-red-700 cursor-help";

                            // ISRC Logic
                            const isSingle = release.tracks.length === 1;
                            const isrcDisplay = isSingle 
                                ? (release.tracks[0]?.isrc || "-") 
                                : (release.tracks.length > 0 ? `${release.tracks.length} Tracks` : "-");

                            // Rejection Tooltip Logic
                            const rejectionTooltip = status === 'Rejected' && release.rejectionReason 
                                ? `Reason: ${release.rejectionReason}` 
                                : undefined;

                            return (
                                <tr key={release.id || Math.random()} className="hover:bg-blue-50/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-lg bg-blue-100 overflow-hidden flex items-center justify-center text-slate-600 relative shrink-0`}>
                                                {release.coverArt ? (
                                                    <img src={URL.createObjectURL(release.coverArt)} alt="Art" className="w-full h-full object-cover" />
                                                ) : (
                                                    <Disc size={20} />
                                                )}
                                            </div>
                                            <div className="min-w-[150px]">
                                                <div className="font-bold text-slate-800 truncate max-w-[200px]" title={release.title}>{release.title || "Untitled Release"}</div>
                                                <div className="text-xs text-slate-500 truncate max-w-[200px]">{release.primaryArtists[0] || "Unknown Artist"}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 whitespace-nowrap">
                                            <Music size={12} />
                                            {type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <Calendar size={14} className="text-slate-400" />
                                            {displayDate}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1.5">
                                            <div className="flex items-center gap-2 text-xs">
                                                <span className="font-bold text-slate-400 w-8">UPC</span>
                                                <span className={`font-mono px-1.5 py-0.5 rounded ${release.upc ? 'bg-slate-100 text-slate-700' : 'text-slate-300 italic'}`}>
                                                    {release.upc || "Pending"}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs">
                                                <span className="font-bold text-slate-400 w-8">ISRC</span>
                                                <span className={`font-mono px-1.5 py-0.5 rounded ${isrcDisplay !== '-' ? 'bg-slate-100 text-slate-700' : 'text-slate-300 italic'}`}>
                                                    {isrcDisplay}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col items-start gap-1">
                                            <span 
                                                title={rejectionTooltip}
                                                className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap ${statusClass}`}
                                            >
                                                {status}
                                            </span>
                                            {release.aggregator && status !== 'Pending' && (
                                                <span className="text-[10px] text-slate-400 font-medium px-1 truncate max-w-[100px]">via {release.aggregator}</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button 
                                                onClick={() => onViewRelease(release)}
                                                className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 text-slate-600 hover:text-blue-600 hover:border-blue-300 rounded-lg transition-all text-xs font-bold shadow-sm whitespace-nowrap"
                                                title="View & Manage"
                                            >
                                                <Eye size={14} /> View
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            
            {releases.length === 0 && (
                <div className="p-10 text-center text-slate-500">
                    No releases found. Create a new release to get started!
                </div>
            )}
        </div>
    </div>
  );
};
