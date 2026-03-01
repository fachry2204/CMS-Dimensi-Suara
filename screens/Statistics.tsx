import React, { useMemo, useState } from 'react';
import { ReleaseData, ReportData } from '../types';
import { PublishingAnalytics } from './publishing/PublishingAnalytics';
import { 
    Music, 
    Disc, 
    Layers, 
    Mic2, 
    TrendingUp, 
    DollarSign, 
    PlayCircle, 
    Users, 
    ArrowUpRight, 
    ArrowDownRight 
} from 'lucide-react';

interface Props {
  releases: ReleaseData[];
  reportData: ReportData[];
  token?: string;
}

export const Statistics: React.FC<Props> = ({ releases, reportData, token }) => {
  const [activeTab, setActiveTab] = useState<'aggregator' | 'publishing'>('aggregator');
  
  // 1. Calculate Catalog Stats
  const stats = {
    totalTracks: releases.reduce((acc, r) => acc + r.tracks.length, 0),
    singles: releases.filter(r => r.tracks.length === 1).length,
    eps: releases.filter(r => r.tracks.length >= 2 && r.tracks.length <= 6).length,
    albums: releases.filter(r => r.tracks.length > 6).length,
  };

  // 2. Aggregate Report Data
  const aggregatedData = useMemo(() => {
    const platformStats: Record<string, { streams: number, revenue: number }> = {};
    let totalRev = 0;
    let totalStr = 0;

    reportData.forEach(item => {
        totalRev += item.revenue;
        totalStr += item.quantity;
        
        const platform = item.platform || 'Unknown';
        if (!platformStats[platform]) {
            platformStats[platform] = { streams: 0, revenue: 0 };
        }
        platformStats[platform].streams += item.quantity;
        platformStats[platform].revenue += item.revenue;
    });

    const platforms = Object.entries(platformStats).map(([name, data]) => ({
        name,
        streams: data.streams,
        revenue: data.revenue,
        // Mock trend for now as we don't have historical data comparison in simple report
        trend: '0%', 
        isUp: true,
        color: getColorForPlatform(name),
        icon: name.charAt(0).toUpperCase()
    })).sort((a, b) => b.revenue - a.revenue); // Sort by revenue

    return {
        totalRevenue: totalRev,
        totalStreams: totalStr,
        platforms
    };
  }, [reportData]);

  const { totalRevenue, totalStreams, platforms } = aggregatedData;

  // Helper formatting
  const formatIDR = (num: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
  const formatNumber = (num: number) => new Intl.NumberFormat('id-ID').format(num);

  const StatCard = ({ title, count, icon, colorClass, bgClass, subtext }: any) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between transition-transform hover:-translate-y-1 hover:shadow-md">
        <div>
            <p className="text-slate-500 text-[10px] font-bold tracking-wider mb-1">{title}</p>
            <h3 className="text-2xl font-bold text-slate-800">{count}</h3>
            <p className="text-[10px] text-slate-400 mt-2 font-medium">{subtext}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${bgClass} ${colorClass}`}>
            {icon}
        </div>
    </div>
  );

  return (
    <div className="p-4 md:p-8 w-full max-w-[1400px] mx-auto min-h-screen">
       <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Statistik & Laporan</h1>
            <p className="text-slate-500 mt-1 text-sm">Analisis performa katalog musik dan pendapatan Anda.</p>
       </div>

       {/* Tab Navigation */}
       <div className="flex items-center gap-6 mb-8 border-b border-slate-200">
            <button
                onClick={() => setActiveTab('aggregator')}
                className={`pb-3 text-sm font-medium transition-all relative px-1 ${
                    activeTab === 'aggregator' 
                    ? 'text-blue-600' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
            >
                Agregator
                {activeTab === 'aggregator' && (
                    <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full" />
                )}
            </button>
            <button
                onClick={() => setActiveTab('publishing')}
                className={`pb-3 text-sm font-medium transition-all relative px-1 ${
                    activeTab === 'publishing' 
                    ? 'text-blue-600' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
            >
                Publishing
                {activeTab === 'publishing' && (
                    <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full" />
                )}
            </button>
       </div>

       {activeTab === 'aggregator' ? (
           <div className="animate-fade-in">
               {/* CATALOG STATS */}
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                    <StatCard 
                        title="Total Rilis Lagu" 
                        count={stats.totalTracks} 
                        icon={<Mic2 size={24} />} 
                        colorClass="text-blue-600" 
                        bgClass="bg-blue-50"
                        subtext="Total Track Individual"
                    />
                    <StatCard 
                        title="Total Album" 
                        count={stats.albums} 
                        icon={<Disc size={24} />} 
                        colorClass="text-purple-600" 
                        bgClass="bg-purple-50"
                        subtext="> 6 Tracks"
                    />
                    <StatCard 
                        title="Total EP" 
                        count={stats.eps} 
                        icon={<Layers size={24} />} 
                        colorClass="text-indigo-600" 
                        bgClass="bg-indigo-50"
                        subtext="2 - 6 Tracks"
                    />
                    <StatCard 
                        title="Total Single" 
                        count={stats.singles} 
                        icon={<Music size={24} />} 
                        colorClass="text-cyan-600" 
                        bgClass="bg-cyan-50"
                        subtext="1 Track"
                    />
               </div>

               {/* ANALYTICS SECTION */}
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Stats */}
                    <div className="lg:col-span-3 space-y-6">
                        <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                    <TrendingUp size={20} className="text-blue-600" />
                                    Performa Keseluruhan
                                </h3>
                                <span className="text-[10px] font-bold px-3 py-1 bg-blue-50 text-blue-600 rounded-full">
                                    Berdasarkan Data Import
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-100">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="p-2 bg-green-500 text-white rounded-lg shadow-lg shadow-green-500/20">
                                            <DollarSign size={20} />
                                        </div>
                                        <span className="text-slate-500 font-bold text-xs tracking-wide">Total Pendapatan</span>
                                    </div>
                                    <h2 className="text-2xl md:text-3xl font-black text-slate-800 mt-4">{formatIDR(totalRevenue)}</h2>
                                    <p className="text-slate-500 text-[10px] mt-2">Akumulasi dari laporan yang diimpor</p>
                                </div>

                                <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100">
                                     <div className="flex items-center gap-3 mb-2">
                                        <div className="p-2 bg-blue-500 text-white rounded-lg shadow-lg shadow-blue-500/20">
                                            <PlayCircle size={20} />
                                        </div>
                                        <span className="text-slate-500 font-bold text-xs tracking-wide">Total Streams</span>
                                    </div>
                                    <h2 className="text-2xl md:text-3xl font-black text-slate-800 mt-4">{formatNumber(totalStreams)}</h2>
                                    <p className="text-slate-500 text-[10px] mt-2">Total kuantitas stream/penjualan</p>
                                </div>
                            </div>
                        </div>

                        {/* Platform Breakdown */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                                <h3 className="font-bold text-slate-800 text-base">Performa Platform</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 tracking-wider">Platform</th>
                                            <th className="px-6 py-4 text-right text-[10px] font-bold text-slate-500 tracking-wider">Streams</th>
                                            <th className="px-6 py-4 text-right text-[10px] font-bold text-slate-500 tracking-wider">Pendapatan</th>
                                            <th className="px-6 py-4 text-center text-[10px] font-bold text-slate-500 tracking-wider">%</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {platforms.length > 0 ? (
                                            platforms.map((platform, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center">
                                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-[10px] mr-3 ${platform.color}`}>
                                                                {platform.icon}
                                                            </div>
                                                            <span className="font-bold text-slate-700 text-xs">{platform.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right font-medium text-slate-600 text-xs">
                                                        {formatNumber(platform.streams)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-slate-800 text-xs">
                                                        {formatIDR(platform.revenue)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                                        <div className="flex items-center justify-center">
                                                            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden mr-2">
                                                                <div 
                                                                    className={`h-full ${platform.color.replace('bg-', 'bg-')}`} 
                                                                    style={{ width: `${(platform.revenue / totalRevenue) * 100}%` }}
                                                                ></div>
                                                            </div>
                                                            <span className="text-[10px] text-slate-500 font-medium">
                                                                {((platform.revenue / totalRevenue) * 100).toFixed(1)}%
                                                            </span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={4} className="px-6 py-12 text-center text-slate-500 text-xs">
                                                    Data Belum Tersedia
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
               </div>
           </div>
       ) : (
           <div className="animate-fade-in">
                <PublishingAnalytics token={token || null} />
           </div>
       )}
    </div>
  );
};

function getColorForPlatform(name: string): string {
    const n = name.toLowerCase();
    if (n.includes('spotify')) return 'bg-green-500';
    if (n.includes('apple') || n.includes('itunes')) return 'bg-red-500';
    if (n.includes('youtube')) return 'bg-red-600';
    if (n.includes('tiktok')) return 'bg-black';
    if (n.includes('resso')) return 'bg-orange-500';
    if (n.includes('joox')) return 'bg-green-600';
    return 'bg-blue-500';
}