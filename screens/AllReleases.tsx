
import React, { useState } from 'react';
import { Disc, Music, Calendar, Eye, Edit3, Barcode, Search, Filter } from 'lucide-react';
import { ReleaseData } from '../types';

interface Props {
  releases: ReleaseData[];
  onViewRelease: (release: ReleaseData) => void;
  onUpdateRelease: (release: ReleaseData) => void;
  availableAggregators: string[];
}

export const AllReleases: React.FC<Props> = ({ releases, onViewRelease, onUpdateRelease, availableAggregators }) => {
  const [activeStatusTab, setActiveStatusTab] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Define Tabs and their mapping to data status
  const tabs = [
    { id: 'ALL', label: 'All Release', statusMap: null },
    { id: 'PENDING', label: 'Pending', statusMap: 'Pending' },
    { id: 'PROCESSING', label: 'Proses', statusMap: 'Processing' },
    { id: 'RELEASED', label: 'Released', statusMap: 'Live' },
    { id: 'REJECTED', label: 'Reject', statusMap: 'Rejected' },
  ];

  // Helper to count items per tab
  const getCount = (statusMap: string | null) => {
    if (statusMap === null) return releases.length;
    return releases.filter(r => r.status === statusMap).length;
  };

  // Filter Logic
  const filteredReleases = releases.filter(release => {
    // 1. Status Filter
    const currentTab = tabs.find(t => t.id === activeStatusTab);
    const statusMatch = currentTab?.statusMap ? release.status === currentTab.statusMap : true;
    
    // 2. Search Filter
    const searchLower = searchQuery.toLowerCase();
    const searchMatch = 
        release.title.toLowerCase().includes(searchLower) || 
        release.primaryArtists.some(a => a.toLowerCase().includes(searchLower)) ||
        (release.upc && release.upc.includes(searchLower));

    return statusMatch && searchMatch;
  });

  return (
    <div className="p-4 md:p-8 w-full max-w-[1400px] mx-auto min-h-screen">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
                <h1 className="text-3xl font-bold text-slate-800 tracking-tight">All Releases</h1>
                <p className="text-slate-500 mt-1">Manage and track your music catalog status.</p>
            </div>
            <div className="relative w-full md:w-auto">
                <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by Title, Artist, UPC..." 
                    className="w-full md:w-80 pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 bg-white shadow-sm transition-all"
                />
                <Search size={18} className="absolute left-3 top-3 text-gray-400" />
            </div>
        </div>

        {/* STATUS TABS NAVIGATION */}
        <div className="flex overflow-x-auto pb-2 mb-6 gap-2 no-scrollbar">
            {tabs.map((tab) => {
                const isActive = activeStatusTab === tab.id;
                const count = getCount(tab.statusMap);
                
                return (
                    <button
                        key={tab.id}
                        onClick={() => setActiveStatusTab(tab.id)}
                        className={`
                            whitespace-nowrap px-4 py-2 rounded-full font-bold text-sm transition-all flex items-center gap-2 border
                            ${isActive 
                                ? 'bg-slate-800 text-white border-slate-800 shadow-md transform scale-105' 
                                : 'bg-white text-slate-500 border-gray-200 hover:border-slate-300 hover:bg-gray-50'}
                        `}
                    >
                        {tab.label}
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] min-w-[20px] text-center ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                            {count}
                        </span>
                    </button>
                );
            })}
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
                        {filteredReleases.map((release) => {
                            // Determine type
                            const type = release.tracks.length > 1 ? "Album/EP" : "Single";
                            
                            // Date priority: Planned > Original > Submission
                            const displayDate = release.plannedReleaseDate || release.originalReleaseDate || release.submissionDate || "N/A";
                            const status = release.status || "Pending";

                            // Determine color based on status
                            let statusClass = "bg-gray-100 text-gray-600 border-gray-200";
                            if (status === 'Live') statusClass = "bg-green-100 text-green-700 border-green-200";
                            if (status === 'Processing') statusClass = "bg-blue-100 text-blue-700 border-blue-200";
                            if (status === 'Pending') statusClass = "bg-yellow-100 text-yellow-700 border-yellow-200";
                            if (status === 'Rejected') statusClass = "bg-red-100 text-red-700 border-red-200 cursor-help";

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
                                <tr key={release.id || Math.random()} className="hover:bg-blue-50/30 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-lg bg-blue-50 overflow-hidden flex items-center justify-center text-slate-400 relative shrink-0 border border-blue-100`}>
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
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white text-slate-600 border border-gray-200 whitespace-nowrap shadow-sm">
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
                                                className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap border ${statusClass}`}
                                            >
                                                {status === 'Live' ? 'Released' : status}
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
            
            {filteredReleases.length === 0 && (
                <div className="p-16 text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Filter size={24} className="text-slate-300" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-700 mb-1">No releases found</h3>
                    <p className="text-slate-400 text-sm">
                        {activeStatusTab === 'ALL' 
                            ? "You haven't created any releases yet." 
                            : `There are no releases with status "${activeStatusTab.toLowerCase()}".`}
                    </p>
                </div>
            )}
        </div>
    </div>
  );
};
