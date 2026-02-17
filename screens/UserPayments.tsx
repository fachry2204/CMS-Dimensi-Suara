import React from 'react';
import { ReportData } from '../types';
import { DollarSign } from 'lucide-react';

interface Props {
  reportData: ReportData[];
  currentUserData: any;
}

export const UserPayments: React.FC<Props> = ({ reportData, currentUserData }) => {
  const uname = currentUserData?.username || '';
  const full = currentUserData?.full_name || '';
  const myReports = reportData.filter(d => {
    const a = (d.artist || '').toLowerCase();
    return a.includes((full || '').toLowerCase()) || a.includes((uname || '').toLowerCase());
  });
  const monthly: Record<string, number> = {};
  myReports.forEach(d => {
    const key = d.period || 'N/A';
    monthly[key] = (monthly[key] || 0) + (d.revenue || 0);
  });
  const rows = Object.entries(monthly).sort((a, b) => a[0].localeCompare(b[0]));
  const totalRevenue = rows.reduce((s, [, v]) => s + v, 0);

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen">
      <div className="mb-6">
        <h1 className="text-lg text-slate-800 tracking-tight">Pembayaran</h1>
        <p className="text-slate-500 mt-0.5 text-[12px]">Ringkasan pendapatan Anda per periode.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="p-5 rounded-2xl shadow-sm border bg-green-50 border-green-100 flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-[11px] font-bold uppercase tracking-wider mb-1">Total Revenue</p>
            <h3 className="text-2xl font-bold text-slate-800">{totalRevenue.toLocaleString()}</h3>
            <p className="text-[11px] text-slate-400 mt-1.5 font-medium">Akumulasi</p>
          </div>
          <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-green-100 text-green-600">
            <DollarSign size={20} />
          </div>
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-sm text-slate-800">Ringkasan Periode</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Periode</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map(([period, revenue]) => (
                <tr key={period} className="hover:bg-slate-50/50">
                  <td className="px-6 py-3 font-bold text-slate-700">{period}</td>
                  <td className="px-6 py-3 text-slate-600">{revenue.toLocaleString()}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={2} className="p-8 text-center text-slate-400 text-sm">Belum ada data.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
