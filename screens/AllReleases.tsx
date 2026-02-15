
import React, { useState, useEffect } from 'react';
import { Disc, Music, Calendar, Eye, Search, Filter, ArrowUpDown, ArrowUp, ArrowDown, Globe, ChevronLeft, ChevronRight, List, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ReleaseData } from '../types';
import { formatDMY } from '../utils/date';
import { assetUrl } from '../utils/url';

interface Props {
  releases: ReleaseData[];
  onViewDetails: (release: ReleaseData) => void;
  onEdit?: (release: ReleaseData) => void;
  availableAggregators?: string[];
  error?: string | null;
  onDelete?: (release: ReleaseData) => void;
}

type SortKey = 'title' | 'artist' | 'type' | 'date' | 'aggregator' | 'status';
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  key: SortKey;
  direction: SortDirection;
}

export const AllReleases: React.FC<Props> = ({ releases, onViewDetails, availableAggregators, error }) => {
  const navigate = useNavigate();
  const [activeStatusTab, setActiveStatusTab] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Sorting State
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'date', direction: 'desc' });

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [isViewAll, setIsViewAll] = useState(false);
  const ITEMS_PER_PAGE = 10;

  // Reset pagination when filter/search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeStatusTab, searchQuery, isViewAll]);

  // Define Tabs
  const tabs = [
    { id: 'ALL', label: 'All Release', statusMap: null },
    { id: 'PENDING', label: 'Pending', statusMap: 'Pending' },
    { id: 'PROCESSING', label: 'Proses', statusMap: 'Processing' },
    { id: 'RELEASED', label: 'Released', statusMap: 'Live' },
    { id: 'REJECTED', label: 'Reject', statusMap: 'Rejected' },
  ];

  const getCount = (statusMap: string | null) => {
    if (statusMap === null) return releases.length;
    return releases.filter(r => r.status === statusMap).length;
  };

  // 1. Filter Logic
  const filteredReleases = releases.filter(release => {
    // Status Filter
    const currentTab = tabs.find(t => t.id === activeStatusTab);
    const statusMatch = currentTab?.statusMap ? release.status === currentTab.statusMap : true;
    
    // Search Filter (Expanded to include Aggregator)
    const searchLower = searchQuery.toLowerCase();
    
    // Safely handle potential undefined/null fields
    const title = release.title || '';
    const artists = Array.isArray(release.primaryArtists) ? release.primaryArtists : (typeof release.primaryArtists === 'string' ? [release.primaryArtists] : []);
    const upc = release.upc || '';
    const aggregator = release.aggregator || '';

    const searchMatch = 
        title.toLowerCase().includes(searchLower) || 
        artists.some(a => (a || '').toLowerCase().includes(searchLower)) ||
        upc.includes(searchLower) ||
        aggregator.toLowerCase().includes(searchLower);

    return statusMatch && searchMatch;
  });

  // 2. Sorting Logic
  const sortedReleases = [...filteredReleases].sort((a, b) => {
    const direction = sortConfig.direction === 'asc' ? 1 : -1;
    
    switch (sortConfig.key) {
        case 'title':
            return a.title.localeCompare(b.title) * direction;
        case 'artist':
            return ((a.primaryArtists || [])[0] || '').localeCompare((b.primaryArtists || [])[0] || '') * direction;
        case 'aggregator':
            return (a.aggregator || '').localeCompare(b.aggregator || '') * direction;
        case 'status':
            return (a.status || '').localeCompare(b.status || '') * direction;
        case 'type':
            const typeA = (a.tracks || []).length > 1 ? "Album" : "Single";
            const typeB = (b.tracks || []).length > 1 ? "Album" : "Single";
            return typeA.localeCompare(typeB) * direction;
        case 'date':
        default:
            const dateA = a.plannedReleaseDate || a.submissionDate || '';
            const dateB = b.plannedReleaseDate || b.submissionDate || '';
            return dateA.localeCompare(dateB) * direction;
    }
  });

  // 3. Pagination Logic
  const totalItems = sortedReleases.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  
  const displayedReleases = isViewAll 
    ? sortedReleases 
    : sortedReleases.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleSort = (key: SortKey) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
     if (sortConfig.key !== columnKey) return <ArrowUpDown size={14} className="text-slate-300 opacity-0 group-hover:opacity-50" />;
     return sortConfig.direction === 'asc' 
        ? <ArrowUp size={14} className="text-blue-500" /> 
        : <ArrowDown size={14} className="text-blue-500" />;
  };

  const ThSortable = ({ label, sortKey, align = 'left' }: { label: string, sortKey: SortKey, align?: 'left'|'right' }) => (
      <th 
        className={`px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors group text-${align}`}
        onClick={() => handleSort(sortKey)}
      >
        <div className={`flex items-center gap-2 ${align === 'right' ? 'justify-end' : ''}`}>
            {label}
            <SortIcon columnKey={sortKey} />
        </div>
      </th>
  );

  return (
    <div className="p-4 md:p-8 w-full max-w-[1400px] mx-auto min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
                <h1 className="text-3xl font-bold text-slate-800 tracking-tight">All Releases</h1>
                <p className="text-slate-500 mt-1">Manage and track your music catalog status.</p>
            </div>
            <div className="w-full md:w-auto flex items-center gap-3">
                <div className="relative w-full md:w-80">
                    <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search Title, Artist, UPC, Aggregator..." 
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 bg-white shadow-sm transition-all"
                    />
                    <Search size={18} className="absolute left-3 top-3 text-gray-400" />
                </div>
                <button
                    onClick={() => navigate('/new-release')}
                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-bold shadow-sm"
                    title="Create New Release"
                >
                    <Plus size={18} />
                    New Release
                </button>
            </div>
        </div>

        {/* STATUS TABS NAVIGATION */}
        {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 flex items-center gap-3">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <p className="font-medium">Connection Error: {error}</p>
                <p className="text-sm ml-auto text-red-400">Please check your network or server logs.</p>
            </div>
        )}

        <div className="flex overflow-x-auto pb-2 mb-6 gap-2 no-scrollbar">
            {tabs.map((tab) => {
                const isActive = activeStatusTab === tab.id;
                const count = getCount(tab.statusMap);
                const baseColors =
                    tab.id === 'PENDING'
                        ? isActive
                            ? 'bg-yellow-100 text-yellow-800 border-yellow-300 shadow-sm'
                            : 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100/60'
                        : tab.id === 'PROCESSING'
                        ? isActive
                            ? 'bg-blue-100 text-blue-800 border-blue-300 shadow-sm'
                            : 'bg-blue-50 text-blue-700 border-blue-200/80 hover:bg-blue-100/60'
                        : tab.id === 'RELEASED'
                        ? isActive
                            ? 'bg-green-100 text-green-800 border-green-300 shadow-sm'
                            : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100/60'
                        : tab.id === 'REJECTED'
                        ? isActive
                            ? 'bg-red-100 text-red-800 border-red-300 shadow-sm'
                            : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100/60'
                        : isActive
                        ? 'bg-slate-800 text-white border-slate-800 shadow-md'
                        : 'bg-white text-slate-500 border-gray-200 hover:border-slate-300 hover:bg-gray-50';
                
                return (
                    <button
                        key={tab.id}
                        onClick={() => setActiveStatusTab(tab.id)}
                        className={`
                            whitespace-nowrap px-4 py-2 rounded-full font-semibold text-[11px] transition-all flex items-center gap-2 border
                            ${baseColors}
                        `}
                    >
                        {tab.label}
                        <span
                            className={`
                                px-1.5 py-0.5 rounded-full text-[10px] min-w-[20px] text-center border
                                ${
                                    tab.id === 'PENDING'
                                        ? isActive
                                            ? 'bg-yellow-50/80 text-yellow-800 border-yellow-300'
                                            : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                        : tab.id === 'PROCESSING'
                                        ? isActive
                                            ? 'bg-blue-50/80 text-blue-800 border-blue-300'
                                            : 'bg-blue-50 text-blue-700 border-blue-200'
                                        : tab.id === 'RELEASED'
                                        ? isActive
                                            ? 'bg-green-50/80 text-green-800 border-green-300'
                                            : 'bg-green-50 text-green-700 border-green-200'
                                        : tab.id === 'REJECTED'
                                        ? isActive
                                            ? 'bg-red-50/80 text-red-800 border-red-300'
                                            : 'bg-red-50 text-red-700 border-red-200'
                                        : isActive
                                        ? 'bg-white/10 text-white border-white/30'
                                        : 'bg-slate-100 text-slate-600 border-slate-200'
                                }
                            `}
                        >
                            {count}
                        </span>
                    </button>
                );
            })}
        </div>

        <div className="bg-white rounded-2xl shadow-md border border-gray-100/80 overflow-hidden flex flex-col min-h-[500px]">
            <div className="overflow-x-auto flex-1">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-gray-100">
                        <tr>
                            <ThSortable label="Release" sortKey="title" />
                            <ThSortable label="Type" sortKey="type" />
                            <ThSortable label="Release Date" sortKey="date" />
                            <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Submit Date</th>
                            <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Codes</th>
                            <ThSortable label="Aggregator" sortKey="aggregator" />
                            <ThSortable label="Status" sortKey="status" />
                            <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {displayedReleases.map((release) => {
                            // Determine type
                            const type = (release.tracks || []).length > 1 ? "Album/EP" : "Single";
                            
                            // Date priority: Planned > Original > Submission
                            const displayDateRaw = release.plannedReleaseDate || release.originalReleaseDate || release.submissionDate || "N/A";
                            const status = release.status || "Pending";

                            // Determine color based on status
                            let statusClass = "bg-gray-100 text-gray-600 border-gray-200";
                            if (status === 'Live') statusClass = "bg-green-100 text-green-700 border-green-200";
                            if (status === 'Processing') statusClass = "bg-blue-100 text-blue-700 border-blue-200";
                            if (status === 'Pending') statusClass = "bg-yellow-100 text-yellow-700 border-yellow-200";
                            if (status === 'Rejected') statusClass = "bg-red-100 text-red-700 border-red-200 cursor-help";

                            // ISRC Logic
                            const isSingle = (release.tracks || []).length === 1;
                            const isrcDisplay = isSingle 
                                ? (release.tracks?.[0]?.isrc || "-") 
                                : ((release.tracks || []).length > 0 ? `${release.tracks.length} Tracks` : "-");

                            // Rejection Tooltip Logic
                            const rejectionTooltip = status === 'Rejected' && release.rejectionReason 
                                ? `Reason: ${release.rejectionReason}` 
                                : undefined;

                            return (
                                <tr key={release.id || Math.random()} className="hover:bg-blue-50/30 transition-colors group text-[11px]">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-lg bg-blue-50 overflow-hidden flex items-center justify-center text-slate-400 relative shrink-0 border border-blue-100`}>
                                                {release.coverArt ? (
                                                    <img 
                                                        src={(typeof release.coverArt === 'string')
                                                            ? assetUrl(release.coverArt)
                                                            : (release.coverArt instanceof Blob ? URL.createObjectURL(release.coverArt) : '')
                                                        } 
                                                        alt="Art" 
                                                        className="w-full h-full object-cover" 
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=Error';
                                                            console.error("Failed to load image:", release.coverArt);
                                                        }}
                                                    />
                                                ) : (
                                                    <Disc size={20} />
                                                )}
                                            </div>
                                            <div className="min-w-[150px]">
                                                <div className="font-bold text-slate-800 truncate max-w-[200px] text-[13px]" title={release.title}>{release.title || "Untitled Release"}</div>
                                                <div className="text-[11px] text-slate-500 truncate max-w-[200px]">{(release.primaryArtists || [])[0] || "Unknown Artist"}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-3">
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-white text-slate-600 border border-gray-200 whitespace-nowrap shadow-sm">
                                            <Music size={10} />
                                            {type}
                                        </span>
                                    </td>
                                <td className="px-6 py-3 text-[11px] text-slate-600 whitespace-nowrap">
                                        <div className="flex items-center gap-1.5">
                                            <Calendar size={12} className="text-slate-400" />
                                            {formatDMY(displayDateRaw)}
                                        </div>
                                    </td>
                                    <td className="px-6 py-3 text-[11px] text-slate-600 whitespace-nowrap">
                                        <div className="flex items-center gap-1.5">
                                            <Calendar size={12} className="text-slate-400" />
                                            {release.submissionDate ? formatDMY(release.submissionDate) : 'N/A'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-3 text-[11px]">
                                        <div className="flex flex-col gap-1.5">
                                            <div className="flex items-center gap-1.5 text-[11px]">
                                                <span className="font-bold text-slate-400 w-8">UPC</span>
                                                <span className={`font-mono px-1 py-0.5 rounded text-[11px] ${release.upc ? 'bg-slate-100 text-slate-700' : 'text-slate-300 italic'}`}>
                                                    {release.upc || "Pending"}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-[11px]">
                                                <span className="font-bold text-slate-400 w-8">ISRC</span>
                                                <span className={`font-mono px-1 py-0.5 rounded text-[11px] ${isrcDisplay !== '-' ? 'bg-slate-100 text-slate-700' : 'text-slate-300 italic'}`}>
                                                    {isrcDisplay}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                    {/* NEW AGGREGATOR COLUMN */}
                                    <td className="px-6 py-3 text-[11px]">
                                        {release.aggregator ? (
                                            <div className="flex items-center gap-1 text-[10px] font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-100 w-fit">
                                                <Globe size={10} />
                                                {release.aggregator}
                                            </div>
                                        ) : (
                                            <span className="text-[10px] text-slate-300 italic">Not set</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-3">
                                        <div className="flex flex-col items-start gap-1">
                                            <span 
                                                title={rejectionTooltip}
                                                className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap border ${statusClass}`}
                                            >
                                                {status === 'Live' ? 'Released' : status}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-3 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button 
                                                onClick={() => {
                                                    onViewDetails(release);
                                                }}
                                                className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 text-slate-600 hover:text-blue-600 hover:border-blue-300 rounded-lg transition-all text-[11px] font-semibold shadow-sm whitespace-nowrap"
                                                title="View & Manage"
                                            >
                                                <Eye size={12} /> View
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            
            {sortedReleases.length === 0 && (
                <div className="p-16 text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Filter size={24} className="text-slate-300" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-700 mb-1">{error ? "Connection Failed" : "No releases found"}</h3>
                    <p className="text-slate-400 text-sm">
                        {error 
                            ? "We couldn't load your releases. Please check the error message above."
                            : (activeStatusTab === 'ALL' && searchQuery === ''
                                ? "You haven't created any releases yet." 
                                : `No results found for your current filter/search.`)}
                    </p>
                </div>
            )}

            {/* Pagination Footer */}
            <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50">
                <div className="flex items-center gap-4">
                     <span className="text-sm text-slate-500">
                        Showing {displayedReleases.length} of {totalItems} results
                     </span>
                     <button 
                        onClick={() => setIsViewAll(!isViewAll)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg border flex items-center gap-2 transition-colors ${isViewAll ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-white text-slate-600 border-gray-200 hover:bg-slate-50'}`}
                     >
                        <List size={14} />
                        {isViewAll ? "Show Paged" : "View All"}
                     </button>
                </div>

                {!isViewAll && totalPages > 1 && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="p-2 rounded-lg border border-gray-200 bg-white text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        
                        <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                // Logic to show window of pages around current
                                let pageNum = i + 1;
                                if (totalPages > 5) {
                                    if (currentPage > 3) pageNum = currentPage - 2 + i;
                                    if (pageNum > totalPages) pageNum = pageNum - (pageNum - totalPages);
                                }
                                
                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => setCurrentPage(pageNum)}
                                        className={`w-8 h-8 rounded-lg text-sm font-bold flex items-center justify-center transition-colors
                                            ${currentPage === pageNum 
                                                ? 'bg-blue-600 text-white shadow-sm' 
                                                : 'text-slate-600 hover:bg-slate-100'}`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="p-2 rounded-lg border border-gray-200 bg-white text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};
