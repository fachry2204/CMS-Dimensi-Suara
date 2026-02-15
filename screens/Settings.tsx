import React, { useState } from 'react';
import { Settings as SettingsIcon, Plus, Trash2, Globe, Edit2, X } from 'lucide-react';

interface Props {
  aggregators: string[];
  onSaveAggregators: (list: string[]) => void;
}

export const Settings: React.FC<Props> = ({ aggregators, onSaveAggregators }) => {
  // --- AGGREGATOR LOGIC ---
  const [newAgg, setNewAgg] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  const handleAddAggregator = () => {
    const trimmed = newAgg.trim();
    if (!trimmed) return;
    const newList = [...aggregators, trimmed];
    onSaveAggregators(newList);
    setNewAgg('');
  };

  const handleStartEdit = (index: number) => {
    setEditingIndex(index);
    setEditingValue(aggregators[index] || '');
  };

  const handleSaveEdit = () => {
    if (editingIndex === null) return;
    const trimmed = editingValue.trim();
    if (!trimmed) return;
    const newList = aggregators.map((agg, idx) => (idx === editingIndex ? trimmed : agg));
    onSaveAggregators(newList);
    setEditingIndex(null);
    setEditingValue('');
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditingValue('');
  };

  const handleRequestDelete = (index: number) => {
    setDeleteIndex(index);
  };

  const handleConfirmDelete = () => {
    if (deleteIndex === null) return;
    const newList = aggregators.filter((_, i) => i !== deleteIndex);
    onSaveAggregators(newList);
    setDeleteIndex(null);
    if (editingIndex === deleteIndex) {
      setEditingIndex(null);
      setEditingValue('');
    }
  };

  const handleCancelDelete = () => {
    setDeleteIndex(null);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto min-h-screen">
       <div className="mb-6 border-b border-gray-200 pb-4 md:hidden">
            <h1 className="text-lg text-slate-800 tracking-tight flex items-center gap-2">
                <SettingsIcon size={22} className="text-slate-400" />
                Settings
            </h1>
            <p className="text-slate-500 mt-1 ml-8 text-[12px]">Configure your CMS parameters.</p>
       </div>

       <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                    <Globe size={24} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Release Configuration</h2>
                    <p className="text-sm text-slate-500">Manage distribution partners (Aggregators).</p>
                </div>
            </div>

            <div className="max-w-md">
                <label className="block text-sm font-bold text-slate-700 mb-3">Active Aggregators</label>
                
                <div className="flex gap-2 mb-4">
                    <input 
                        value={newAgg}
                        onChange={(e) => setNewAgg(e.target.value)}
                        placeholder="Add new aggregator (e.g. Tunecore)"
                        className="flex-1 px-4 py-2 border border-gray-200 rounded-xl focus:border-blue-500 outline-none"
                    />
                    <button 
                        onClick={handleAddAggregator}
                        className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                    >
                        <Plus size={20} />
                    </button>
                </div>

                <div className="bg-slate-50 rounded-xl border border-gray-200 overflow-hidden">
                    {aggregators.length === 0 && (
                        <div className="p-4 text-center text-slate-400 text-sm">No aggregators defined.</div>
                    )}
                    <ul className="divide-y divide-gray-200">
                        {aggregators.map((agg, idx) => (
                            <li key={idx} className="px-4 py-3 flex justify-between items-center bg-white">
                                {editingIndex === idx ? (
                                    <div className="flex items-center gap-2 w-full">
                                        <input
                                            value={editingValue}
                                            onChange={(e) => setEditingValue(e.target.value)}
                                            className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:border-blue-500 outline-none"
                                            placeholder="Aggregator name"
                                        />
                                        <button
                                            onClick={handleSaveEdit}
                                            className="px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                        >
                                            Save
                                        </button>
                                        <button
                                            onClick={handleCancelEdit}
                                            className="px-2.5 py-1.5 text-xs text-slate-500 rounded-lg hover:bg-slate-100 flex items-center gap-1"
                                        >
                                            <X size={14} />
                                            Cancel
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <span className="font-medium text-slate-700 text-sm">{agg}</span>
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                onClick={() => handleStartEdit(idx)}
                                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="Edit aggregator"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button 
                                                onClick={() => handleRequestDelete(idx)}
                                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Delete aggregator"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
                <p className="text-xs text-slate-400 mt-3">These options will appear when changing a release status to "Processing".</p>
            </div>
       </div>

       {/* Delete Aggregator Modal */}
       {deleteIndex !== null && (
            <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
                    <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-slate-50">
                        <h3 className="text-sm font-semibold text-slate-800">Delete Aggregator</h3>
                        <button
                            onClick={handleCancelDelete}
                            className="text-slate-400 hover:text-slate-600"
                        >
                            <X size={18} />
                        </button>
                    </div>
                    <div className="p-5 space-y-3 text-sm text-slate-600">
                        <p>Apakah Anda yakin ingin menghapus aggregator berikut?</p>
                        <p className="font-semibold text-slate-800">
                            {aggregators[deleteIndex] || ''}
                        </p>
                        <p className="text-xs text-slate-400">
                            Tindakan ini hanya menghapus dari daftar pilihan saat mengubah status rilis.
                        </p>
                    </div>
                    <div className="p-5 border-t border-gray-100 flex justify-end gap-3 bg-slate-50">
                        <button
                            onClick={handleCancelDelete}
                            className="px-4 py-2 text-xs font-medium text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
                        >
                            Batal
                        </button>
                        <button
                            onClick={handleConfirmDelete}
                            className="px-4 py-2 text-xs font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-sm shadow-red-200"
                        >
                            Hapus
                        </button>
                    </div>
                </div>
            </div>
       )}
    </div>
  );
};
