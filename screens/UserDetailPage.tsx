import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User } from '../types';
import { api } from '../utils/api';
import { XCircle, Eye, Download, CheckCircle } from 'lucide-react';
import { AlertModal } from '../components/AlertModal';

export const UserDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [token] = useState(localStorage.getItem('cms_token') || '');
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusDraft, setStatusDraft] = useState<User['status'] | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [aggregatorPercentage, setAggregatorPercentage] = useState<number | undefined>(undefined);
  const [publishingPercentage, setPublishingPercentage] = useState<number | undefined>(undefined);
  const [showDocPreview, setShowDocPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [previewIsPdf, setPreviewIsPdf] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [alertState, setAlertState] = useState<{ isOpen: boolean; title: string; message: string; type: 'error' | 'warning' | 'info' | 'success' }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'error'
  });

  useEffect(() => {
    const load = async () => {
      if (!id || !token) return;
      setIsLoading(true);
      try {
        const detail = await api.getUser(token, id);
        setUser(detail);
        setStatusDraft(detail.status);
        setRejectReason(detail.rejection_reason || detail.block_reason || '');
        setAggregatorPercentage(detail.aggregator_percentage);
        setPublishingPercentage(detail.publishing_percentage);
      } catch {
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [id, token]);

  const handleSave = async () => {
    if (!user) return;
    const s = statusDraft || user.status;
    if ((s === 'Rejected' || s === 'Blocked') && (!rejectReason || !rejectReason.trim())) {
      setAlertState({
        isOpen: true,
        title: 'Validasi',
        message: `Alasan ${s === 'Rejected' ? 'penolakan' : 'pemblokiran'} wajib diisi`,
        type: 'warning'
      });
      return;
    }
    if (s === 'Approved') {
        if (aggregatorPercentage === undefined || aggregatorPercentage === null || publishingPercentage === undefined || publishingPercentage === null) {
             setAlertState({
                isOpen: true,
                title: 'Validasi',
                message: 'Persentase Aggregator dan Publishing wajib diisi untuk status Approved',
                type: 'warning'
             });
             return;
        }
    }
    try {
      const res = await api.updateUserStatus(
        token,
        user.id,
        s,
        (s === 'Rejected' || s === 'Blocked') ? rejectReason.trim() : undefined,
        aggregatorPercentage,
        publishingPercentage
      );
      const merged: User = {
        ...user,
        ...res.user,
        registeredDate: (res.user as any).registeredDate ?? user.registeredDate,
        joinedDate: (res.user as any).joinedDate ?? user.joinedDate,
        rejectedDate: (res.user as any).rejectedDate ?? user.rejectedDate,
        rejection_reason: (res.user as any).rejection_reason ?? user.rejection_reason,
        blockedAt: (res.user as any).blockedAt ?? user.blockedAt,
        block_reason: (res.user as any).block_reason ?? user.block_reason
      };
      setUser(merged);
      setStatusDraft(res.user.status);
      if (s !== 'Rejected' && s !== 'Blocked') setRejectReason('');
      setShowSuccessModal(true);
    } catch (err: any) {
      setAlertState({
        isOpen: true,
        title: 'Gagal Menyimpan',
        message: err.message,
        type: 'error'
      });
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 max-w-7xl mx-auto min-h-screen">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">Memuat data...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-8 max-w-7xl mx-auto min-h-screen">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">User tidak ditemukan</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 animate-fade-in">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-base font-medium text-slate-800">Profile Lengkap</h3>
          <button onClick={() => navigate('/users')} className="text-slate-400 hover:text-slate-600">
            <XCircle size={24} />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <div className="text-sm font-medium text-slate-800">{user.full_name || user.name}</div>
            <div className="text-xs text-slate-500">{user.email}</div>
            <div className="text-xs text-slate-500">Role: {user.role}</div>
            <div className="text-xs text-slate-500">Joined: {user.registeredDate}</div>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <tbody className="[&>tr>td]:py-2 [&>tr>td]:px-3 [&>tr:nth-child(even)]:bg-slate-50">
                  <tr><td className="text-slate-600">Account Type</td><td className="font-normal text-slate-700">{user.account_type || '-'}</td></tr>
                  {(user.account_type === 'COMPANY') && (
                    <tr><td className="text-slate-600">Company</td><td className="font-normal text-slate-700">{user.company_name || '-'}</td></tr>
                  )}
                  <tr><td className="text-slate-600">Nama Lengkap</td><td className="font-normal text-slate-700">{user.full_name || '-'}</td></tr>
                  <tr><td className="text-slate-600">NIK</td><td className="font-normal text-slate-700">{user.nik || '-'}</td></tr>
                  <tr><td className="text-slate-600">Phone</td><td className="font-normal text-slate-700">{user.phone || '-'}</td></tr>
                  <tr><td className="text-slate-600">Address</td><td className="font-normal text-slate-700 whitespace-pre-line">{user.address || '-'}</td></tr>
                  <tr><td className="text-slate-600">Country</td><td className="font-normal text-slate-700">{user.country || '-'}</td></tr>
                  <tr><td className="text-slate-600">Province</td><td className="font-normal text-slate-700">{user.province || '-'}</td></tr>
                  <tr><td className="text-slate-600">City</td><td className="font-normal text-slate-700">{user.city || '-'}</td></tr>
                  <tr><td className="text-slate-600">District</td><td className="font-normal text-slate-700">{user.district || '-'}</td></tr>
                  <tr><td className="text-slate-600">Subdistrict</td><td className="font-normal text-slate-700">{user.subdistrict || '-'}</td></tr>
                  <tr><td className="text-slate-600">Postal Code</td><td className="font-normal text-slate-700">{user.postal_code || '-'}</td></tr>
                  {(user.account_type === 'COMPANY') && (
                    <>
                      <tr><td className="text-slate-600">PIC Name</td><td className="font-normal text-slate-700">{user.pic_name || '-'}</td></tr>
                      <tr><td className="text-slate-600">PIC Position</td><td className="font-normal text-slate-700">{user.pic_position || '-'}</td></tr>
                      <tr><td className="text-slate-600">PIC Phone</td><td className="font-normal text-slate-700">{user.pic_phone || '-'}</td></tr>
                    </>
                  )}
                  <tr><td className="text-slate-600">Approved</td><td className="font-normal text-slate-700">{user.joinedDate || '-'}</td></tr>
                  {(user.status === 'Rejected' || statusDraft === 'Rejected') && (
                    <>
                      <tr><td className="text-slate-600">Reject Date</td><td className="font-normal text-slate-700">{user.rejectedDate || '-'}</td></tr>
                      <tr><td className="text-slate-600">Rejection Reason</td><td className="font-normal text-slate-700">{user.rejection_reason || '-'}</td></tr>
                    </>
                  )}
                  {(user.status === 'Blocked' || statusDraft === 'Blocked') && (
                    <>
                      <tr><td className="text-slate-600">Blocked Date</td><td className="font-normal text-slate-700">{user.blockedAt || '-'}</td></tr>
                      <tr><td className="text-slate-600">Block Reason</td><td className="font-normal text-slate-700">{user.block_reason || '-'}</td></tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-slate-800">Documents</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {user.ktp_doc_path && (
                  <div className="border border-slate-200 rounded-xl p-3">
                    <div className="text-xs font-medium mb-2">KTP</div>
                    {user.ktp_doc_path.toLowerCase().endsWith('.pdf') ? (
                      <iframe src={user.ktp_doc_path} className="w-full h-40 rounded-md" />
                    ) : (
                      <img 
                        src={user.ktp_doc_path} 
                        alt="KTP" 
                        className="w-full h-40 object-cover rounded-md cursor-pointer hover:opacity-90 transition-opacity" 
                        onClick={() => { setPreviewUrl(user.ktp_doc_path!); setPreviewIsPdf(false); setShowDocPreview(true); }}
                      />
                    )}
                    <div className="flex gap-3 mt-2">
                      <button
                        onClick={() => { setPreviewUrl(user.ktp_doc_path!); setPreviewIsPdf(user.ktp_doc_path!.toLowerCase().endsWith('.pdf')); setShowDocPreview(true); }}
                        className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 flex items-center gap-1"
                        title="Preview"
                      >
                        <Eye size={14} /> Preview
                      </button>
                      <a
                        href={user.ktp_doc_path}
                        download
                        className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 flex items-center gap-1"
                        title="Download"
                      >
                        <Download size={14} /> Download
                      </a>
                    </div>
                  </div>
                )}
                {user.npwp_doc_path && (
                  <div className="border border-slate-200 rounded-xl p-3">
                    <div className="text-xs font-medium mb-2">NPWP</div>
                    {user.npwp_doc_path.toLowerCase().endsWith('.pdf') ? (
                      <iframe src={user.npwp_doc_path} className="w-full h-40 rounded-md" />
                    ) : (
                      <img 
                        src={user.npwp_doc_path} 
                        alt="NPWP" 
                        className="w-full h-40 object-cover rounded-md cursor-pointer hover:opacity-90 transition-opacity" 
                        onClick={() => { setPreviewUrl(user.npwp_doc_path!); setPreviewIsPdf(false); setShowDocPreview(true); }}
                      />
                    )}
                    <div className="flex gap-3 mt-2">
                      <button
                        onClick={() => { setPreviewUrl(user.npwp_doc_path!); setPreviewIsPdf(user.npwp_doc_path!.toLowerCase().endsWith('.pdf')); setShowDocPreview(true); }}
                        className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 flex items-center gap-1"
                        title="Preview"
                      >
                        <Eye size={14} /> Preview
                      </button>
                      <a
                        href={user.npwp_doc_path}
                        download
                        className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 flex items-center gap-1"
                        title="Download"
                      >
                        <Download size={14} /> Download
                      </a>
                    </div>
                  </div>
                )}
                {user.signature_doc_path && (
                  <div className="border border-slate-200 rounded-xl p-3">
                    <div className="text-xs font-medium mb-2">File Tandatangan</div>
                    {user.signature_doc_path.toLowerCase().endsWith('.pdf') ? (
                      <iframe src={user.signature_doc_path} className="w-full h-40 rounded-md" />
                    ) : (
                      <img 
                        src={user.signature_doc_path} 
                        alt="Tandatangan" 
                        className="w-full h-40 object-cover rounded-md cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => { setPreviewUrl(user.signature_doc_path!); setPreviewIsPdf(false); setShowDocPreview(true); }}
                      />
                    )}
                    <div className="flex gap-3 mt-2">
                      <button
                        onClick={() => { setPreviewUrl(user.signature_doc_path!); setPreviewIsPdf(user.signature_doc_path!.toLowerCase().endsWith('.pdf')); setShowDocPreview(true); }}
                        className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 flex items-center gap-1"
                        title="Preview"
                      >
                        <Eye size={14} /> Preview
                      </button>
                      <a
                        href={user.signature_doc_path}
                        download
                        className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 flex items-center gap-1"
                        title="Download"
                      >
                        <Download size={14} /> Download
                      </a>
                    </div>
                  </div>
                )}
                {(user.account_type === 'COMPANY') && user.nib_doc_path && (
                  <div className="border border-slate-200 rounded-xl p-3">
                    <div className="text-xs font-medium mb-2">NIB</div>
                    {user.nib_doc_path.toLowerCase().endsWith('.pdf') ? (
                      <iframe src={user.nib_doc_path} className="w-full h-40 rounded-md" />
                    ) : (
                      <img 
                        src={user.nib_doc_path} 
                        alt="NIB" 
                        className="w-full h-40 object-cover rounded-md cursor-pointer hover:opacity-90 transition-opacity" 
                        onClick={() => { setPreviewUrl(user.nib_doc_path!); setPreviewIsPdf(false); setShowDocPreview(true); }}
                      />
                    )}
                    <div className="flex gap-3 mt-2">
                      <button
                        onClick={() => { setPreviewUrl(user.nib_doc_path!); setPreviewIsPdf(user.nib_doc_path!.toLowerCase().endsWith('.pdf')); setShowDocPreview(true); }}
                        className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 flex items-center gap-1"
                        title="Preview"
                      >
                        <Eye size={14} /> Preview
                      </button>
                      <a
                        href={user.nib_doc_path}
                        download
                        className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 flex items-center gap-1"
                        title="Download"
                      >
                        <Download size={14} /> Download
                      </a>
                    </div>
                  </div>
                )}
                {(user.account_type === 'COMPANY') && user.kemenkumham_doc_path && (
                  <div className="border border-slate-200 rounded-xl p-3">
                    <div className="text-xs font-medium mb-2">Kemenkumham</div>
                    {user.kemenkumham_doc_path.toLowerCase().endsWith('.pdf') ? (
                      <iframe src={user.kemenkumham_doc_path} className="w-full h-40 rounded-md" />
                    ) : (
                      <img 
                        src={user.kemenkumham_doc_path} 
                        alt="Kemenkumham" 
                        className="w-full h-40 object-cover rounded-md cursor-pointer hover:opacity-90 transition-opacity" 
                        onClick={() => { setPreviewUrl(user.kemenkumham_doc_path!); setPreviewIsPdf(false); setShowDocPreview(true); }}
                      />
                    )}
                    <div className="flex gap-3 mt-2">
                      <button
                        onClick={() => { setPreviewUrl(user.kemenkumham_doc_path!); setPreviewIsPdf(user.kemenkumham_doc_path!.toLowerCase().endsWith('.pdf')); setShowDocPreview(true); }}
                        className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 flex items-center gap-1"
                        title="Preview"
                      >
                        <Eye size={14} /> Preview
                      </button>
                      <a
                        href={user.kemenkumham_doc_path}
                        download
                        className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 flex items-center gap-1"
                        title="Download"
                      >
                        <Download size={14} /> Download
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-800">Status</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              <button
                onClick={() => { setStatusDraft('Pending'); setRejectReason(''); }}
                className={`px-3 py-2 rounded-xl text-xs font-medium border ${statusDraft === 'Pending' ? 'bg-yellow-100 border-yellow-200 text-yellow-800' : 'border-slate-200 text-slate-700 hover:bg-slate-100'}`}
              >
                Pending
              </button>
              <button
                onClick={() => { setStatusDraft('Review'); setRejectReason(''); }}
                className={`px-3 py-2 rounded-xl text-xs font-medium border ${statusDraft === 'Review' ? 'bg-blue-100 border-blue-200 text-blue-800' : 'border-slate-200 text-slate-700 hover:bg-slate-100'}`}
              >
                Di Riview
              </button>
              <button
                onClick={() => { setStatusDraft('Approved'); setRejectReason(''); }}
                className={`px-3 py-2 rounded-xl text-xs font-medium border ${statusDraft === 'Approved' ? 'bg-green-100 border-green-200 text-green-800' : 'border-slate-200 text-slate-700 hover:bg-slate-100'}`}
              >
                Di Approved
              </button>
              <button
                onClick={() => { setStatusDraft('Rejected'); }}
                className={`px-3 py-2 rounded-xl text-xs font-medium border ${statusDraft === 'Rejected' ? 'bg-red-100 border-red-200 text-red-800' : 'border-slate-200 text-slate-700 hover:bg-slate-100'}`}
              >
                Di Tolak
              </button>
              <button
                onClick={() => { setStatusDraft('Blocked'); setRejectReason(user.block_reason || ''); }}
                className={`px-3 py-2 rounded-xl text-xs font-medium border ${statusDraft === 'Blocked' ? 'bg-slate-800 border-slate-900 text-white' : 'border-slate-200 text-slate-700 hover:bg-slate-100'}`}
              >
                Blocked
              </button>
            </div>
          </div>
          {statusDraft === 'Approved' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-800">Aggregator Percentage (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={aggregatorPercentage ?? ''}
                  onChange={(e) => setAggregatorPercentage(e.target.value ? parseFloat(e.target.value) : undefined)}
                  className="w-full p-2 border border-slate-200 rounded-xl text-sm"
                  placeholder="0-100"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-800">Publishing Percentage (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={publishingPercentage ?? ''}
                  onChange={(e) => setPublishingPercentage(e.target.value ? parseFloat(e.target.value) : undefined)}
                  className="w-full p-2 border border-slate-200 rounded-xl text-sm"
                  placeholder="0-100"
                />
              </div>
            </div>
          )}
          {(statusDraft === 'Rejected' || statusDraft === 'Blocked') && (
            <div className="space-y-2">
              <p className="text-sm text-slate-800 font-medium">Alasan {statusDraft === 'Rejected' ? 'penolakan' : 'pemblokiran'} (wajib diisi)</p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder={`Tulis alasan ${statusDraft === 'Rejected' ? 'penolakan' : 'pemblokiran'} di sini...`}
                className={`w-full min-h-20 p-2 border rounded-xl text-sm ${!rejectReason?.trim() ? 'border-red-300' : 'border-slate-200'}`}
              />
              {!rejectReason?.trim() && <p className="text-xs text-red-500">Alasan wajib diisi.</p>}
            </div>
          )}
          <div className="pt-4 flex justify-end">
            <button
              onClick={handleSave}
              className={`px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200 ${(statusDraft === 'Rejected' || statusDraft === 'Blocked') && !rejectReason?.trim() ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              Simpan
            </button>
          </div>
        </div>
      </div>
      {showDocPreview && previewUrl && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-[96vw] md:w-full max-w-6xl h-[90svh] overflow-hidden animate-scale-in flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-base font-medium text-slate-800">Preview Dokumen</h3>
              <button onClick={() => setShowDocPreview(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle size={24} />
              </button>
            </div>
            <div className="p-6 flex-1 overflow-y-auto">
              {previewIsPdf ? (
                <iframe src={previewUrl} className="w-full h-[70vh] rounded-md" />
              ) : (
                <img src={previewUrl} alt="Preview Dokumen" className="w-full max-h-[70vh] object-contain rounded-md" />
              )}
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end">
              <a
                href={previewUrl}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700"
              >
                Buka di Tab Baru
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full text-center animate-scale-in">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} />
            </div>
            <h3 className="text-lg font-medium text-slate-800 mb-2">Berhasil!</h3>
            <p className="text-slate-600 mb-6">Status user berhasil diperbarui.</p>
            <button 
              onClick={() => {
                setShowSuccessModal(false);
                navigate('/users');
              }}
              className="w-full py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      <AlertModal
        isOpen={alertState.isOpen}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        onClose={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
