
import React from 'react';
import { ReleaseData } from '../types';
import { 
    LayoutDashboard, 
    Clock, 
    Loader2, 
    CheckCircle, 
    AlertTriangle, 
    Music, 
    Disc,
    ArrowRight,
    Globe
} from 'lucide-react';
import { assetUrl } from '../utils/url';

interface Props {
  releases: ReleaseData[];
  onViewRelease: (release: ReleaseData) => void;
  onNavigateToAll: () => void;
}

export const Dashboard: React.FC<Props> = ({ releases, onViewRelease, onNavigateToAll }) => {
  
  // Calculate Stats
  const stats = {
    total: releases.length,
    pending: releases.filter(r => r.status === 'Pending').length,
    processing: releases.filter(r => r.status === 'Processing').length,
    live: releases.filter(r => r.status === 'Live').length,
    rejected: releases.filter(r => r.status === 'Rejected').length,
  };

  const metaStats = {
    singles: releases.filter(r => r.type === 'SINGLE').length,
    albums: releases.filter(r => r.type === 'ALBUM').length,
    tracks: releases.reduce((sum, r) => sum + (r.tracks?.length || 0), 0)
  };

  // Filter Recent Activity: Only Pending & Processing
  const recentActivity = releases
    .filter(r => r.status === 'Pending' || r.status === 'Processing')
    .slice(0, 5);

  const StatCard = ({ title, count, icon, colorClass, bgClass, subtext, cardClass }: any) => (
    <div className={`p-5 rounded-2xl shadow-sm border flex items-center justify-between transition-transform hover:-translate-y-1 hover:shadow-md ${cardClass || 'bg-white border-gray-100'}`}>
        <div>
            <p className="text-slate-500 text-[11px] font-bold uppercase tracking-wider mb-1">{title}</p>
            <h3 className="text-2xl font-bold text-slate-800">{count}</h3>
            <p className="text-[11px] text-slate-400 mt-1.5 font-medium">{subtext}</p>
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${bgClass} ${colorClass}`}>
            {icon}
        </div>
    </div>
  );

  return (
    <div className="p-4 md:p-8 w-full max-w-[1400px] mx-auto min-h-screen">
       <div className="mb-6 md:hidden">
            <h1 className="text-lg text-slate-800 tracking-tight">Dashboard</h1>
            <p className="text-slate-500 mt-0.5 text-[12px]">Welcome back, here is your catalog overview.</p>
       </div>

       {/* STATS CARDS */}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            <StatCard 
                title="Pending Review" 
                count={stats.pending} 
                icon={<Clock size={20} />} 
                colorClass="text-yellow-600" 
                bgClass="bg-yellow-50"
                subtext="Waiting for approval"
                cardClass="bg-yellow-50 border-yellow-100"
            />
            <StatCard 
                title="Processing" 
                count={stats.processing} 
                icon={<Loader2 size={20} className={stats.processing > 0 ? "animate-spin-slow" : ""} />} 
                colorClass="text-blue-600" 
                bgClass="bg-blue-50"
                subtext="Sent to stores"
                cardClass="bg-blue-50 border-blue-100"
            />
            <StatCard 
                title="Live Releases" 
                count={stats.live} 
                icon={<CheckCircle size={20} />} 
                colorClass="text-green-600" 
                bgClass="bg-green-50"
                subtext="Active on DSPs"
                cardClass="bg-green-50 border-green-100"
            />
            <StatCard 
                title="Rejected" 
                count={stats.rejected} 
                icon={<AlertTriangle size={20} />} 
                colorClass="text-red-600" 
                bgClass="bg-red-50"
                subtext="Requires attention"
                cardClass="bg-red-50 border-red-100"
            />
       </div>

       {/* EXTRA CARDS: META COUNTS */}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            <StatCard 
                title="Jumlah Single" 
                count={metaStats.singles} 
                icon={<Music size={20} />} 
                colorClass="text-indigo-600" 
                bgClass="bg-indigo-100"
                subtext="Total single releases"
                cardClass="bg-indigo-50 border-indigo-100"
            />
            <StatCard 
                title="Jumlah Album" 
                count={metaStats.albums} 
                icon={<Disc size={20} />} 
                colorClass="text-purple-600" 
                bgClass="bg-purple-100"
                subtext="Total album releases"
                cardClass="bg-purple-50 border-purple-100"
            />
            <StatCard 
                title="Jumlah Track" 
                count={metaStats.tracks} 
                icon={<Music size={20} />} 
                colorClass="text-blue-600" 
                bgClass="bg-blue-100"
                subtext="Tracks across catalog"
                cardClass="bg-blue-50 border-blue-100"
            />
            
       </div>

       {/* RECENT ACTIVITY TABLE */}
       <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-sm text-slate-800 flex items-center gap-2">
                    <LayoutDashboard size={20} className="text-slate-400" />
                    Recent Activity (Pending & Processing)
                </h3>
                <button 
                    onClick={onNavigateToAll}
                    className="text-[12px] font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                    View All <ArrowRight size={16} />
                </button>
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Cover</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Title</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Artist</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Aggregator</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Date</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {recentActivity.map((release) => {
                             let statusClass = "bg-gray-100 text-gray-600 border-gray-200";
                             // Only Pending and Processing logic needed for this table based on filter
                             if (release.status === 'Processing') statusClass = "bg-blue-100 text-blue-700 border-blue-200";
                             if (release.status === 'Pending') statusClass = "bg-yellow-100 text-yellow-700 border-yellow-200";

                             const formatDMY = (value?: string) => {
                                 if (!value) return "N/A";
                                 const d = new Date(value);
                                 if (isNaN(d.getTime())) return value;
                                 const dd = String(d.getDate()).padStart(2, '0');
                                 const mm = String(d.getMonth() + 1).padStart(2, '0');
                                 const yyyy = d.getFullYear();
                                 return `${dd}/${mm}/${yyyy}`;
                             };
 
                             return (
                                <tr 
                                    key={release.id} 
                                    onClick={() => onViewRelease(release)}
                                    className="hover:bg-blue-50/30 transition-colors cursor-pointer group"
                                >
                                    <td className="px-6 py-3">
                                        <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden border border-gray-200">
                                            {release.coverArt ? (
                                                <img 
                                                    src={typeof release.coverArt === 'string' ? assetUrl(release.coverArt) : URL.createObjectURL(release.coverArt)} 
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=Error';
                                                        console.error("Failed to load image:", release.coverArt);
                                                    }} 
                                                />
                                            ) : (
                                                <div className="flex items-center justify-center h-full text-gray-400"><Disc size={16} /></div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-3 font-bold text-slate-700 group-hover:text-blue-600 transition-colors text-[13px]">
                                        {release.title}
                                    </td>
                                    <td className="px-6 py-3 text-[13px] text-slate-600">
                                        {(release.primaryArtists || [])[0] || "Unknown"}
                                    </td>
                                    <td className="px-6 py-3 text-[13px]">
                                        {release.aggregator ? (
                                            <div className="flex items-center gap-2 text-slate-700 font-medium">
                                                <Globe size={14} className="text-purple-500" />
                                                {release.aggregator}
                                            </div>
                                        ) : (
                                            <span className="text-slate-400 italic text-[11px]">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-3">
                                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${statusClass}`}>
                                            {release.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3 text-[13px] text-slate-500">
                                        {formatDMY(release.submissionDate)}
                                    </td>
                                </tr>
                             )
                        })}
                        {recentActivity.length === 0 && (
                            <tr>
                                <td colSpan={6} className="p-8 text-center text-slate-400 text-sm">
                                    No pending or processing releases found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
       </div>
    </div>
  );
};
