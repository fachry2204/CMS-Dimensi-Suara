import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Plus, 
  Search, 
  Calendar, 
  Clock, 
  Edit2, 
  Trash2, 
  X, 
  Save, 
  AlertCircle,
  FileText,
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
  Loader2
} from 'lucide-react';

interface Notice {
  id: number;
  title: string;
  content: string;
  start_date: string;
  end_date: string;
  created_at: string;
}

interface NoticeManagementProps {
  token: string | null;
}

const NoticeManagement: React.FC<NoticeManagementProps> = ({ token }) => {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    start_date: '',
    end_date: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Deletion state
  const [noticeToDelete, setNoticeToDelete] = useState<Notice | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchNotices();
  }, [token]);

  const fetchNotices = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const response = await fetch('/api/notices', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setNotices(data);
      } else {
        setError(data.error || 'Failed to fetch notices');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (notice?: Notice) => {
    if (notice) {
      setEditingNotice(notice);
      setFormData({
        title: notice.title,
        content: notice.content,
        start_date: notice.start_date.split('T')[0],
        end_date: notice.end_date.split('T')[0]
      });
    } else {
      setEditingNotice(null);
      setFormData({
        title: '',
        content: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });
    }
    setError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingNotice(null);
    setError(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    try {
      setIsSaving(true);
      setError(null);

      const url = editingNotice ? `/api/notices/${editingNotice.id}` : '/api/notices';
      const method = editingNotice ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        fetchNotices();
        handleCloseModal();
      } else {
        setError(data.error || 'Failed to save notice');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (notice: Notice) => {
    setNoticeToDelete(notice);
  };

  const handleConfirmDelete = async () => {
    if (!token || !noticeToDelete) return;

    try {
      setIsDeleting(true);
      const response = await fetch(`/api/notices/${noticeToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        fetchNotices();
        setNoticeToDelete(null);
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete notice');
      }
    } catch (err) {
      alert('Network error');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredNotices = notices.filter(n => 
    n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    n.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
              <Bell size={24} />
            </div>
            Notice Management
          </h1>
          <p className="text-slate-500 mt-1">Kelola pengumuman yang akan tampil di dashboard user.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-95"
        >
          <Plus size={20} />
          Tambah Notice
        </button>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Cari judul atau isi notice..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-sm"
          />
        </div>
        <div className="text-sm text-slate-500">
          Menampilkan <span className="font-bold text-slate-900">{filteredNotices.length}</span> notice
        </div>
      </div>

      {/* Table/Grid */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-20 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-500">Memuat data notice...</p>
          </div>
        ) : filteredNotices.length === 0 ? (
          <div className="p-20 text-center">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
              <Bell size={40} />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Tidak ada notice</h3>
            <p className="text-slate-500">Belum ada pengumuman yang dibuat.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Judul & Isi</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Periode</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredNotices.map((notice) => {
                  const today = new Date().toISOString().split('T')[0];
                  const startDate = notice.start_date.split('T')[0];
                  const endDate = notice.end_date.split('T')[0];
                  const isActive = today >= startDate && today <= endDate;
                  const isUpcoming = today < startDate;
                  const isExpired = today > endDate;

                  return (
                    <tr key={notice.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-800 mb-1">{notice.title}</div>
                        <div className="text-sm text-slate-500 line-clamp-1">{notice.content}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                          <div className="flex items-center gap-2">
                            <Calendar size={12} className="text-blue-500" />
                            <span>{formatDate(notice.start_date)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock size={12} className="text-red-500" />
                            <span>{formatDate(notice.end_date)}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {isActive ? (
                          <span className="px-2.5 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded-full uppercase">Aktif</span>
                        ) : isUpcoming ? (
                          <span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full uppercase">Mendatang</span>
                        ) : (
                          <span className="px-2.5 py-1 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-full uppercase">Selesai</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleOpenModal(notice)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(notice)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Hapus"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Notice */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-800">
                {editingNotice ? 'Edit Notice' : 'Tambah Notice Baru'}
              </h3>
              <button onClick={handleCloseModal} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm flex items-center gap-2 border border-red-100">
                  <AlertCircle size={18} />
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Judul Notice</label>
                <input
                  required
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Contoh: Pemeliharaan Sistem Mendatang"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tanggal Mulai</label>
                  <input
                    required
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tanggal Akhir</label>
                  <input
                    required
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Isi Notice</label>
                <textarea
                  required
                  rows={6}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Tuliskan isi pengumuman secara detail di sini..."
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none resize-none"
                ></textarea>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <Save size={20} />
                      Simpan Notice
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {noticeToDelete && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden transform transition-all scale-100 animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={32} className="text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Hapus Notice?</h3>
              <p className="text-slate-500 text-sm mb-6">
                Apakah Anda yakin ingin menghapus notice "{noticeToDelete.title}"? Tindakan ini tidak dapat dibatalkan.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setNoticeToDelete(null)}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-all disabled:opacity-60"
                >
                  Batal
                </button>
                <button 
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-all shadow-lg shadow-red-500/30 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {isDeleting && <Loader2 size={16} className="animate-spin" />}
                  <span>Hapus</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NoticeManagement;
