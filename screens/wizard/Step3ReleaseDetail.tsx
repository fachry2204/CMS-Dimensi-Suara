import React from 'react';
import { ReleaseData } from '../../types';
import { TextInput } from '../../components/Input';
import { Calendar, Globe } from 'lucide-react';

interface Props {
  data: ReleaseData;
  updateData: (updates: Partial<ReleaseData>) => void;
}

export const Step3ReleaseDetail: React.FC<Props> = ({ data, updateData }) => {
  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-slate-800 mb-2">Release Specifics</h2>
        <p className="text-slate-500">Distribution details and dates.</p>
      </div>

      <div className="bg-white rounded-2xl p-8 mb-8 border border-gray-100 shadow-sm">
        <label className="block text-base font-bold text-slate-700 mb-4 flex items-center gap-2">
            <Globe size={18} className="text-blue-500" />
            Previous Distribution
        </label>
        
        <div className="space-y-3">
            <label className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${data.isNewRelease ? 'border-blue-500 bg-blue-50/50' : 'border-gray-100 hover:border-blue-200'}`}>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mr-3 ${data.isNewRelease ? 'border-blue-500' : 'border-gray-300'}`}>
                    {data.isNewRelease && <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>}
                </div>
                <input 
                    type="radio" 
                    name="releaseType" 
                    checked={data.isNewRelease === true} 
                    onChange={() => updateData({ isNewRelease: true })}
                    className="hidden"
                />
                <span className={`font-medium ${data.isNewRelease ? 'text-blue-900' : 'text-slate-600'}`}>No, this is a brand new release</span>
            </label>
            
            <label className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${!data.isNewRelease ? 'border-blue-500 bg-blue-50/50' : 'border-gray-100 hover:border-blue-200'}`}>
                 <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mr-3 ${!data.isNewRelease ? 'border-blue-500' : 'border-gray-300'}`}>
                    {!data.isNewRelease && <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>}
                </div>
                <input 
                    type="radio" 
                    name="releaseType" 
                    checked={data.isNewRelease === false}
                    onChange={() => updateData({ isNewRelease: false })}
                    className="hidden"
                />
                <span className={`font-medium ${!data.isNewRelease ? 'text-blue-900' : 'text-slate-600'}`}>Yes, this album has been released before</span>
            </label>
        </div>
      </div>

      {!data.isNewRelease && (
        <div className="mb-6 animate-fade-in-down">
             <label className="block text-sm font-bold text-slate-700 mb-2">Original Release Date</label>
             <input 
                type="date" 
                value={data.originalReleaseDate}
                onChange={(e) => updateData({ originalReleaseDate: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
             />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Planned Release Date</label>
            <div className="relative group">
                <input 
                    type="date" 
                    value={data.plannedReleaseDate}
                    onChange={(e) => updateData({ plannedReleaseDate: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-sm transition-all"
                />
                <div className="absolute right-2 top-2 bottom-2 aspect-square bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 pointer-events-none group-hover:bg-blue-200 transition-colors shadow-sm border border-blue-200">
                    <Calendar size={18} />
                </div>
            </div>
            <p className="text-xs text-blue-400 mt-2 font-medium">Recommended: 14 days from today</p>
        </div>
      </div>
    </div>
  );
};