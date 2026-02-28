import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Plus, Trash2, Globe, Edit2, X, Image as ImageIcon, Upload, Shield, Server, Database, GitBranch, RefreshCw, Play, AlertTriangle, CheckCircle, Terminal } from 'lucide-react';
import { api } from '../utils/api';

interface Props {
  aggregators: string[];
  onSaveAggregators: (list: string[]) => void;
}

interface BrandingSettings {
    logo: string | null;
    login_background: string | null;
}

interface SystemCheckResult {
    status: string;
    missing: string[];
    checked_at: string;
}

interface UpdateCheckResult {
    updatesAvailable: boolean;
    behindCount: number;
    localHash: string;
    remoteHash: string;
    repo: string;
}

interface SecurityLog {
    id: number;
    user_identifier: string;
    ip_address: string;
    country: string;
    attack_type: string;
    details: string;
    created_at: string;
}

interface SystemLog {
    id: number;
    check_type: 'UPDATE_CHECK' | 'DB_INTEGRITY_CHECK';
    status: string;
    details: string;
    created_at: string;
}

export const Settings: React.FC<Props> = ({ aggregators, onSaveAggregators }) => {
  const [activeTab, setActiveTab] = useState<'general' | 'system' | 'security'>('general');
  const [token] = useState(localStorage.getItem('cms_token') || '');

  // --- AGGREGATOR LOGIC ---
  const [newAgg, setNewAgg] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  // --- BRANDING LOGIC ---
  const [branding, setBranding] = useState<BrandingSettings>({ logo: null, login_background: null });
  const [isLoadingBranding, setIsLoadingBranding] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bgFile, setBgFile] = useState<File | null>(null);

  // --- SYSTEM CHECK LOGIC ---
  const [dbStatus, setDbStatus] = useState<SystemCheckResult | null>(null);
  const [updateStatus, setUpdateStatus] = useState<UpdateCheckResult | null>(null);
  const [checkingSystem, setCheckingSystem] = useState(false);
  const [updatingSystem, setUpdatingSystem] = useState(false);
  const [fixingDb, setFixingDb] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);

  // --- SECURITY LOGS LOGIC ---
  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  useEffect(() => {
      if (activeTab === 'general') {
          fetchBranding();
      } else if (activeTab === 'system') {
          handleCheckSystem();
          fetchSystemLogs();
      } else if (activeTab === 'security') {
          fetchSecurityLogs();
      }
  }, [activeTab]);

  const fetchBranding = async () => {
      try {
          const res = await fetch('/api/settings/branding');
          if (res.ok) {
              const data = await res.json();
              setBranding(data);
          }
      } catch (err) {
          console.error("Failed to fetch branding:", err);
      }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          setLogoFile(e.target.files[0]);
      }
  };

  const handleBgChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          setBgFile(e.target.files[0]);
      }
  };

  const handleSaveBranding = async () => {
      if (!logoFile && !bgFile) return;

      setIsLoadingBranding(true);
      const formData = new FormData();
      if (logoFile) formData.append('logo', logoFile);
      if (bgFile) formData.append('login_background', bgFile);

      try {
          const res = await fetch('/api/settings/branding', {
              method: 'POST',
              headers: {
                  'Authorization': `Bearer ${token}`
              },
              body: formData
          });

          if (res.ok) {
              const data = await res.json();
              setBranding(data.branding);
              setLogoFile(null);
              setBgFile(null);
              alert('Branding updated successfully!');
              window.location.reload();
          } else {
              alert('Failed to update branding');
          }
      } catch (err) {
          console.error("Error updating branding:", err);
          alert('Error updating branding');
      } finally {
          setIsLoadingBranding(false);
      }
  };

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

  // --- SYSTEM CHECK HANDLERS ---
  const handleCheckSystem = async () => {
      setCheckingSystem(true);
      setUpdateMessage(null);
      try {
          // Check DB
          const dbRes = await fetch('/api/settings/system/check-db', {
              headers: { 'Authorization': `Bearer ${token}` }
          });
          if (dbRes.ok) {
              const data = await dbRes.json();
              setDbStatus(data);
          }

          // Check Updates
          const upRes = await fetch('/api/settings/system/check-update', {
               headers: { 'Authorization': `Bearer ${token}` }
          });
          if (upRes.ok) {
              const data = await upRes.json();
              setUpdateStatus(data);
          }
          
          // Refresh logs after check
          fetchSystemLogs();
      } catch (err) {
          console.error("System check failed:", err);
      } finally {
          setCheckingSystem(false);
      }
  };

  const fetchSystemLogs = async () => {
      try {
          const res = await fetch('/api/settings/system/logs', {
              headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
              const data = await res.json();
              setSystemLogs(data);
          }
      } catch (err) {
          console.error("Failed to fetch system logs:", err);
      }
  };

  const handleUpdateSystem = async () => {
      if (!confirm("Are you sure you want to update the system? This will pull changes, install dependencies, build, and requires a manual restart.")) return;
      
      setUpdatingSystem(true);
      setUpdateMessage("Updating system... Please wait, this may take a while.");
      try {
          const res = await fetch('/api/settings/system/update', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json();
          if (res.ok) {
              setUpdateMessage(data.message);
              alert(data.message);
          } else {
              setUpdateMessage("Update failed: " + data.error);
          }
      } catch (err: any) {
          setUpdateMessage("Update failed: " + err.message);
      } finally {
          setUpdatingSystem(false);
      }
  };

  const handleFixDb = async () => {
      if (!confirm("Are you sure you want to attempt to repair the database structure? This will create missing tables and columns.")) return;

      setFixingDb(true);
      try {
          const res = await fetch('/api/settings/system/fix-db', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json();
          if (res.ok) {
              alert(data.message);
              handleCheckSystem(); // Re-check
          } else {
              alert("Failed to repair database: " + data.error);
          }
      } catch (err: any) {
          alert("Error repairing database: " + err.message);
      } finally {
          setFixingDb(false);
      }
  };

  // --- SECURITY LOGS HANDLERS ---
  const fetchSecurityLogs = async () => {
      setLoadingLogs(true);
      try {
          const res = await fetch('/api/settings/security/logs', {
              headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
              const data = await res.json();
              setSecurityLogs(data);
          }
      } catch (err) {
          console.error("Failed to fetch security logs:", err);
      } finally {
          setLoadingLogs(false);
      }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto min-h-screen">
       <div className="mb-6 border-b border-gray-200 pb-4">
            <h1 className="text-lg text-slate-800 tracking-tight flex items-center gap-2">
                <SettingsIcon size={22} className="text-slate-400" />
                Settings
            </h1>
            <p className="text-slate-500 mt-1 ml-8 text-[12px]">Configure your CMS parameters and monitor system health.</p>
       </div>

       {/* Tabs Navigation */}
       <div className="flex gap-4 mb-8 border-b border-gray-100 pb-1 overflow-x-auto">
           <button 
               onClick={() => setActiveTab('general')}
               className={`pb-3 px-4 text-sm font-medium transition-colors relative whitespace-nowrap ${
                   activeTab === 'general' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'
               }`}
           >
               General Settings
               {activeTab === 'general' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full" />}
           </button>
           <button 
               onClick={() => setActiveTab('system')}
               className={`pb-3 px-4 text-sm font-medium transition-colors relative whitespace-nowrap ${
                   activeTab === 'system' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'
               }`}
           >
               Cek System
               {activeTab === 'system' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full" />}
           </button>
           <button 
               onClick={() => setActiveTab('security')}
               className={`pb-3 px-4 text-sm font-medium transition-colors relative whitespace-nowrap ${
                   activeTab === 'security' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'
               }`}
           >
               Security Logs
               {activeTab === 'security' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full" />}
           </button>
       </div>

       {/* GENERAL TAB */}
       {activeTab === 'general' && (
           <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
               {/* Branding Configuration */}
               <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                            <ImageIcon size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Branding & Appearance</h2>
                            <p className="text-sm text-slate-500">Customize the login page and sidebar logo.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Logo Upload */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-3">Logo (Sidebar & Login)</label>
                            <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 transition-colors relative">
                                {logoFile ? (
                                    <div className="relative">
                                        <img src={URL.createObjectURL(logoFile)} alt="Preview" className="h-32 object-contain mb-2" />
                                        <button onClick={() => setLogoFile(null)} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full"><X size={12}/></button>
                                        <p className="text-xs text-slate-500 text-center">{logoFile.name}</p>
                                    </div>
                                ) : branding.logo ? (
                                    <div className="text-center">
                                        <img src={branding.logo} alt="Current Logo" className="h-32 object-contain mb-3 mx-auto" />
                                        <p className="text-xs text-slate-400">Current Logo</p>
                                    </div>
                                ) : (
                                    <div className="text-center text-slate-400">
                                        <ImageIcon size={32} className="mx-auto mb-2 opacity-50" />
                                        <p className="text-xs">No logo set</p>
                                    </div>
                                )}
                                
                                <input 
                                    type="file" 
                                    accept="image/*"
                                    onChange={handleLogoChange}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                />
                                <div className="mt-4 pointer-events-none">
                                    <span className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600 shadow-sm">
                                        {logoFile ? 'Change File' : 'Upload Logo'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Login Background Upload */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-3">Login Background</label>
                            <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 transition-colors relative">
                                 {bgFile ? (
                                    <div className="relative w-full h-32">
                                        <img src={URL.createObjectURL(bgFile)} alt="Preview" className="w-full h-full object-cover rounded-lg mb-2" />
                                        <button onClick={() => setBgFile(null)} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full"><X size={12}/></button>
                                        <p className="text-xs text-slate-500 text-center mt-1">{bgFile.name}</p>
                                    </div>
                                ) : branding.login_background ? (
                                    <div className="w-full text-center">
                                        <div className="h-32 w-full rounded-lg overflow-hidden mb-3 relative group">
                                            <img src={branding.login_background} alt="Current Background" className="w-full h-full object-cover" />
                                        </div>
                                        <p className="text-xs text-slate-400">Current Background</p>
                                    </div>
                                ) : (
                                    <div className="text-center text-slate-400">
                                        <ImageIcon size={32} className="mx-auto mb-2 opacity-50" />
                                        <p className="text-xs">No background set</p>
                                    </div>
                                )}
                                
                                <input 
                                    type="file" 
                                    accept="image/*"
                                    onChange={handleBgChange}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                />
                                <div className="mt-4 pointer-events-none">
                                    <span className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600 shadow-sm">
                                        {bgFile ? 'Change File' : 'Upload Background'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {(logoFile || bgFile) && (
                        <div className="mt-6 flex justify-end">
                            <button 
                                onClick={handleSaveBranding}
                                disabled={isLoadingBranding}
                                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoadingBranding ? (
                                    <>Uploading...</>
                                ) : (
                                    <>
                                        <Upload size={18} />
                                        Save Branding Changes
                                    </>
                                )}
                            </button>
                        </div>
                    )}
               </div>

               {/* Release Configuration */}
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
           </div>
       )}

       {/* SYSTEM TAB */}
       {activeTab === 'system' && (
           <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div className="flex justify-between items-center">
                   <h2 className="text-xl font-bold text-slate-800">System Diagnostics</h2>
               </div>

               {/* Database Check */}
               <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-green-50 rounded-lg text-green-600">
                            <Database size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">Database Integrity</h3>
                            <p className="text-sm text-slate-500">Checking critical tables and schema structure.</p>
                        </div>
                    </div>

                    {checkingSystem ? (
                        <div className="text-slate-500 text-sm py-4">Checking database...</div>
                    ) : dbStatus ? (
                        <div>
                            <div className={`flex items-center gap-2 text-sm font-medium mb-4 ${dbStatus.status === 'OK' ? 'text-green-600' : 'text-red-600'}`}>
                                {dbStatus.status === 'OK' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
                                {dbStatus.status === 'OK' ? 'Database Structure is Complete' : 'Missing Critical Tables'}
                            </div>
                            
                            {dbStatus.missing && dbStatus.missing.length > 0 && (
                                <div className="bg-red-50 p-4 rounded-xl border border-red-100 mb-4">
                                    <p className="text-xs font-bold text-red-800 mb-2">Missing Tables:</p>
                                    <ul className="list-disc list-inside text-xs text-red-700 mb-4">
                                        {dbStatus.missing.map(t => <li key={t}>{t}</li>)}
                                    </ul>
                                    <button 
                                        onClick={handleFixDb}
                                        disabled={fixingDb}
                                        className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {fixingDb ? (
                                            <>
                                                <RefreshCw size={14} className="animate-spin" />
                                                Repairing Database...
                                            </>
                                        ) : (
                                            <>
                                                <Database size={14} />
                                                Perbaiki Database
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                            <p className="text-xs text-slate-400">Last checked: {new Date(dbStatus.checked_at).toLocaleString()}</p>
                        </div>
                    ) : (
                        <div className="text-slate-400 text-sm">Click refresh to check database.</div>
                    )}
               </div>

               {/* Git Update Check */}
               <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
                                <GitBranch size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">System Update</h3>
                                <p className="text-sm text-slate-500">Check for updates from GitHub repository.</p>
                            </div>
                        </div>
                        
                        <button 
                            onClick={handleCheckSystem}
                            disabled={checkingSystem}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Refresh System Status"
                        >
                            <RefreshCw size={20} className={checkingSystem ? 'animate-spin' : ''} />
                        </button>
                    </div>

                    {checkingSystem ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <Loader2 size={32} className="text-blue-600 animate-spin mb-4" />
                        <p className="text-slate-500 text-sm">Checking for updates...</p>
                    </div>
                ) : updateStatus ? (
                        <div>
                            <div className="flex flex-col md:flex-row gap-6">
                                <div className="flex-1 space-y-3">
                                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-gray-200">
                                        <span className="text-xs font-medium text-slate-500">Repository</span>
                                        <a href={updateStatus.repo} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline truncate max-w-[200px]">{updateStatus.repo}</a>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="flex-1 p-3 bg-slate-50 rounded-xl border border-gray-200">
                                            <span className="text-xs text-slate-400 block mb-1">Local Hash</span>
                                            <code className="text-xs font-mono font-bold text-slate-700">{updateStatus.localHash}</code>
                                        </div>
                                        <div className="flex-1 p-3 bg-slate-50 rounded-xl border border-gray-200">
                                            <span className="text-xs text-slate-400 block mb-1">Remote Hash</span>
                                            <code className="text-xs font-mono font-bold text-slate-700">{updateStatus.remoteHash}</code>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1 flex flex-col justify-center items-center p-6 bg-slate-50 rounded-xl border border-gray-200 text-center">
                                    {updateStatus.updatesAvailable ? (
                                        <>
                                            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-3">
                                                <Play size={24} />
                                            </div>
                                            <h4 className="font-bold text-slate-800 mb-1">Update Available</h4>
                                            <p className="text-xs text-slate-500 mb-4">{updateStatus.behindCount} commits behind main branch.</p>
                                            <button 
                                                onClick={handleUpdateSystem}
                                                disabled={updatingSystem}
                                                className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition-colors shadow-lg shadow-green-600/20 disabled:opacity-50"
                                            >
                                                {updatingSystem ? 'Updating...' : 'Update System'}
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-3">
                                                <CheckCircle size={24} />
                                            </div>
                                            <h4 className="font-bold text-slate-800 mb-1">System sudah Update</h4>
                                            <p className="text-xs text-slate-500">You are running the latest version.</p>
                                        </>
                                    )}
                                </div>
                            </div>
                            {updateMessage && (
                                <div className="mt-4 p-4 bg-slate-800 text-green-400 font-mono text-xs rounded-xl overflow-x-auto whitespace-pre-wrap">
                                    {'>'} {updateMessage}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                <GitBranch size={32} className="text-slate-300" />
                            </div>
                            <h3 className="text-slate-900 font-medium mb-1">System Status Unknown</h3>
                            <p className="text-slate-500 text-sm mb-6">Check for the latest updates from the repository.</p>
                            <button 
                                onClick={handleCheckSystem}
                                disabled={checkingSystem}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                            >
                                <RefreshCw size={16} className={checkingSystem ? 'animate-spin' : ''} />
                                Check for Updates
                            </button>
                        </div>
                    )}
               </div>

               {/* System Logs */}
               <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                   <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                            <Terminal size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">System Logs</h3>
                            <p className="text-sm text-slate-500">History of automated system checks and updates.</p>
                        </div>
                   </div>

                   <div className="overflow-x-auto">
                       <table className="w-full text-left border-collapse">
                           <thead>
                               <tr className="bg-slate-50 border-b border-gray-100">
                                   <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Time</th>
                                   <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                                   <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                   <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Details</th>
                               </tr>
                           </thead>
                           <tbody className="divide-y divide-gray-100">
                               {systemLogs.length === 0 ? (
                                   <tr>
                                       <td colSpan={4} className="px-6 py-8 text-center text-slate-400 text-sm">No system logs available.</td>
                                   </tr>
                               ) : (
                                   systemLogs.map((log) => (
                                       <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                           <td className="px-6 py-3 text-xs text-slate-600 whitespace-nowrap">
                                               {new Date(log.created_at).toLocaleString()}
                                           </td>
                                           <td className="px-6 py-3 text-xs font-medium text-slate-800">
                                               {log.check_type === 'UPDATE_CHECK' ? 'System Update Check' : 'Database Integrity'}
                                           </td>
                                           <td className="px-6 py-3">
                                               <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                                   log.status === 'OK' || log.status === 'UPDATE_AVAILABLE' ? 'bg-green-100 text-green-700' :
                                                   'bg-red-100 text-red-700'
                                               }`}>
                                                   {log.status}
                                               </span>
                                           </td>
                                           <td className="px-6 py-3 text-xs text-slate-500 font-mono max-w-xs truncate" title={log.details}>
                                               {log.details}
                                           </td>
                                       </tr>
                                   ))
                               )}
                           </tbody>
                       </table>
                   </div>
               </div>
           </div>
       )}

       {/* SECURITY TAB */}
       {activeTab === 'security' && (
           <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div className="flex justify-between items-center">
                   <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-50 rounded-lg text-red-600">
                            <Shield size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Security Logs</h2>
                            <p className="text-sm text-slate-500">Monitor failed logins, brute force attempts, and suspicious activities.</p>
                        </div>
                   </div>
                   <button 
                       onClick={fetchSecurityLogs} 
                       disabled={loadingLogs}
                       className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
                   >
                       <RefreshCw size={16} className={loadingLogs ? 'animate-spin' : ''} />
                       Refresh Logs
                   </button>
               </div>

               <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                   <div className="overflow-x-auto">
                       <table className="w-full text-left border-collapse">
                           <thead>
                               <tr className="bg-slate-50 border-b border-gray-100">
                                   <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Time</th>
                                   <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">User / ID</th>
                                   <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">IP Address</th>
                                   <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Location</th>
                                   <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Attack Type</th>
                                   <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Details</th>
                               </tr>
                           </thead>
                           <tbody className="divide-y divide-gray-100">
                               {loadingLogs ? (
                                   <tr>
                                       <td colSpan={6} className="px-6 py-12 text-center text-slate-400">Loading security logs...</td>
                                   </tr>
                               ) : securityLogs.length === 0 ? (
                                   <tr>
                                       <td colSpan={6} className="px-6 py-12 text-center text-slate-400">No security incidents recorded.</td>
                                   </tr>
                               ) : (
                                   securityLogs.map((log) => (
                                       <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                           <td className="px-6 py-4 text-xs text-slate-600 whitespace-nowrap">
                                               {new Date(log.created_at).toLocaleString()}
                                           </td>
                                           <td className="px-6 py-4 text-xs font-medium text-slate-800">
                                               {log.user_identifier}
                                           </td>
                                           <td className="px-6 py-4 text-xs font-mono text-slate-600">
                                               {log.ip_address}
                                           </td>
                                           <td className="px-6 py-4 text-xs text-slate-600">
                                               {log.country || 'Unknown'}
                                           </td>
                                           <td className="px-6 py-4">
                                               <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                                   log.attack_type === 'BRUTE_FORCE' ? 'bg-red-100 text-red-700' :
                                                   log.attack_type === 'DDOS' ? 'bg-purple-100 text-purple-700' :
                                                   'bg-orange-100 text-orange-700'
                                               }`}>
                                                   {log.attack_type}
                                               </span>
                                           </td>
                                           <td className="px-6 py-4 text-xs text-slate-500 max-w-xs truncate" title={log.details}>
                                               {log.details}
                                           </td>
                                       </tr>
                                   ))
                               )}
                           </tbody>
                       </table>
                   </div>
               </div>
           </div>
       )}

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
