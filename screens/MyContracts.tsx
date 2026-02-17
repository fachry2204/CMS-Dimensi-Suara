import React from 'react';
import { FileText } from 'lucide-react';

export const MyContracts: React.FC = () => {
  return (
    <div className="p-8 max-w-5xl mx-auto min-h-screen">
      <div className="mb-6">
        <h1 className="text-lg text-slate-800 tracking-tight">Kontrak</h1>
        <p className="text-slate-500 mt-0.5 text-[12px]">Dokumen kontrak Anda.</p>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
            <FileText size={20} />
          </div>
          <div className="text-slate-800 font-bold">Daftar Kontrak</div>
        </div>
        <div className="p-6 border rounded-xl bg-slate-50 text-slate-500 text-sm">
          Belum ada data kontrak.
        </div>
      </div>
    </div>
  );
}
