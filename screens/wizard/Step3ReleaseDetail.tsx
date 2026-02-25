import React from 'react';
import { ReleaseData } from '../../types';
import { TextInput } from '../../components/Input';
import { Calendar, Globe } from 'lucide-react';
import socialLogo from '../../assets/platforms/social.svg';
import youtubeMusicLogo from '../../assets/platforms/youtube-music.svg';
import allDspLogo from '../../assets/platforms/alldsp.svg';

interface Props {
  data: ReleaseData;
  updateData: (updates: Partial<ReleaseData> | ((prev: ReleaseData) => Partial<ReleaseData>)) => void;
}

export const Step3ReleaseDetail: React.FC<Props> = ({ data, updateData }) => {
  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-sm font-medium text-slate-800 mb-1">Release Specifics</h2>
        <p className="text-[10px] text-slate-500">Distribution details and dates.</p>
      </div>

      <div className="border border-gray-200 rounded-lg p-4 relative mt-4 mb-6">
        <h3 className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-3 absolute -top-2 left-3 bg-white px-1">Distribution History</h3>
        
        <div className="space-y-2">
            <label className={`flex items-center p-2 rounded border cursor-pointer transition-all ${data.isNewRelease ? 'border-blue-500 bg-blue-50/50' : 'border-gray-200 hover:border-blue-200'}`}>
                <div className={`w-3 h-3 rounded-full border flex items-center justify-center mr-2 ${data.isNewRelease ? 'border-blue-500' : 'border-gray-300'}`}>
                    {data.isNewRelease && <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>}
                </div>
                <input 
                    type="radio" 
                    name="releaseType" 
                    checked={data.isNewRelease === true} 
                    onChange={() => updateData({ isNewRelease: true })}
                    className="hidden"
                />
                <span className={`text-[10px] font-medium ${data.isNewRelease ? 'text-blue-900' : 'text-slate-600'}`}>No, this is a brand new release</span>
            </label>
            
            <label className={`flex items-center p-2 rounded border cursor-pointer transition-all ${!data.isNewRelease ? 'border-blue-500 bg-blue-50/50' : 'border-gray-200 hover:border-blue-200'}`}>
                 <div className={`w-3 h-3 rounded-full border flex items-center justify-center mr-2 ${!data.isNewRelease ? 'border-blue-500' : 'border-gray-300'}`}>
                    {!data.isNewRelease && <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>}
                </div>
                <input 
                    type="radio" 
                    name="releaseType" 
                    checked={data.isNewRelease === false}
                    onChange={() => updateData({ isNewRelease: false })}
                    className="hidden"
                />
                <span className={`text-[10px] font-medium ${!data.isNewRelease ? 'text-blue-900' : 'text-slate-600'}`}>Yes, this album has been released before</span>
            </label>
        </div>

        {!data.isNewRelease && (
            <div className="mt-3 pt-3 border-t border-gray-100 animate-fade-in-down">
                 <label className="block text-[10px] font-medium text-slate-700 mb-1">Original Release Date</label>
                 <input 
                    type="date" 
                    value={data.originalReleaseDate}
                    onChange={(e) => updateData({ originalReleaseDate: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-[10px] border border-gray-300 rounded bg-gray-50 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
                 />
            </div>
        )}
      </div>

      <div className="border border-gray-200 rounded-lg p-4 relative mt-6 mb-6">
        <h3 className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-3 absolute -top-2 left-3 bg-white px-1">Distribution Channels</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {[
            { id: 'SOCIAL', label: 'Social Media', logo: socialLogo },
            { id: 'YOUTUBE_MUSIC', label: 'YouTube Music', logo: youtubeMusicLogo },
            { id: 'ALL_DSP', label: 'All DSP', logo: allDspLogo },
          ].map(opt => {
            const selected = Array.isArray(data.distributionTargets) && data.distributionTargets.some(t => t.id === opt.id);
            return (
              <button
                key={opt.id}
                onClick={() => {
                  const current = Array.isArray(data.distributionTargets) ? [...data.distributionTargets] : [];
                  const idx = current.findIndex(t => t.id === opt.id);
                  if (idx >= 0) {
                    current.splice(idx, 1);
                  } else {
                    current.push({ id: opt.id, label: opt.label, logo: opt.logo });
                  }
                  updateData({ distributionTargets: current });
                }}
                className={`flex items-center gap-2 p-2 rounded border ${selected ? 'bg-blue-50 border-blue-200' : 'border-gray-200'} hover:border-blue-200 transition-colors text-left`}
              >
                <div className="w-6 h-6 rounded flex items-center justify-center bg-white border border-gray-200 overflow-hidden shrink-0">
                  <img src={opt.logo} alt={opt.label} className="w-4 h-4 object-contain" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[10px] text-slate-800 truncate">{opt.label}</div>
                  <div className="text-[9px] text-slate-400 truncate">{selected ? 'Selected' : 'Click to select'}</div>
                </div>
                <div className={`w-3 h-3 rounded border shrink-0 ${selected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'} flex items-center justify-center`}>
                  {selected && <div className="w-1.5 h-1.5 bg-white rounded-[1px]"></div>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="border border-gray-200 rounded-lg p-4 relative mt-6">
        <h3 className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-3 absolute -top-2 left-3 bg-white px-1">Schedule</h3>
        <div>
            <label className="block text-[10px] font-medium text-slate-700 mb-1">Planned Release Date</label>
            <div className="relative group max-w-md">
                <input 
                    type="date" 
                    value={data.plannedReleaseDate}
                    onChange={(e) => updateData({ plannedReleaseDate: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-[10px] border border-gray-300 rounded bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 shadow-sm transition-all pl-2.5 pr-8"
                />
                <div className="absolute right-2 top-1.5 bottom-1.5 aspect-square bg-blue-50 rounded flex items-center justify-center text-blue-600 pointer-events-none group-hover:bg-blue-100 transition-colors shadow-sm border border-blue-100">
                    <Calendar size={12} />
                </div>
            </div>
            <p className="text-[10px] text-blue-500 mt-2 font-medium flex items-center gap-1.5">
                <Calendar size={10} />
                Recommended: Set date at least 14 days from today
            </p>
        </div>
      </div>
    </div>
  );
};
