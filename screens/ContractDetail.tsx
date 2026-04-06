import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Mail, Calendar, FileText, CheckCircle, Clock, AlertCircle, Save, Link, Upload } from 'lucide-react';
import { api } from '../utils/api';
import { getProfileImageUrl } from '../utils/imageUtils';

interface Props {
  token: string;
}

export const ContractDetail: React.FC<Props> = ({ token }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Contract State
  const [contractStatus, setContractStatus] = useState<string>('Not Generated');
  const [notes, setNotes] = useState('');
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [contractDocPath, setContractDocPath] = useState<string>('');
  const [contractInputMethod, setContractInputMethod] = useState<'upload' | 'link'>('upload');
  const [contractLink, setContractLink] = useState<string>('');

  useEffect(() => {
    const fetchUser = async () => {
      if (!id) return;
      try {
        const data = await api.getUser(token, id);
        setUser(data);
        setContractStatus(data.contract_status || 'Not Generated');
        if (data.contract_doc_path) {
          setContractDocPath(data.contract_doc_path);
          if (data.contract_doc_path.startsWith('http') || data.contract_doc_path.startsWith('www.')) {
            setContractInputMethod('link');
            setContractLink(data.contract_doc_path);
          } else {
            setContractInputMethod('upload');
          }
        }
        // Notes could be added to backend later if needed, currently not persisted in DB for contract notes specifically
      } catch (err) {
        console.error('Failed to fetch user details:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [id, token]);

  const handleSave = async () => {
    if (!user || !id) return;
    setSaving(true);
    try {
      let finalDocPath = contractDocPath;

      if (contractStatus === 'Done') {
        if (contractInputMethod === 'upload') {
          if (!contractDocPath && !contractFile) {
            alert('Kontrak status Done wajib upload file PDF.');
            setSaving(false);
            return;
          }
          if (contractFile) {
            if (contractFile.type !== 'application/pdf' && !contractFile.name.toLowerCase().endsWith('.pdf')) {
              alert('File kontrak harus PDF.');
              setSaving(false);
              return;
            }
            const res = await api.uploadUserDoc(token, 'CONTRACT', contractFile);
            finalDocPath = res.path;
            setContractDocPath(res.path);
          }
        } else {
          if (!contractLink.trim()) {
            alert('Link kontrak wajib diisi.');
            setSaving(false);
            return;
          }
          finalDocPath = contractLink;
        }
      }

      // Re-using updateUserStatus API but only sending contract_status
      // We need to pass current status to avoid changing it accidentally if the API requires it
      await api.updateUserStatus(
        token, 
        user.id, 
        user.status, // Keep existing status
        undefined, // Reason
        user.aggregator_percentage, 
        user.publishing_percentage,
        contractStatus, // Update contract status
        contractStatus === 'Done' ? (finalDocPath || undefined) : undefined
      );
      alert('Status kontrak berhasil diperbarui!');
    } catch (err) {
      console.error('Failed to update contract status:', err);
      alert('Gagal memperbarui status kontrak.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">Data kontrak tidak ditemukan.</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-blue-600 hover:underline">Kembali</button>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto min-h-screen animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => navigate('/contracts/aggregator')}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Detail Kontrak Aggregator</h1>
          <p className="text-slate-500 text-sm">Kelola status dan informasi kontrak user.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* User Info Card */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 text-center">
            <div className="w-24 h-24 mx-auto bg-slate-100 rounded-full overflow-hidden mb-4 border-4 border-white shadow-lg">
              {user.profile_picture ? (
                <img src={getProfileImageUrl(user.profile_picture)} alt={user.username} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400">
                  <User size={40} />
                </div>
              )}
            </div>
            <h2 className="text-lg font-bold text-slate-800">{user.full_name || user.username}</h2>
            {/* Username display removed per request */}
            
            <div className="flex flex-col gap-2 text-left mt-6">
              <div className="flex items-center gap-3 text-sm text-slate-600 p-2 bg-slate-50 rounded-lg">
                <Mail size={16} className="text-slate-400" />
                <span className="truncate" title={user.email}>{user.email}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600 p-2 bg-slate-50 rounded-lg">
                <Calendar size={16} className="text-slate-400" />
                <span>
                  Bergabung: {user.joinedDate ? new Date(user.joinedDate).toLocaleDateString('id-ID') : '-'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Contract Management */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <FileText size={20} className="text-blue-600" />
              Status Kontrak
            </h3>

            <div className="space-y-6">
              {/* Status Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">Pilih Status</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    onClick={() => setContractStatus('Not Generated')}
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${
                      contractStatus === 'Not Generated'
                        ? 'border-red-400 bg-red-50 text-red-800 shadow-sm'
                        : 'border-slate-100 text-slate-500 hover:border-slate-200'
                    }`}
                  >
                    <AlertCircle size={18} />
                    <span className="font-medium">Not Generated</span>
                  </button>

                  <button
                    onClick={() => setContractStatus('On Review')}
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${
                      contractStatus === 'On Review'
                        ? 'border-yellow-400 bg-yellow-50 text-yellow-800 shadow-sm'
                        : 'border-slate-100 text-slate-500 hover:border-slate-200'
                    }`}
                  >
                    <Clock size={18} />
                    <span className="font-medium">On Review</span>
                  </button>

                  <button
                    onClick={() => setContractStatus('Done')}
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${
                      contractStatus === 'Done'
                        ? 'border-green-500 bg-green-50 text-green-800 shadow-sm'
                        : 'border-slate-100 text-slate-500 hover:border-slate-200'
                    }`}
                  >
                    <CheckCircle size={18} />
                    <span className="font-medium">Done</span>
                  </button>
                </div>
              </div>

              {contractStatus === 'Done' && (
                <div className="space-y-4 p-4 bg-slate-50 rounded-2xl border border-slate-200 animate-fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <label className="block text-sm font-bold text-slate-700">Metode Kontrak</label>
                    <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                      <button
                        onClick={() => setContractInputMethod('upload')}
                        className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                          contractInputMethod === 'upload'
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        <Upload size={12} />
                        UPLOAD PDF
                      </button>
                      <button
                        onClick={() => setContractInputMethod('link')}
                        className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                          contractInputMethod === 'link'
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        <Link size={12} />
                        ADD LINK
                      </button>
                    </div>
                  </div>

                  {contractInputMethod === 'upload' ? (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-wider">File Kontrak (PDF)</label>
                      <input
                        type="file"
                        accept="application/pdf"
                        onChange={(e) => setContractFile(e.target.files?.[0] || null)}
                        className="block w-full text-sm text-slate-700 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                      {contractDocPath && !contractDocPath.startsWith('http') && !contractDocPath.startsWith('www.') && (
                        <p className="text-[11px] text-green-600 mt-2 flex items-center gap-1 font-medium">
                          <CheckCircle size={12} />
                          Kontrak terunggah: {contractDocPath.split('/').pop()}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-wider">Link Kontrak</label>
                      <div className="relative">
                        <Link size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="url"
                          placeholder="https://..."
                          value={contractLink}
                          onChange={(e) => setContractLink(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
                        />
                      </div>
                    </div>
                  )}
                  <p className="text-[10px] text-slate-400 font-medium">Wajib diisi saat status kontrak “Done”.</p>
                </div>
              )}

              {/* Additional Info / Notes (Placeholder) */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Catatan (Opsional)</label>
                <textarea
                  className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
                  rows={4}
                  placeholder="Tambahkan catatan mengenai kontrak ini..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                ></textarea>
                <p className="text-xs text-slate-400 mt-1">*Catatan ini hanya bersifat sementara (belum disimpan ke database).</p>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 disabled:opacity-70"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      Simpan Perubahan
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
