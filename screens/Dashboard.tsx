import React, { useState, useEffect } from 'react';
import { ReleaseData } from '../types';
import { 
    LayoutDashboard, 
    Clock, 
    Loader2, 
    CheckCircle, 
    AlertTriangle, 
    Music, 
    FileText
} from 'lucide-react';
import { api } from '../utils/api';

interface Props {
  releases: ReleaseData[];
  token: string | null;
}

interface Song {
    status: 'pending' | 'review' | 'accepted' | 'rejected';
    [key: string]: any;
}

export const Dashboard: React.FC<Props> = ({ releases, token }) => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [isLoadingSongs, setIsLoadingSongs] = useState(true);

  useEffect(() => {
    if (token) {
        fetchSongs();
    }
  }, [token]);

  const fetchSongs = async () => {
    if (!token) return;
    try {
        const data = await api.publishing.getSongs(token);
        setSongs(Array.isArray(data) ? data : []);
    } catch (error) {
        console.error('Failed to fetch songs', error);
    } finally {
        setIsLoadingSongs(false);
    }
  };

  // Calculate Release Stats
  const releaseStats = {
    pending: releases.filter(r => r.status === 'Pending').length,
    processing: releases.filter(r => r.status === 'Processing').length,
    live: releases.filter(r => r.status === 'Live').length,
    rejected: releases.filter(r => r.status === 'Rejected').length,
  };

  // Calculate Publishing Stats
  const publishingStats = {
    pending: songs.filter(s => s.status === 'pending').length,
    review: songs.filter(s => s.status === 'review').length,
    accepted: songs.filter(s => s.status === 'accepted').length,
    rejected: songs.filter(s => s.status === 'rejected').length,
  };

  const StatCard = ({ title, count, icon, colorClass, bgClass, subtext, cardClass, isLoading }: any) => (
    <div className={`p-5 rounded-2xl shadow-sm border flex items-center justify-between transition-transform hover:-translate-y-1 hover:shadow-md ${cardClass || 'bg-white border-gray-100'}`}>
        <div>
            <p className="text-slate-500 text-[11px] font-bold uppercase tracking-wider mb-1">{title}</p>
            <h3 className="text-2xl font-bold text-slate-800">
                {isLoading ? <Loader2 className="animate-spin h-6 w-6 text-slate-300" /> : count}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1.5 font-medium">{subtext}</p>
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${bgClass} ${colorClass}`}>
            {icon}
        </div>
    </div>
  );

  return (
    <div className="p-4 md:p-8 w-full max-w-[1400px] mx-auto min-h-screen">
       <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Dashboard Overview</h1>
            <p className="text-slate-500 mt-1 text-sm">Welcome back, here is your catalog and publishing overview.</p>
       </div>

       {/* AGGREGATOR / RELEASES SECTION */}
       <div className="mb-10">
            <div className="flex items-center gap-2 mb-4">
                <Music className="text-blue-600" size={20} />
                <h2 className="text-lg font-bold text-slate-700">Aggregator Status</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                    title="Pending Review" 
                    count={releaseStats.pending} 
                    icon={<Clock size={20} />} 
                    colorClass="text-yellow-600" 
                    bgClass="bg-yellow-50"
                    subtext="Waiting for approval"
                    cardClass="bg-yellow-50/50 border-yellow-100"
                />
                <StatCard 
                    title="Processing" 
                    count={releaseStats.processing} 
                    icon={<Loader2 size={20} className={releaseStats.processing > 0 ? "animate-spin-slow" : ""} />} 
                    colorClass="text-blue-600" 
                    bgClass="bg-blue-50"
                    subtext="Sent to stores"
                    cardClass="bg-blue-50/50 border-blue-100"
                />
                <StatCard 
                    title="Live Releases" 
                    count={releaseStats.live} 
                    icon={<CheckCircle size={20} />} 
                    colorClass="text-green-600" 
                    bgClass="bg-green-50"
                    subtext="Active on DSPs"
                    cardClass="bg-green-50/50 border-green-100"
                />
                <StatCard 
                    title="Rejected" 
                    count={releaseStats.rejected} 
                    icon={<AlertTriangle size={20} />} 
                    colorClass="text-red-600" 
                    bgClass="bg-red-50"
                    subtext="Requires attention"
                    cardClass="bg-red-50/50 border-red-100"
                />
            </div>
       </div>

       {/* PUBLISHING SECTION */}
       <div>
            <div className="flex items-center gap-2 mb-4">
                <FileText className="text-purple-600" size={20} />
                <h2 className="text-lg font-bold text-slate-700">Publishing Status</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                    title="Pending Songs" 
                    count={publishingStats.pending} 
                    icon={<Clock size={20} />} 
                    colorClass="text-orange-600" 
                    bgClass="bg-orange-50"
                    subtext="New submissions"
                    cardClass="bg-orange-50/50 border-orange-100"
                    isLoading={isLoadingSongs}
                />
                 <StatCard 
                    title="In Review" 
                    count={publishingStats.review} 
                    icon={<Loader2 size={20} className={publishingStats.review > 0 ? "animate-spin-slow" : ""} />} 
                    colorClass="text-indigo-600" 
                    bgClass="bg-indigo-50"
                    subtext="Under verification"
                    cardClass="bg-indigo-50/50 border-indigo-100"
                    isLoading={isLoadingSongs}
                />
                <StatCard 
                    title="Accepted Songs" 
                    count={publishingStats.accepted} 
                    icon={<CheckCircle size={20} />} 
                    colorClass="text-teal-600" 
                    bgClass="bg-teal-50"
                    subtext="Registered & Live"
                    cardClass="bg-teal-50/50 border-teal-100"
                    isLoading={isLoadingSongs}
                />
                <StatCard 
                    title="Rejected Songs" 
                    count={publishingStats.rejected} 
                    icon={<AlertTriangle size={20} />} 
                    colorClass="text-rose-600" 
                    bgClass="bg-rose-50"
                    subtext="Needs correction"
                    cardClass="bg-rose-50/50 border-rose-100"
                    isLoading={isLoadingSongs}
                />
            </div>
       </div>
    </div>
  );
};
