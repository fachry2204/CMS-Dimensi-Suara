
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ReleaseData } from '../types';
import { useBranding } from '../contexts/BrandingContext';
import { 
    LayoutDashboard, 
    Clock, 
    Loader2, 
    CheckCircle, 
    AlertTriangle, 
    Music, 
    Disc,
    ArrowRight,
    Globe,
    Users,
    Plus
} from 'lucide-react';
import { assetUrl } from '../utils/url';
import { api } from '../utils/api';

interface Props {
  releases: ReleaseData[];
  onViewRelease: (release: ReleaseData) => void;
  onNavigateToAll: () => void;
  userRole?: string;
}

export const AggregatorDashboard: React.FC<Props> = ({ releases, onViewRelease, onNavigateToAll, userRole }) => {
  const navigate = useNavigate();
  const { getButtonColor } = useBranding();
  const showAggregator = userRole !== 'User';
  const [showImportModal, setShowImportModal] = React.useState(false);
  const [importing, setImporting] = React.useState(false);
  const [importResult, setImportResult] = React.useState<{inserted:number; errors:string[]}|null>(null);
  const token = React.useMemo(() => localStorage.getItem('cms_token') || '', []);
  
  // Calculate Stats
  const stats = {
    total: releases.length,
    pending: releases.filter(r => (r.status || 'Pending') === 'Pending').length,
    processing: releases.filter(r => r.status === 'Processing').length,
    live: releases.filter(r => r.status === 'Live').length,
    rejected: releases.filter(r => r.status === 'Rejected').length,
  };

  const metaStats = {
    singles: releases.filter(r => r.type === 'SINGLE').length,
    albums: releases.filter(r => r.type === 'ALBUM').length,
    tracks: releases.reduce((sum, r) => sum + (r.tracks?.length || 0), 0),
    artists: new Set(releases.flatMap(r => (r.primaryArtists || []).map(a => typeof a === 'string' ? a : a.name))).size
  };

  // Filter Recent Activity: Only Pending & Processing
  const recentActivity = releases
    .filter(r => (r.status || 'Pending') === 'Pending' || r.status === 'Processing')
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
       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
           <div>
                <h1 className="text-lg text-slate-800 tracking-tight font-bold">Dashboard</h1>
                <p className="text-slate-500 mt-0.5 text-[12px]">Welcome back, here is your catalog overview.</p>
           </div>
           <button 
                onClick={() => navigate('/new-release')}
                className="flex items-center gap-2 px-4 py-2 text-white rounded-lg shadow-sm hover:opacity-90 transition-all text-xs font-bold"
                style={{ backgroundColor: getButtonColor() }}
            >
                <Plus size={16} />
                New Release
            </button>
            {(userRole === 'Admin' || userRole === 'Operator') && (
              <button 
                  onClick={() => setShowImportModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg shadow-sm hover:bg-purple-700 transition-all text-xs font-bold"
              >
                  <Plus size={16} />
                  Import Release
              </button>
            )}
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
                title="Released" 
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
            <StatCard 
                title="Jumlah Artis" 
                count={metaStats.artists} 
                icon={<Users size={20} />} 
                colorClass="text-pink-600" 
                bgClass="bg-pink-100"
                subtext="Total unique artists"
                cardClass="bg-pink-50 border-pink-100"
            />
            
       </div>

       {/* RECENT ACTIVITY TABLE */}
       <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-[11px] text-slate-800 flex items-center gap-2 font-bold uppercase tracking-wider">
                    <LayoutDashboard size={16} className="text-slate-400" />
                    Recent Activity (Pending & Processing)
                </h3>
                <button 
                    onClick={onNavigateToAll}
                    className="text-[11px] font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                    View All <ArrowRight size={14} />
                </button>
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase">Cover</th>
                            <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase">Title</th>
                            <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase">Artist</th>
                            {showAggregator && (
                                <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase">Aggregator</th>
                            )}
                            <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase">Status</th>
                            <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase">Date</th>
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
                                    className="hover:bg-blue-50/30 transition-colors group"
                                >
                                    <td className="px-6 py-2.5">
                                        <div className="w-8 h-8 rounded-md bg-gray-100 overflow-hidden border border-gray-200">
                                            {release.coverArt ? (
                                                <img 
                                                    src={typeof release.coverArt === 'string' ? assetUrl(release.coverArt) : URL.createObjectURL(release.coverArt)} 
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).src = '/assets/placeholder-cover.jpg';
                                                        (e.target as HTMLImageElement).onerror = null;
                                                    }} 
                                                />
                                            ) : (
                                                <div className="flex items-center justify-center h-full text-gray-400"><Disc size={14} /></div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-2.5 font-bold text-slate-700 group-hover:text-blue-600 transition-colors text-xs">
                                        {release.title}
                                    </td>
                                    <td className="px-6 py-2.5 text-xs text-slate-600">
                                        {(() => {
                                            const first = (release.primaryArtists || [])[0];
                                            if (!first) return "Unknown";
                                            return typeof first === 'string' ? first : first.name;
                                        })()}
                                    </td>
                                    {showAggregator && (
                                        <td className="px-6 py-2.5 text-xs">
                                            {release.aggregator ? (
                                                <div className="flex items-center gap-2 text-slate-700 font-medium">
                                                    <Globe size={12} className="text-purple-500" />
                                                    {release.aggregator}
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 italic text-[10px]">-</span>
                                            )}
                                        </td>
                                    )}
                                    <td className="px-6 py-2.5">
                                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusClass}`}>
                                            {release.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-2.5 text-xs text-slate-500">
                                        {formatDMY(release.submissionDate)}
                                    </td>
                                </tr>
                             )
                        })}
                        {recentActivity.length === 0 && (
                            <tr>
                                <td colSpan={showAggregator ? 6 : 5} className="p-6 text-center text-slate-400 text-xs">
                                    No pending or processing releases found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
       </div>
       
       {showImportModal && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
           <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
             <div className="p-6 border-b border-gray-100 flex justify-between items-center">
               <h3 className="text-lg font-bold text-slate-800">Import Release</h3>
               <button onClick={() => { setShowImportModal(false); setImportResult(null); }} className="text-slate-400 hover:text-slate-600">
                 <ArrowRight size={20} className="rotate-180" />
               </button>
             </div>
             <div className="p-6 space-y-4">
               <p className="text-sm text-slate-600">Upload file Excel sesuai template. Template mengikuti metadata di New Release.</p>
               <div className="flex gap-3">
                 <button
                   onClick={async () => {
                     try {
                       const blob = await api.releasesImportTemplate(token);
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
                   className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700"
                 >
                   Download Contoh File
                 </button>
                 <label className="px-4 py-2 bg-slate-100 rounded-lg text-xs font-medium cursor-pointer hover:bg-slate-200">
                   <input 
                     type="file" 
                     accept=".xlsx,.xls" 
                     className="hidden" 
                     onChange={async (e) => {
                       const file = e.target.files?.[0];
                       if (!file) return;
                       setImporting(true);
                       try {
                         const res = await api.releasesImportExcel(token, file);
                         setImportResult(res);
                       } catch (err) {
                         setImportResult({ inserted: 0, errors: [(err as any)?.message || 'Import gagal'] });
                       } finally {
                         setImporting(false);
                       }
                     }}
                   />
                   Upload File Excel
                 </label>
               </div>
               {importing && <div className="text-xs text-slate-500">Mengimpor...</div>}
               {importResult && (
                 <div className="text-xs text-slate-700">
                   <div className="mb-2">Berhasil ditambahkan: {importResult.inserted}</div>
                   {importResult.errors && importResult.errors.length > 0 && (
                     <div className="max-h-40 overflow-y-auto border rounded p-2 text-red-600">
                       {importResult.errors.map((e, i) => <div key={i}>{e}</div>)}
                     </div>
                   )}
                 </div>
               )}
             </div>
             <div className="p-6 border-t border-gray-100 flex justify-end">
               <button 
                 onClick={() => { setShowImportModal(false); setImportResult(null); }}
                 className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-200"
               >
                 Tutup
               </button>
             </div>
           </div>
         </div>
       )}
    </div>
  );
};
