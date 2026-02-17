import React from 'react';
import { User } from 'lucide-react';

interface Props {
  currentUserData: any;
}

export const MyProfile: React.FC<Props> = ({ currentUserData }) => {
  const u = currentUserData || {};
  return (
    <div className="p-8 max-w-5xl mx-auto min-h-screen">
      <div className="mb-6">
        <h1 className="text-lg text-slate-800 tracking-tight">Profile</h1>
        <p className="text-slate-500 mt-0.5 text-[12px]">Data akun Anda.</p>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
            <User size={24} />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-800">{u.full_name || u.username || '-'}</div>
            <div className="text-slate-500">{u.email || '-'}</div>
          </div>
        </div>
        <div className="flex justify-end mb-6">
          <button
            type="button"
            className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-semibold"
            title="Daftar Publishing"
          >
            Daftar Publishing
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-4 rounded-xl border bg-slate-50">
            <div className="text-[11px] font-bold text-slate-500 uppercase mb-1">Status</div>
            <div className="text-slate-800 font-medium">{u.status || '-'}</div>
          </div>
          <div className="p-4 rounded-xl border bg-slate-50">
            <div className="text-[11px] font-bold text-slate-500 uppercase mb-1">Role</div>
            <div className="text-slate-800 font-medium">{u.role || '-'}</div>
          </div>
          <div className="p-4 rounded-xl border bg-slate-50">
            <div className="text-[11px] font-bold text-slate-500 uppercase mb-1">Company</div>
            <div className="text-slate-800 font-medium">{u.company_name || '-'}</div>
          </div>
          <div className="p-4 rounded-xl border bg-slate-50">
            <div className="text-[11px] font-bold text-slate-500 uppercase mb-1">Phone</div>
            <div className="text-slate-800 font-medium">{u.phone || '-'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
