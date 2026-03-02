import React, { useState, useEffect } from 'react';
import { DollarSign, FileText, Download, Upload, CheckCircle, Clock, AlertCircle, Plus, Search, Filter, X, ChevronRight } from 'lucide-react';
import { User } from '../types';
import { api } from '../utils/api';

// Mock types for Payment
interface PaymentInvoice {
    id: string;
    userId: string;
    userName: string;
    userType: 'PERSONAL' | 'COMPANY';
    period: string; // e.g., "Q1 2024"
    quarter: 1 | 2 | 3 | 4;
    year: number;
    grossAmount: number;
    taxRate: number; // 0.025 or 0.02
    additionalFee: number;
    status: 'Pending Payment' | 'Proses Payment' | 'Payment';
    proofDoc?: string | File | null;
    generatedDate: string;
    type: 'Aggregator' | 'Publishing';
}

interface Props {
    token: string | null;
}

export const PaymentScreen: React.FC<Props> = ({ token }) => {
    const [activeTab, setActiveTab] = useState<'aggregator' | 'publishing'>('aggregator');
    const [invoices, setInvoices] = useState<PaymentInvoice[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    
    // Generate Modal State
    const [showGenerateModal, setShowGenerateModal] = useState(false);
    const [generateForm, setGenerateForm] = useState({
        year: new Date().getFullYear(),
        quarter: 1
    });

    // Detail Modal State
    const [selectedInvoice, setSelectedInvoice] = useState<PaymentInvoice | null>(null);
    const [additionalFeeInput, setAdditionalFeeInput] = useState<number>(0);
    const [proofFile, setProofFile] = useState<File | null>(null);

    // Mock Data Initialization
    useEffect(() => {
        // Simulate fetching data
        setIsLoading(true);
        setTimeout(() => {
            const mockInvoices: PaymentInvoice[] = [
                {
                    id: 'INV-2024-001',
                    userId: '1',
                    userName: 'John Doe',
                    userType: 'PERSONAL',
                    period: 'Q1 2024',
                    quarter: 1,
                    year: 2024,
                    grossAmount: 5000000,
                    taxRate: 0.025,
                    additionalFee: 0,
                    status: 'Pending Payment',
                    generatedDate: '2024-04-01',
                    type: 'Aggregator'
                },
                {
                    id: 'INV-2024-002',
                    userId: '2',
                    userName: 'Music Corp',
                    userType: 'COMPANY',
                    period: 'Q1 2024',
                    quarter: 1,
                    year: 2024,
                    grossAmount: 15000000,
                    taxRate: 0.02,
                    additionalFee: 50000,
                    status: 'Proses Payment',
                    generatedDate: '2024-04-01',
                    type: 'Publishing'
                }
            ];
            setInvoices(mockInvoices);
            setIsLoading(false);
        }, 1000);
    }, []);

    const handleGenerate = () => {
        // Logic to generate invoices would go here
        // For now, we mock adding a new invoice
        const newInvoice: PaymentInvoice = {
            id: `INV-${generateForm.year}-${Math.floor(Math.random() * 1000)}`,
            userId: '3',
            userName: 'New Artist',
            userType: 'PERSONAL',
            period: `Q${generateForm.quarter} ${generateForm.year}`,
            quarter: generateForm.quarter as 1|2|3|4,
            year: generateForm.year,
            grossAmount: Math.floor(Math.random() * 10000000),
            taxRate: 0.025,
            additionalFee: 0,
            status: 'Pending Payment',
            generatedDate: new Date().toISOString().split('T')[0],
            type: activeTab === 'aggregator' ? 'Aggregator' : 'Publishing'
        };
        
        setInvoices([newInvoice, ...invoices]);
        setShowGenerateModal(false);
    };

    const handleStatusUpdate = (invoice: PaymentInvoice, newStatus: PaymentInvoice['status']) => {
        const updatedInvoices = invoices.map(inv => 
            inv.id === invoice.id ? { ...inv, status: newStatus } : inv
        );
        setInvoices(updatedInvoices);
        if (selectedInvoice && selectedInvoice.id === invoice.id) {
            setSelectedInvoice({ ...selectedInvoice, status: newStatus });
        }
    };

    const handleSaveDetail = () => {
        if (!selectedInvoice) return;
        
        const updatedInvoices = invoices.map(inv => 
            inv.id === selectedInvoice.id ? { 
                ...inv, 
                additionalFee: additionalFeeInput,
                proofDoc: proofFile || inv.proofDoc 
            } : inv
        );
        setInvoices(updatedInvoices);
        setSelectedInvoice(null);
        setProofFile(null);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount);
    };

    const calculateNet = (inv: PaymentInvoice, currentFee: number) => {
        const tax = inv.grossAmount * inv.taxRate;
        return inv.grossAmount - tax - currentFee;
    };

    const filteredInvoices = invoices.filter(inv => 
        (activeTab === 'aggregator' ? inv.type === 'Aggregator' : inv.type === 'Publishing')
    );

    return (
        <div className="p-8 max-w-7xl mx-auto animate-fade-in space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Menu Pembayaran</h1>
                    <p className="text-slate-500">Kelola pembayaran royalti berdasarkan kuartal</p>
                </div>
                <button 
                    onClick={() => setShowGenerateModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 transition-all font-medium"
                >
                    <Plus size={18} />
                    Generate Pembayaran
                </button>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-4">
                <button 
                    onClick={() => setActiveTab('aggregator')}
                    className={`px-4 py-2 rounded-lg border font-bold transition-colors ${activeTab === 'aggregator' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                >
                    Aggregator
                </button>
                <button 
                    onClick={() => setActiveTab('publishing')}
                    className={`px-4 py-2 rounded-lg border font-bold transition-colors ${activeTab === 'publishing' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                >
                    Publishing
                </button>
            </div>

            {/* Content */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-700 font-semibold uppercase tracking-wider text-xs">
                            <tr>
                                <th className="px-6 py-4">Invoice ID</th>
                                <th className="px-6 py-4">User</th>
                                <th className="px-6 py-4">Periode</th>
                                <th className="px-6 py-4 text-right">Total (Net)</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">Loading invoices...</td></tr>
                            ) : filteredInvoices.length === 0 ? (
                                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">Belum ada data pembayaran.</td></tr>
                            ) : (
                                filteredInvoices.map((inv) => (
                                    <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-mono text-slate-600">{inv.id}</td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-slate-800">{inv.userName}</div>
                                            <div className="text-xs text-slate-500">{inv.userType}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <Clock size={14} className="text-slate-400" />
                                                {inv.period}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-emerald-600">
                                            {formatCurrency(calculateNet(inv, inv.additionalFee))}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                                                inv.status === 'Payment' 
                                                    ? 'bg-green-50 text-green-600 border-green-100'
                                                    : inv.status === 'Proses Payment'
                                                    ? 'bg-blue-50 text-blue-600 border-blue-100'
                                                    : 'bg-amber-50 text-amber-600 border-amber-100'
                                            }`}>
                                                {inv.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button 
                                                onClick={() => {
                                                    setSelectedInvoice(inv);
                                                    setAdditionalFeeInput(inv.additionalFee);
                                                }}
                                                className="text-indigo-600 hover:text-indigo-800 font-medium text-xs border border-indigo-200 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
                                            >
                                                Detail
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Generate Modal */}
            {showGenerateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-scale-in overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="font-bold text-lg text-slate-800">Generate Pembayaran</h3>
                            <button onClick={() => setShowGenerateModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Tahun</label>
                                <select 
                                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={generateForm.year}
                                    onChange={(e) => setGenerateForm({...generateForm, year: Number(e.target.value)})}
                                >
                                    {[2023, 2024, 2025, 2026].map(y => (
                                        <option key={y} value={y}>{y}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Quarter</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {[1, 2, 3, 4].map(q => (
                                        <button
                                            key={q}
                                            onClick={() => setGenerateForm({...generateForm, quarter: q})}
                                            className={`px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                                                generateForm.quarter === q 
                                                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700 ring-1 ring-indigo-500' 
                                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                            }`}
                                        >
                                            Q{q}
                                            <span className="block text-[10px] font-normal opacity-70 mt-1">
                                                {q === 1 ? 'Jan - Mar' : q === 2 ? 'Apr - Jun' : q === 3 ? 'Jul - Sep' : 'Oct - Dec'}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="pt-4">
                                <button 
                                    onClick={handleGenerate}
                                    className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20"
                                >
                                    Generate Laporan
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Invoice Detail Modal */}
            {selectedInvoice && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl animate-scale-in overflow-hidden max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                                    <FileText size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-slate-800">Invoice Detail</h3>
                                    <p className="text-xs text-slate-500">{selectedInvoice.id} • {selectedInvoice.generatedDate}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedInvoice(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="p-6 space-y-6">
                            {/* Status Stepper */}
                            <div className="relative px-4">
                                <div className="flex items-center justify-between relative z-10">
                                    {[
                                        { status: 'Pending Payment', label: 'Pending' }, 
                                        { status: 'Proses Payment', label: 'Proses' }, 
                                        { status: 'Payment', label: 'Selesai' }
                                    ].map((step, idx) => {
                                        const isActive = selectedInvoice.status === step.status;
                                        const isPast = ['Pending Payment', 'Proses Payment', 'Payment'].indexOf(selectedInvoice.status) >= idx;
                                        
                                        return (
                                            <div key={idx} className="flex flex-col items-center gap-2 bg-white px-2">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors border-2 ${
                                                    isPast 
                                                        ? 'bg-indigo-600 border-indigo-600 text-white' 
                                                        : 'bg-white border-slate-200 text-slate-400'
                                                }`}>
                                                    {isPast ? <CheckCircle size={14} /> : idx + 1}
                                                </div>
                                                <span className={`text-xs font-medium ${isPast ? 'text-indigo-600' : 'text-slate-400'}`}>
                                                    {step.label}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                                {/* Connector Line */}
                                <div className="absolute top-4 left-0 right-0 h-0.5 bg-slate-100 -z-0">
                                    <div 
                                        className="h-full bg-indigo-600 transition-all duration-500"
                                        style={{ 
                                            width: selectedInvoice.status === 'Pending Payment' ? '0%' : 
                                                   selectedInvoice.status === 'Proses Payment' ? '50%' : '100%' 
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Monthly Breakdown Table */}
                            <div className="bg-slate-50 rounded-xl border border-slate-100 overflow-hidden">
                                <div className="px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                        Keterangan : Q{selectedInvoice.quarter}
                                    </h4>
                                </div>
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-slate-100 text-slate-500 font-medium border-b border-slate-200">
                                        <tr>
                                            <th className="px-4 py-2">Bulan (Laporan)</th>
                                            <th className="px-4 py-2 text-right">Pendapatan</th>
                                            <th className="px-4 py-2 text-right">Potongan</th>
                                            <th className="px-4 py-2 text-right">Pendapatan User</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200">
                                        {(() => {
                                            const months = selectedInvoice.quarter === 1 ? ['Januari', 'Februari', 'Maret'] :
                                                           selectedInvoice.quarter === 2 ? ['April', 'Mei', 'Juni'] :
                                                           selectedInvoice.quarter === 3 ? ['Juli', 'Agustus', 'September'] :
                                                           ['Oktober', 'November', 'Desember'];
                                            
                                            // Mock breakdown logic
                                            // Assume platform fee is 20%
                                            const platformFeeRate = 0.2;
                                            const totalGross = selectedInvoice.grossAmount; // This is User Share in current logic?
                                            // If grossAmount is "Pendapatan User", then Real Gross = grossAmount / (1 - fee)
                                            // Let's assume grossAmount displayed is the "Pendapatan User" (Net from DSP)
                                            // So Potongan = Real Gross * Fee
                                            // Real Gross = grossAmount / (1 - 0.2) = grossAmount / 0.8
                                            
                                            const realTotalGross = totalGross / (1 - platformFeeRate);
                                            const totalDeduction = realTotalGross * platformFeeRate;
                                            
                                            const perMonthUserShare = Math.floor(totalGross / 3);
                                            const remainderUserShare = totalGross - (perMonthUserShare * 3);
                                            
                                            const perMonthRealGross = Math.floor(realTotalGross / 3);
                                            const remainderRealGross = realTotalGross - (perMonthRealGross * 3);
                                            
                                            const perMonthDeduction = Math.floor(totalDeduction / 3);
                                            const remainderDeduction = totalDeduction - (perMonthDeduction * 3);

                                            return months.map((month, idx) => {
                                                const isLast = idx === 2;
                                                const userShare = isLast ? perMonthUserShare + remainderUserShare : perMonthUserShare;
                                                const realGross = isLast ? perMonthRealGross + remainderRealGross : perMonthRealGross;
                                                const deduction = isLast ? perMonthDeduction + remainderDeduction : perMonthDeduction;
                                                
                                                return (
                                                    <tr key={month}>
                                                        <td className="px-4 py-2 text-slate-700">{month}</td>
                                                        <td className="px-4 py-2 text-right text-slate-500">{formatCurrency(realGross)}</td>
                                                        <td className="px-4 py-2 text-right text-red-500">- {formatCurrency(deduction)}</td>
                                                        <td className="px-4 py-2 text-right font-medium text-emerald-600">{formatCurrency(userShare)}</td>
                                                    </tr>
                                                );
                                            });
                                        })()}
                                    </tbody>
                                    <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                                        <tr>
                                            <td className="px-4 py-2 text-slate-800">Total</td>
                                            <td className="px-4 py-2 text-right text-slate-800">
                                                {formatCurrency(selectedInvoice.grossAmount / 0.8)}
                                            </td>
                                            <td className="px-4 py-2 text-right text-red-600">
                                                - {formatCurrency((selectedInvoice.grossAmount / 0.8) * 0.2)}
                                            </td>
                                            <td className="px-4 py-2 text-right text-emerald-700">
                                                {formatCurrency(selectedInvoice.grossAmount)}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <div>
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Informasi User</h4>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500">Nama:</span>
                                            <span className="font-medium text-slate-800">{selectedInvoice.userName}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500">Tipe Akun:</span>
                                            <span className={`font-medium ${selectedInvoice.userType === 'COMPANY' ? 'text-purple-600' : 'text-blue-600'}`}>
                                                {selectedInvoice.userType}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500">Pajak ({selectedInvoice.taxRate * 100}%):</span>
                                            <span className="font-medium text-slate-800">
                                                {selectedInvoice.userType === 'COMPANY' ? 'Perusahaan (2%)' : 'Personal (2.5%)'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Rincian Pembayaran</h4>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500">Pendapatan Kotor:</span>
                                            <span className="font-medium text-slate-800">{formatCurrency(selectedInvoice.grossAmount)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500">Potongan Pajak:</span>
                                            <span className="font-medium text-red-500">
                                                - {formatCurrency(selectedInvoice.grossAmount * selectedInvoice.taxRate)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-sm items-center">
                                            <span className="text-slate-500">Biaya Tambahan:</span>
                                            <input 
                                                type="number" 
                                                className="w-24 px-2 py-1 text-right text-xs border rounded focus:ring-1 focus:ring-indigo-500 outline-none"
                                                value={additionalFeeInput}
                                                onChange={(e) => setAdditionalFeeInput(Number(e.target.value))}
                                            />
                                        </div>
                                        <div className="pt-2 mt-2 border-t border-slate-200 flex justify-between font-bold">
                                            <span className="text-slate-800">Total Bersih:</span>
                                            <span className="text-emerald-600 text-lg">
                                                {formatCurrency(calculateNet(selectedInvoice, additionalFeeInput))}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Actions based on Status */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-bold text-slate-800">Update Status</h4>
                                
                                {selectedInvoice.status === 'Pending Payment' && (
                                    <button 
                                        onClick={() => handleStatusUpdate(selectedInvoice, 'Proses Payment')}
                                        className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
                                    >
                                        Proses Pembayaran
                                    </button>
                                )}

                                {selectedInvoice.status === 'Proses Payment' && (
                                    <div className="space-y-3">
                                        <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center hover:bg-slate-50 transition-colors cursor-pointer relative">
                                            <input 
                                                type="file" 
                                                className="absolute inset-0 opacity-0 cursor-pointer"
                                                onChange={(e) => e.target.files && setProofFile(e.target.files[0])}
                                            />
                                            <div className="flex flex-col items-center gap-2 text-slate-500">
                                                <Upload size={24} />
                                                <span className="text-sm font-medium">
                                                    {proofFile ? proofFile.name : 'Upload Bukti Transfer'}
                                                </span>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => handleStatusUpdate(selectedInvoice, 'Payment')}
                                            disabled={!proofFile && !selectedInvoice.proofDoc}
                                            className="w-full py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Selesaikan Pembayaran
                                        </button>
                                    </div>
                                )}

                                {selectedInvoice.status === 'Payment' && (
                                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3 text-green-700">
                                        <CheckCircle size={20} />
                                        <div>
                                            <p className="font-bold text-sm">Pembayaran Selesai</p>
                                            <p className="text-xs opacity-80">Bukti transfer telah diupload.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                            <button 
                                onClick={() => setSelectedInvoice(null)}
                                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors"
                            >
                                Tutup
                            </button>
                            <button 
                                onClick={handleSaveDetail}
                                className="px-4 py-2 bg-slate-800 text-white font-medium rounded-lg hover:bg-slate-900 transition-colors"
                            >
                                Simpan Perubahan
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
