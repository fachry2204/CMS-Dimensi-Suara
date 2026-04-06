import React, { useState, useEffect } from 'react';
import { Download, CheckCircle, FileBadge, Loader2, Clock, AlertCircle } from 'lucide-react';
import { User } from '../types';
import { api } from '../utils/api';
import { assetUrl } from '../utils/url';

interface Props {
  currentUserData: User;
  defaultTab?: 'aggregator' | 'publishing';
}

export const MyContracts: React.FC<Props> = ({ currentUserData, defaultTab }) => {
  const user = currentUserData || {} as User;
  
  // State for Admin View
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [publishingCreators, setPublishingCreators] = useState<any[]>([]);

  // If Admin/Operator and accessing Aggregator Contracts, fetch all users
  const isAdminView = (user.role === 'Admin' || user.role === 'Operator') && defaultTab === 'aggregator';

  useEffect(() => {
    if (isAdminView) {
      fetchUsers();
    } else if (user.role === 'User' && defaultTab === 'publishing') {
      fetchPublishingData();
    }
  }, [isAdminView, defaultTab]);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('cms_token');
      const res = await api.getUsers(token || '');
      const users = Array.isArray(res) ? res : [];
      setAdminUsers(users.filter((u: any) => u.role === 'User'));
    } catch (error) {
      console.error("Failed to fetch users for contracts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPublishingData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('cms_token');
      if (!token) return;
      const data = await api.publishing.getCreators(token);
      setPublishingCreators(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch publishing creators:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadFile = (url: string, filename: string) => {
    if (!url) return;
    const a = document.createElement('a');
    a.href = assetUrl(url);
    a.download = filename;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Helper to calculate End Contract Date (Date + 5 Years)
  const getEndDate = (startDate: string) => {
    if (!startDate) return '-';
    try {
      const date = new Date(startDate);
      if (isNaN(date.getTime())) return '-';
      date.setFullYear(date.getFullYear() + 5);
      return date.toISOString().split('T')[0];
    } catch {
      return '-';
    }
  };

  // --- Render for Admin Aggregator View ---
  if (isAdminView) {
    return (
      <div className="p-8 max-w-7xl mx-auto min-h-screen">
        <div className="mb-6">
          <h1 className="text-lg text-slate-800 tracking-tight">Kontrak Aggregator (Admin)</h1>
          <p className="text-slate-500 mt-0.5 text-[12px]">Daftar kontrak user aggregator.</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
              <FileBadge size={24} />
            </div>
            <div>
              <div className="text-xl font-bold text-slate-800">Daftar Kontrak User</div>
              <div className="text-slate-500 text-sm">Semua user dengan role 'User'.</div>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin text-purple-600" size={32} />
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 border-r border-slate-200 last:border-r-0">No</th>
                    <th className="px-4 py-3 border-r border-slate-200 last:border-r-0">Nama User</th>
                    <th className="px-4 py-3 border-r border-slate-200 last:border-r-0">Tanggal Approved</th>
                    <th className="px-4 py-3 border-r border-slate-200 last:border-r-0">Persentase</th>
                    <th className="px-4 py-3 border-r border-slate-200 last:border-r-0">Akhir Kontrak (+5 Thn)</th>
                    <th className="px-4 py-3 border-r border-slate-200 last:border-r-0">Status</th>
                    <th className="px-4 py-3">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {adminUsers.length > 0 ? (
                    adminUsers.map((u, index) => (
                      <tr key={u.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100 last:border-b-0">
                        <td className="px-4 py-3 text-slate-500 border-r border-slate-100 last:border-r-0">{index + 1}</td>
                        <td className="px-4 py-3 font-medium text-slate-800 border-r border-slate-100 last:border-r-0">
                          {u.full_name || u.name || u.username}
                        </td>
                        <td className="px-4 py-3 text-slate-600 border-r border-slate-100 last:border-r-0">
                          {u.joinedDate || u.joined_date || '-'}
                        </td>
                        <td className="px-4 py-3 text-slate-600 border-r border-slate-100 last:border-r-0">
                          {u.aggregator_percentage !== undefined ? `${u.aggregator_percentage}%` : '-'}
                        </td>
                        <td className="px-4 py-3 text-slate-600 border-r border-slate-100 last:border-r-0">
                          {getEndDate(u.joinedDate || u.joined_date)}
                        </td>
                        <td className="px-4 py-3 border-r border-slate-100 last:border-r-0">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                            u.contract_status === 'Done' ? 'bg-green-50 text-green-600 border-green-100' : 
                            u.contract_status === 'On Review' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                            'bg-yellow-50 text-yellow-600 border-yellow-100'
                          }`}>
                            {u.contract_status === 'Done' ? <CheckCircle size={12} /> : u.contract_status === 'On Review' ? <Clock size={12} /> : <AlertCircle size={12} />}
                            {u.contract_status || 'Not Generated'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button 
                            onClick={() => window.location.href = `/contracts/aggregator/${u.id}`}
                            className="text-blue-600 hover:text-blue-700 font-medium text-xs border border-blue-200 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            View Detail
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                        Tidak ada data user.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- Default Render for Normal User (My Contracts) ---
  
  // Define contracts array with type
  const contracts: Array<{
    id: string | number;
    type: string;
    percentage: number;
    date: string | null | undefined;
    status: string;
    doc: string | null;
  }> = [];

  const addAggregator = (!defaultTab || defaultTab === 'aggregator');
  const addPublishing = (!defaultTab || defaultTab === 'publishing');

  if (addAggregator) {
    contracts.push({
      id: 'agg',
      type: 'Aggregator',
      percentage: user.aggregator_percentage || 0,
      date: user.joinedDate || user.registeredDate,
      status: user.contract_status || 'Not Generated',
      doc: user.contract_doc_path || null
    });
  }

  if (addPublishing) {
    publishingCreators.forEach((c: any) => {
      contracts.push({
        id: `pub_${c.id}`,
        type: `Publishing (${c.name})`,
        percentage: user.publishing_percentage || 0,
        date: c.created_at || user.joinedDate,
        status: c.contract_status || 'Not Generated',
        doc: c.contract_doc_path || null
      });
    });
    
    // Fallback if no specific writer data but publishing is active
    if (publishingCreators.length === 0 && user.publishing_percentage) {
        contracts.push({
            id: 'pub_generic',
            type: 'Publishing',
            percentage: user.publishing_percentage || 0,
            date: user.joinedDate,
            status: 'Not Generated',
            doc: null
        });
    }
  }

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Done': return 'bg-green-50 text-green-600 border-green-100';
      case 'On Review': return 'bg-blue-50 text-blue-600 border-blue-100';
      default: return 'bg-yellow-50 text-yellow-600 border-yellow-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Done': return <CheckCircle size={12} />;
      case 'On Review': return <Clock size={12} />;
      default: return <AlertCircle size={12} />;
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto min-h-screen">
      <div className="mb-6">
        <h1 className="text-lg text-slate-800 tracking-tight">Kontrak Saya</h1>
        <p className="text-slate-500 mt-0.5 text-[12px]">Dokumen kontrak Anda.</p>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
            <FileBadge size={24} />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-800">Kontrak {defaultTab === 'aggregator' ? 'Aggregator' : defaultTab === 'publishing' ? 'Publishing' : ''}</div>
            <div className="text-slate-500 text-sm">Daftar kontrak Aggregator dan Publishing.</div>
          </div>
        </div>

        {isLoading ? (
            <div className="flex justify-center py-12">
                <Loader2 className="animate-spin text-purple-600" size={32} />
            </div>
        ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                <tr>
                    <th className="px-4 py-3 border-r border-slate-200 last:border-r-0">No</th>
                    <th className="px-4 py-3 border-r border-slate-200 last:border-r-0">Jenis Kontrak</th>
                    <th className="px-4 py-3 border-r border-slate-200 last:border-r-0">Tanggal Mulai</th>
                    <th className="px-4 py-3 border-r border-slate-200 last:border-r-0">Persentase</th>
                    <th className="px-4 py-3 border-r border-slate-200 last:border-r-0">Status</th>
                    <th className="px-4 py-3">Dokumen</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                {contracts.length > 0 ? (
                    contracts.map((contract, index) => (
                    <tr key={contract.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100 last:border-b-0">
                        <td className="px-4 py-3 text-slate-500 border-r border-slate-100 last:border-r-0">{index + 1}</td>
                        <td className="px-4 py-3 font-medium text-slate-800 border-r border-slate-100 last:border-r-0">{contract.type}</td>
                        <td className="px-4 py-3 text-slate-600 border-r border-slate-100 last:border-r-0">
                            {contract.date ? (contract.date.includes('T') ? contract.date.split('T')[0] : contract.date) : '-'}
                        </td>
                        <td className="px-4 py-3 text-slate-600 border-r border-slate-100 last:border-r-0">{contract.percentage}%</td>
                        <td className="px-4 py-3 border-r border-slate-100 last:border-r-0">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusStyle(contract.status)}`}>
                            {getStatusIcon(contract.status)}
                            {contract.status}
                        </span>
                        </td>
                        <td className="px-4 py-3">
                        <button 
                            onClick={() => downloadFile(contract.doc!, `kontrak_${contract.type.toLowerCase().replace(/\s+/g, '_')}.pdf`)}
                            className="text-blue-600 hover:text-blue-700 font-medium text-xs flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed" 
                            disabled={!contract.doc}
                        >
                            <Download size={14} />
                            Unduh
                        </button>
                        </td>
                    </tr>
                    ))
                ) : (
                    <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                        Tidak ada data kontrak.
                    </td>
                    </tr>
                )}
                </tbody>
            </table>
            </div>
        )}
      </div>
    </div>
  );
}
