import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    ArrowLeft, FileText, CreditCard, User, MapPin, Calendar, Briefcase, CheckCircle, AlertTriangle, XCircle, MessageCircle, Clock, Save, Link, Upload
} from 'lucide-react';
import { api } from '../../utils/api';
import { assetUrl } from '../../utils/url';

interface WriterDetailProps {
    token: string;
}

const PublishingWriterDetail: React.FC<WriterDetailProps> = ({ token }) => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const userRole = localStorage.getItem('cms_role') || '';
    const [creator, setCreator] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    // Contract State
    const [contractStatus, setContractStatus] = useState<string>('Not Generated');
    const [contractFile, setContractFile] = useState<File | null>(null);
    const [contractDocPath, setContractDocPath] = useState<string>('');
    const [contractInputMethod, setContractInputMethod] = useState<'upload' | 'link'>('upload');
    const [contractLink, setContractLink] = useState<string>('');

    useEffect(() => {
        const fetchCreator = async () => {
            console.log('Fetching creator with ID:', id);
            if (!id) {
                setError('ID tidak ditemukan');
                setIsLoading(false);
                return;
            }
            try {
                const response = await api.publishing.getCreatorById(token, id);
                console.log('Fetch response:', response);
                setCreator(response);
                
                // Initialize contract state
                setContractStatus(response.contract_status || 'Not Generated');
                if (response.contract_doc_path) {
                    setContractDocPath(response.contract_doc_path);
                    if (response.contract_doc_path.startsWith('http')) {
                        setContractInputMethod('link');
                        setContractLink(response.contract_doc_path);
                    } else {
                        setContractInputMethod('upload');
                    }
                }
            } catch (err: any) {
                console.error('Fetch error:', err);
                setError(err.message || 'Gagal memuat data pencipta');
            } finally {
                setIsLoading(false);
            }
        };

        if (token) {
            fetchCreator();
        }
    }, [id, token]);

    const handleSaveContract = async () => {
        if (!id) return;
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
                        const res = await api.uploadUserDoc(token, 'CONTRACT', contractFile);
                        finalDocPath = res.path;
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

            await api.publishing.updateCreatorStatus(token, id, {
                contract_status: contractStatus,
                contract_doc_path: contractStatus === 'Done' ? finalDocPath : undefined
            });

            alert('Status kontrak berhasil diperbarui!');
            setContractDocPath(finalDocPath);
        } catch (err: any) {
            console.error('Failed to update contract:', err);
            alert('Gagal memperbarui status kontrak: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (error || !creator) {
        return (
            <div className="p-8 text-center">
                <div className="text-red-500 mb-4">{error || 'Data tidak ditemukan'}</div>
                <button 
                    onClick={() => navigate('/publishing/writer')}
                    className="text-indigo-600 hover:text-indigo-800 font-medium"
                >
                    Kembali ke Daftar Pencipta
                </button>
            </div>
        );
    }

    return (
        <div className="p-8">
            <div className="mb-6 flex items-center gap-4">
                <button 
                    onClick={() => navigate('/publishing/writer')}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                    <ArrowLeft size={24} className="text-slate-600" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Detail Pencipta</h1>
                    <p className="text-slate-500">Informasi lengkap data pencipta lagu</p>
                </div>
            </div>

            {creator.user_name && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                        <User size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-0.5">Release Owner</p>
                        <h3 className="text-lg font-bold text-slate-800">{creator.user_name}</h3>
                        <p className="text-sm text-slate-500">{creator.user_email}</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Personal Info */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <User size={20} className="text-indigo-600" />
                            Informasi Pribadi
                        </h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="text-xs text-slate-500 uppercase tracking-wider font-semibold block mb-1">Nama Lengkap</label>
                                <div className="text-base font-medium text-slate-800">{creator.name}</div>
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 uppercase tracking-wider font-semibold block mb-1">NIK</label>
                                <div className="text-base font-medium text-slate-800">{creator.nik || '-'}</div>
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 uppercase tracking-wider font-semibold block mb-1">Tempat, Tanggal Lahir</label>
                                <div className="text-base font-medium text-slate-800">
                                    {creator.birth_place}, {new Date(creator.birth_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 uppercase tracking-wider font-semibold block mb-1">Kewarganegaraan</label>
                                <div className="text-base font-medium text-slate-800">{creator.nationality}</div>
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 uppercase tracking-wider font-semibold block mb-1">Nomor WhatsApp</label>
                                <div className="flex items-center gap-2">
                                    <span className="text-base font-medium text-slate-800">{creator.whatsapp_number || '-'}</span>
                                    {creator.whatsapp_number && (
                                        <a 
                                            href={`https://wa.me/${creator.whatsapp_number.replace(/^0/, '62').replace(/\D/g, '')}`}
                                            target="_blank" 
                                            rel="noreferrer"
                                            className="text-green-600 hover:text-green-800 bg-green-50 p-1.5 rounded-full transition-colors"
                                            title="Chat WhatsApp"
                                        >
                                            <MessageCircle size={16} />
                                        </a>
                                    )}
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <label className="text-xs text-slate-500 uppercase tracking-wider font-semibold block mb-1">Alamat Lengkap</label>
                                <div className="text-base font-medium text-slate-800">{creator.address}</div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <CreditCard size={20} className="text-indigo-600" />
                            Informasi Rekening Bank
                        </h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="text-xs text-slate-500 uppercase tracking-wider font-semibold block mb-1">Nama Bank</label>
                                <div className="text-base font-medium text-slate-800">{creator.bank_name}</div>
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 uppercase tracking-wider font-semibold block mb-1">Nomor Rekening</label>
                                <div className="text-base font-medium text-slate-800">{creator.bank_account_number}</div>
                            </div>
                            <div className="md:col-span-2">
                                <label className="text-xs text-slate-500 uppercase tracking-wider font-semibold block mb-1">Atas Nama</label>
                                <div className="text-base font-medium text-slate-800">{creator.bank_account_name}</div>
                            </div>
                        </div>
                    </div>

                    {/* Contract Management Section (Admin Only) */}
                    {(userRole === 'Admin' || userRole === 'Operator') && (
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <FileText size={20} className="text-indigo-600" />
                                Status Kontrak Publishing
                            </h2>
                            
                            <div className="space-y-6">
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
                                            <AlertTriangle size={18} />
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
                                                            ? 'bg-indigo-600 text-white shadow-md'
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
                                                            ? 'bg-indigo-600 text-white shadow-md'
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
                                                    className="block w-full text-sm text-slate-700 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                                                />
                                                {contractDocPath && !contractDocPath.startsWith('http') && (
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
                                                        className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="pt-4 border-t border-slate-100 flex justify-end">
                                    <button
                                        onClick={handleSaveContract}
                                        disabled={saving}
                                        className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 disabled:opacity-70"
                                    >
                                        {saving ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                Menyimpan...
                                            </>
                                        ) : (
                                            <>
                                                <Save size={18} />
                                                Simpan Status Kontrak
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column: Documents */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <FileText size={20} className="text-indigo-600" />
                            Dokumen Legal
                        </h2>
                        
                        <div className="space-y-6">
                            <div>
                                <label className="text-xs text-slate-500 uppercase tracking-wider font-semibold block mb-2">KTP (Kartu Tanda Penduduk)</label>
                                {creator.ktp_path ? (
                                    <div className="border border-slate-200 rounded-lg p-2 bg-slate-50">
                                        <div className="aspect-video w-full bg-slate-200 rounded overflow-hidden mb-2 relative group">
                                            <img 
                                                src={assetUrl(creator.ktp_path)} 
                                                alt="KTP Preview" 
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x200?text=Gagal+Memuat+Gambar';
                                                }}
                                            />
                                            <a 
                                                href={assetUrl(creator.ktp_path)} 
                                                target="_blank" 
                                                rel="noreferrer"
                                                className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white font-medium"
                                            >
                                                Lihat Full Size
                                            </a>
                                        </div>
                                        <a 
                                            href={assetUrl(creator.ktp_path)} 
                                            target="_blank" 
                                            rel="noreferrer"
                                            className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1 justify-center"
                                        >
                                            <FileText size={14} /> Buka di Tab Baru
                                        </a>
                                    </div>
                                ) : (
                                    <div className="p-4 border border-dashed border-slate-300 rounded-lg text-center text-slate-500 text-sm bg-slate-50">
                                        <XCircle size={24} className="mx-auto mb-2 text-slate-400" />
                                        Tidak ada dokumen KTP
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="text-xs text-slate-500 uppercase tracking-wider font-semibold block mb-2">NPWP (Nomor Pokok Wajib Pajak)</label>
                                {creator.npwp_path ? (
                                    <div className="border border-slate-200 rounded-lg p-2 bg-slate-50">
                                        <div className="aspect-video w-full bg-slate-200 rounded overflow-hidden mb-2 relative group">
                                            <img 
                                                src={assetUrl(creator.npwp_path)} 
                                                alt="NPWP Preview" 
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x200?text=Gagal+Memuat+Gambar';
                                                }}
                                            />
                                            <a 
                                                href={assetUrl(creator.npwp_path)} 
                                                target="_blank" 
                                                rel="noreferrer"
                                                className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white font-medium"
                                            >
                                                Lihat Full Size
                                            </a>
                                        </div>
                                        <a 
                                            href={assetUrl(creator.npwp_path)} 
                                            target="_blank" 
                                            rel="noreferrer"
                                            className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1 justify-center"
                                        >
                                            <FileText size={14} /> Buka di Tab Baru
                                        </a>
                                    </div>
                                ) : (
                                    <div className="p-4 border border-dashed border-slate-300 rounded-lg text-center text-slate-500 text-sm bg-slate-50">
                                        <XCircle size={24} className="mx-auto mb-2 text-slate-400" />
                                        Tidak ada dokumen NPWP
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Songs List Section */}
            <div className="mt-6 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-200">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Briefcase size={20} className="text-indigo-600" />
                        Daftar Lagu ({creator.songs?.length || 0})
                    </h2>
                </div>
                
                {creator.songs && creator.songs.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                                    <th className="p-4">Judul Lagu</th>
                                    <th className="p-4">Peran</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4 text-right">Share (%)</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm divide-y divide-slate-100">
                                {creator.songs.map((song: any, index: number) => (
                                    <tr key={song.id || index} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4 font-medium text-slate-800">{song.title}</td>
                                        <td className="p-4 text-slate-600">{song.role || '-'}</td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                                                ${song.status === 'accepted' ? 'bg-green-100 text-green-800' : 
                                                  song.status === 'rejected' ? 'bg-red-100 text-red-800' : 
                                                  'bg-amber-100 text-amber-800'}`}>
                                                {song.status === 'accepted' ? 'Approved' : song.status || 'Pending'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right font-medium text-indigo-600">
                                            {song.share_percent}%
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="p-8 text-center text-slate-500">
                        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Briefcase size={24} className="text-slate-400" />
                        </div>
                        <p>Belum ada lagu yang terdaftar atas nama pencipta ini.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PublishingWriterDetail;
