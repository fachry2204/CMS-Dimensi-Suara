import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User } from '../types';
import { api } from '../utils/api';
import { XCircle } from 'lucide-react';

export const UserDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [token] = useState(localStorage.getItem('cms_token') || '');
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusDraft, setStatusDraft] = useState<User['status'] | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!id || !token) return;
      setIsLoading(true);
      try {
        const detail = await api.getUser(token, id);
        setUser(detail);
        setStatusDraft(detail.status);
        setRejectReason(detail.rejection_reason || '');
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
    if (s === 'Rejected' && (!rejectReason || !rejectReason.trim())) {
      alert('Alasan penolakan wajib diisi');
      return;
    }
    try {
      const res = await api.updateUserStatus(
        token,
        user.id,
        s,
        s === 'Rejected' ? rejectReason.trim() : undefined
      );
      const merged: User = {
        ...user,
        ...res.user,
        registeredDate: (res.user as any).registeredDate ?? user.registeredDate,
        joinedDate: (res.user as any).joinedDate ?? user.joinedDate,
        rejectedDate: (res.user as any).rejectedDate ?? user.rejectedDate,
        rejection_reason: (res.user as any).rejection_reason ?? user.rejection_reason
      };
      setUser(merged);
      setStatusDraft(res.user.status);
      if (s !== 'Rejected') setRejectReason('');
      alert('Perubahan status berhasil');
    } catch (err: any) {
      alert(err.message);
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
          <h3 className="text-lg font-bold text-slate-800">User Detail</h3>
          <button onClick={() => navigate('/users')} className="text-slate-400 hover:text-slate-600">
            <XCircle size={24} />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <div className="font-medium text-slate-800">{user.name}</div>
            <div className="text-xs text-slate-500">{user.email}</div>
            <div className="text-xs text-slate-500">Role: {user.role}</div>
            <div className="text-xs text-slate-500">Joined: {user.registeredDate}</div>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <tbody className="[&>tr>td]:py-2 [&>tr>td]:px-3 [&>tr:nth-child(even)]:bg-slate-50">
                  <tr><td className="text-slate-600">Account Type</td><td className="font-medium">{user.account_type || '-'}</td></tr>
                  {(user.account_type === 'COMPANY') && (
                    <tr><td className="text-slate-600">Company</td><td className="font-medium">{user.company_name || '-'}</td></tr>
                  )}
                  <tr><td className="text-slate-600">Full Name</td><td className="font-medium">{user.full_name || '-'}</td></tr>
                  <tr><td className="text-slate-600">NIK</td><td className="font-medium">{user.nik || '-'}</td></tr>
                  <tr><td className="text-slate-600">Phone</td><td className="font-medium">{user.phone || '-'}</td></tr>
                  <tr><td className="text-slate-600">Address</td><td className="font-medium whitespace-pre-line">{user.address || '-'}</td></tr>
                  <tr><td className="text-slate-600">Country</td><td className="font-medium">{user.country || '-'}</td></tr>
                  <tr><td className="text-slate-600">Province</td><td className="font-medium">{user.province || '-'}</td></tr>
                  <tr><td className="text-slate-600">City</td><td className="font-medium">{user.city || '-'}</td></tr>
                  <tr><td className="text-slate-600">District</td><td className="font-medium">{user.district || '-'}</td></tr>
                  <tr><td className="text-slate-600">Subdistrict</td><td className="font-medium">{user.subdistrict || '-'}</td></tr>
                  <tr><td className="text-slate-600">Postal Code</td><td className="font-medium">{user.postal_code || '-'}</td></tr>
                  {(user.account_type === 'COMPANY') && (
                    <>
                      <tr><td className="text-slate-600">PIC Name</td><td className="font-medium">{user.pic_name || '-'}</td></tr>
                      <tr><td className="text-slate-600">PIC Position</td><td className="font-medium">{user.pic_position || '-'}</td></tr>
                      <tr><td className="text-slate-600">PIC Phone</td><td className="font-medium">{user.pic_phone || '-'}</td></tr>
                    </>
                  )}
                  <tr><td className="text-slate-600">Approved</td><td className="font-medium">{user.joinedDate || '-'}</td></tr>
                  {(user.status === 'Rejected' || statusDraft === 'Rejected') && (
                    <>
                      <tr><td className="text-slate-600">Reject Date</td><td className="font-medium">{user.rejectedDate || '-'}</td></tr>
                      <tr><td className="text-slate-600">Rejection Reason</td><td className="font-medium">{user.rejection_reason || '-'}</td></tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-slate-800">Documents</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {user.ktp_doc_path && (
                  <div className="border border-slate-200 rounded-xl p-3">
                    <div className="text-xs font-medium mb-2">KTP</div>
                    {user.ktp_doc_path.toLowerCase().endsWith('.pdf') ? (
                      <iframe src={user.ktp_doc_path} className="w-full h-40 rounded-md" />
                    ) : (
                      <img src={user.ktp_doc_path} alt="KTP" className="w-full h-40 object-cover rounded-md" />
                    )}
                    <div className="flex gap-3 mt-2">
                      <a href={user.ktp_doc_path} target="_blank" rel="noreferrer" className="text-blue-600 text-xs">Preview</a>
                      <a href={user.ktp_doc_path} download className="text-slate-600 text-xs">Download</a>
                    </div>
                  </div>
                )}
                {user.npwp_doc_path && (
                  <div className="border border-slate-200 rounded-xl p-3">
                    <div className="text-xs font-medium mb-2">NPWP</div>
                    {user.npwp_doc_path.toLowerCase().endsWith('.pdf') ? (
                      <iframe src={user.npwp_doc_path} className="w-full h-40 rounded-md" />
                    ) : (
                      <img src={user.npwp_doc_path} alt="NPWP" className="w-full h-40 object-cover rounded-md" />
                    )}
                    <div className="flex gap-3 mt-2">
                      <a href={user.npwp_doc_path} target="_blank" rel="noreferrer" className="text-blue-600 text-xs">Preview</a>
                      <a href={user.npwp_doc_path} download className="text-slate-600 text-xs">Download</a>
                    </div>
                  </div>
                )}
                {(user.account_type === 'COMPANY') && user.nib_doc_path && (
                  <div className="border border-slate-200 rounded-xl p-3">
                    <div className="text-xs font-medium mb-2">NIB</div>
                    {user.nib_doc_path.toLowerCase().endsWith('.pdf') ? (
                      <iframe src={user.nib_doc_path} className="w-full h-40 rounded-md" />
                    ) : (
                      <img src={user.nib_doc_path} alt="NIB" className="w-full h-40 object-cover rounded-md" />
                    )}
                    <div className="flex gap-3 mt-2">
                      <a href={user.nib_doc_path} target="_blank" rel="noreferrer" className="text-blue-600 text-xs">Preview</a>
                      <a href={user.nib_doc_path} download className="text-slate-600 text-xs">Download</a>
                    </div>
                  </div>
                )}
                {(user.account_type === 'COMPANY') && user.kemenkumham_doc_path && (
                  <div className="border border-slate-200 rounded-xl p-3">
                    <div className="text-xs font-medium mb-2">Kemenkumham</div>
                    {user.kemenkumham_doc_path.toLowerCase().endsWith('.pdf') ? (
                      <iframe src={user.kemenkumham_doc_path} className="w-full h-40 rounded-md" />
                    ) : (
                      <img src={user.kemenkumham_doc_path} alt="Kemenkumham" className="w-full h-40 object-cover rounded-md" />
                    )}
                    <div className="flex gap-3 mt-2">
                      <a href={user.kemenkumham_doc_path} target="_blank" rel="noreferrer" className="text-blue-600 text-xs">Preview</a>
                      <a href={user.kemenkumham_doc_path} download className="text-slate-600 text-xs">Download</a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-800">Status</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <button
                onClick={() => { setStatusDraft('Pending'); setRejectReason(''); }}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border ${statusDraft === 'Pending' ? 'bg-yellow-100 border-yellow-200 text-yellow-800' : 'border-slate-200 text-slate-700 hover:bg-slate-100'}`}
              >
                Pending
              </button>
              <button
                onClick={() => { setStatusDraft('Review'); setRejectReason(''); }}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border ${statusDraft === 'Review' ? 'bg-blue-100 border-blue-200 text-blue-800' : 'border-slate-200 text-slate-700 hover:bg-slate-100'}`}
              >
                Di Riview
              </button>
              <button
                onClick={() => { setStatusDraft('Approved'); setRejectReason(''); }}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border ${statusDraft === 'Approved' ? 'bg-green-100 border-green-200 text-green-800' : 'border-slate-200 text-slate-700 hover:bg-slate-100'}`}
              >
                Di Approved
              </button>
              <button
                onClick={() => { setStatusDraft('Rejected'); }}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border ${statusDraft === 'Rejected' ? 'bg-red-100 border-red-200 text-red-800' : 'border-slate-200 text-slate-700 hover:bg-slate-100'}`}
              >
                Di Tolak
              </button>
            </div>
          </div>
          {statusDraft === 'Rejected' && (
            <div className="space-y-2">
              <p className="text-sm text-slate-800 font-semibold">Alasan penolakan (wajib diisi)</p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Tulis alasan penolakan di sini..."
                className={`w-full min-h-20 p-2 border rounded-xl text-sm ${!rejectReason?.trim() ? 'border-red-300' : 'border-slate-200'}`}
              />
              {!rejectReason?.trim() && <p className="text-xs text-red-500">Alasan penolakan wajib diisi.</p>}
            </div>
          )}
          <div className="pt-4 flex justify-end">
            <button
              onClick={handleSave}
              className={`px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200 ${statusDraft === 'Rejected' && !rejectReason?.trim() ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              Simpan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
