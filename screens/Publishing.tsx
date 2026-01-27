
import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, Plus, Trash2, Save, CheckCircle, AlertCircle, UserPlus, BarChart2, Users, List, CreditCard, MapPin, User, Search, ChevronDown, Loader2, Library } from 'lucide-react';
import { PublishingRegistration, Songwriter, SavedSongwriter } from '../types';

interface Props {
  activeTab: string;
  savedSongwriters: SavedSongwriter[];
  setSavedSongwriters: React.Dispatch<React.SetStateAction<SavedSongwriter[]>>;
  allPublishing?: PublishingRegistration[];
  setAllPublishing?: React.Dispatch<React.SetStateAction<PublishingRegistration[]>>;
}

interface Region {
    id: string;
    name: string;
}

export const Publishing: React.FC<Props> = ({ activeTab, savedSongwriters, setSavedSongwriters, allPublishing = [], setAllPublishing = () => {} }) => {
  // Map external tab to internal logic
  // PUBLISHING_ADD -> ADD_PUBLISHING
  // PUBLISHING_WRITER -> ADD_SONGWRITER
  // PUBLISHING_ALL -> ALL_PUBLISHING
  // PUBLISHING_REPORT -> REPORT
  
  const getSubTab = (tab: string) => {
      if (tab === 'PUBLISHING_WRITER') return 'ADD_SONGWRITER';
      if (tab === 'PUBLISHING_REPORT') return 'REPORT';
      if (tab === 'PUBLISHING_ALL') return 'ALL_PUBLISHING';
      return 'ADD_PUBLISHING';
  };

  const currentView = getSubTab(activeTab);

  // --- PUBLISHING FORM STATE ---
  const [formData, setFormData] = useState<PublishingRegistration>({
    title: '',
    songCode: '', 
    otherTitle: '',
    sampleLink: '',
    rightsGranted: {
      synchronization: true, 
      mechanical: true,
      performing: true,
      printing: true,
      other: true
    },
    performer: '',
    duration: '',
    genre: '',
    language: 'Indonesian',
    region: 'Worldwide', 
    iswc: '',
    isrc: '',
    lyrics: '',
    note: '',
    songwriters: [
      { id: '1', name: '', role: 'Author & Composer', share: 100 }
    ]
  });

  // State to track which row shows the dropdown suggestion
  const [activeSearchRow, setActiveSearchRow] = useState<string | null>(null);

  // --- ADD SONGWRITER STATE ---
  const [writerViewMode, setWriterViewMode] = useState<'FORM' | 'DATA'>('FORM');
  const [writerSearch, setWriterSearch] = useState('');
  
  const [writerForm, setWriterForm] = useState<SavedSongwriter>({
      id: '',
      name: '',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      nik: '',
      npwp: '',
      country: 'Indonesia',
      province: '',
      city: '',
      district: '',
      village: '',
      postalCode: '',
      address1: '',
      address2: '',
      bankName: '',
      bankBranch: '',
      accountName: '',
      accountNumber: '',
      publisher: '',
      ipi: ''
  });
  const [writerSuccess, setWriterSuccess] = useState(false);

  // --- REGION API STATE ---
  const [provinces, setProvinces] = useState<Region[]>([]);
  const [regencies, setRegencies] = useState<Region[]>([]);
  const [districts, setDistricts] = useState<Region[]>([]);
  const [villages, setVillages] = useState<Region[]>([]);

  // Selected IDs for fetching children (not saved to DB, only used for logic)
  const [selectedProvinceId, setSelectedProvinceId] = useState('');
  const [selectedRegencyId, setSelectedRegencyId] = useState('');
  const [selectedDistrictId, setSelectedDistrictId] = useState('');
  
  const [isLoadingRegions, setIsLoadingRegions] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Reset success state when switching tabs
  useEffect(() => {
    setSuccess(false);
    setWriterSuccess(false);
    setActiveSearchRow(null);
  }, [activeTab]);

  // --- API REGION FETCHING ---
  
  // 1. Fetch Provinces on Mount (if ID)
  useEffect(() => {
      if (currentView === 'ADD_SONGWRITER' && writerForm.country === 'Indonesia') {
          setIsLoadingRegions(true);
          fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/provinces.json`)
            .then(res => res.json())
            .then(data => {
                setProvinces(data);
                setIsLoadingRegions(false);
            })
            .catch(err => {
                console.error(err);
                setIsLoadingRegions(false);
            });
      }
  }, [currentView, writerForm.country]);

  // 2. Fetch Regencies when Province changes
  useEffect(() => {
      if (selectedProvinceId) {
          setIsLoadingRegions(true);
          fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/regencies/${selectedProvinceId}.json`)
            .then(res => res.json())
            .then(data => {
                setRegencies(data);
                setIsLoadingRegions(false);
            })
            .catch(err => {
                console.error(err);
                setIsLoadingRegions(false);
            });
      } else {
          setRegencies([]);
      }
  }, [selectedProvinceId]);

  // 3. Fetch Districts when City/Regency changes
  useEffect(() => {
      if (selectedRegencyId) {
          setIsLoadingRegions(true);
          fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/districts/${selectedRegencyId}.json`)
            .then(res => res.json())
            .then(data => {
                setDistricts(data);
                setIsLoadingRegions(false);
            })
            .catch(err => {
                console.error(err);
                setIsLoadingRegions(false);
            });
      } else {
          setDistricts([]);
      }
  }, [selectedRegencyId]);

   // 4. Fetch Villages when District changes
   useEffect(() => {
      if (selectedDistrictId) {
          setIsLoadingRegions(true);
          fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/villages/${selectedDistrictId}.json`)
            .then(res => res.json())
            .then(data => {
                setVillages(data);
                setIsLoadingRegions(false);
            })
            .catch(err => {
                console.error(err);
                setIsLoadingRegions(false);
            });
      } else {
          setVillages([]);
      }
  }, [selectedDistrictId]);


  // --- Handlers: Publishing ---

  const handleTextChange = (field: keyof PublishingRegistration, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleWriterChange = (id: string, field: keyof Songwriter, value: any) => {
    setFormData(prev => ({
      ...prev,
      songwriters: prev.songwriters.map(w => w.id === id ? { ...w, [field]: value } : w)
    }));
  };

  const selectWriterFromSuggestion = (rowId: string, savedWriter: SavedSongwriter) => {
      handleWriterChange(rowId, 'name', savedWriter.name);
      setActiveSearchRow(null);
  };

  const addWriterRow = () => {
    setFormData(prev => ({
      ...prev,
      songwriters: [...prev.songwriters, { id: Date.now().toString(), name: '', role: 'Author & Composer', share: 0 }]
    }));
  };

  const removeWriterRow = (id: string) => {
    if (formData.songwriters.length > 1) {
      setFormData(prev => ({
        ...prev,
        songwriters: prev.songwriters.filter(w => w.id !== id)
      }));
    }
  };

  const calculateTotalShare = () => {
    return formData.songwriters.reduce((acc, curr) => acc + Number(curr.share), 0);
  };

  const handleSubmitPublishing = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const totalShare = calculateTotalShare();
    if (totalShare !== 100) {
      alert("Share Rate Lagu Totalnya Tidak Boleh Kurang Atau Lebih Dari 100%.");
      return;
    }
    if (!formData.title || !formData.sampleLink || !formData.songCode) {
        alert("Title, Song Code, and Sample Link are required.");
        return;
    }

    setIsSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      const newSubmission: PublishingRegistration = {
          ...formData,
          id: Date.now().toString(),
          status: 'Pending',
          submissionDate: new Date().toISOString().split('T')[0]
      };
      
      setAllPublishing(prev => [newSubmission, ...prev]);
      
      setIsSubmitting(false);
      setSuccess(true);
      window.scrollTo(0,0);
    }, 1500);
  };

  // --- Handlers: Add Songwriter ---
  const handleWriterFormChange = (field: keyof SavedSongwriter, value: string) => {
      setWriterForm(prev => ({ ...prev, [field]: value }));
  };

  const handleRegionChange = (level: 'province' | 'city' | 'district' | 'village', id: string) => {
      if (level === 'province') {
          const region = provinces.find(r => r.id === id);
          setSelectedProvinceId(id);
          setWriterForm(prev => ({ 
              ...prev, 
              province: region ? region.name : '', 
              city: '', 
              district: '', 
              village: '',
              postalCode: '' // Clear postal code
          }));
          setSelectedRegencyId('');
          setSelectedDistrictId('');
          setRegencies([]);
          setDistricts([]);
          setVillages([]);
      }
      else if (level === 'city') {
          const region = regencies.find(r => r.id === id);
          setSelectedRegencyId(id);
          setWriterForm(prev => ({ 
              ...prev, 
              city: region ? region.name : '', 
              district: '', 
              village: '',
              postalCode: '' // Clear postal code
          }));
          setSelectedDistrictId('');
          setDistricts([]);
          setVillages([]);
      }
      else if (level === 'district') {
          const region = districts.find(r => r.id === id);
          setSelectedDistrictId(id);
          setWriterForm(prev => ({ 
              ...prev, 
              district: region ? region.name : '', 
              village: '',
              postalCode: '' // Clear postal code
          }));
          setVillages([]);
      }
      else if (level === 'village') {
          const region = villages.find(r => r.id === id);
          
          setWriterForm(prev => ({ 
              ...prev, 
              village: region ? region.name : '',
              postalCode: region ? 'Loading...' : ''
          }));

          // FETCH POSTAL CODE
          if (region) {
             const districtName = districts.find(d => d.id === selectedDistrictId)?.name;
             const cityName = regencies.find(r => r.id === selectedRegencyId)?.name;

             if (districtName && cityName) {
                 fetch(`https://kodepos.vercel.app/search/?q=${region.name}`)
                    .then(res => res.json())
                    .then(data => {
                        let code = '';
                        if (data.status && data.data && Array.isArray(data.data)) {
                            // Helper to clean names for comparison (remove "KOTA", uppercase, etc)
                            const clean = (str: string) => str.replace(/^(KOTA|KABUPATEN)\s+/i, '').replace(/\s+/g, ' ').trim().toLowerCase();
                            
                            const tDist = clean(districtName);
                            const tCity = clean(cityName);
                            const tVillage = clean(region.name);
                            
                            // 1. Exact Match: Village, District, City
                            const exact = data.data.find((d: any) => 
                                clean(d.urban) === tVillage &&
                                clean(d.sub_district) === tDist && 
                                clean(d.city) === tCity
                            );
                            
                            if (exact) {
                                code = exact.postal_code;
                            } else {
                                // 2. Fallback: Match District only (City spelling might differ slightly)
                                const distMatch = data.data.find((d: any) => 
                                    clean(d.urban) === tVillage &&
                                    clean(d.sub_district) === tDist
                                );
                                if (distMatch) code = distMatch.postal_code;
                                else {
                                    // 3. Last resort fallback
                                    code = '';
                                }
                            }
                        } else {
                            code = '';
                        }
                        
                        setWriterForm(prev => ({ 
                            ...prev, 
                            postalCode: code || 'Not Found' 
                        }));
                    })
                    .catch(err => {
                        console.error("Postal Code API Error:", err);
                        setWriterForm(prev => ({ ...prev, postalCode: '' }));
                    });
             } else {
                 setWriterForm(prev => ({ ...prev, postalCode: '' }));
             }
          }
      }
  };

  const handleSubmitWriter = (e: React.FormEvent) => {
      e.preventDefault();
      if(!writerForm.firstName || !writerForm.email) {
          alert("First Name and Email are required");
          return;
      }
      
      const fullName = `${writerForm.firstName} ${writerForm.lastName}`.trim();

      const newWriter: SavedSongwriter = {
          ...writerForm,
          id: Date.now().toString(),
          name: fullName // Computed field for easier display
      };

      setSavedSongwriters(prev => [...prev, newWriter]);
      setWriterSuccess(true);
      
      // Reset Form
      setWriterForm({
          id: '', name: '', firstName: '', lastName: '', email: '', phone: '',
          nik: '', npwp: '', country: 'Indonesia', province: '', city: '',
          district: '', village: '', postalCode: '', address1: '', address2: '',
          bankName: '', bankBranch: '', accountName: '', accountNumber: '',
          publisher: '', ipi: ''
      });
      // Reset Region IDs
      setSelectedProvinceId('');
      setSelectedRegencyId('');
      setSelectedDistrictId('');

      // Show success message briefly then switch to list view (optional, keeping form for now)
      setTimeout(() => setWriterSuccess(false), 3000);
  };

  const deleteSavedWriter = (id: string) => {
      if(confirm('Delete this songwriter?')) {
          setSavedSongwriters(prev => prev.filter(w => w.id !== id));
      }
  };

  const renderSuccess = () => (
    <div className="text-center bg-white p-12 rounded-3xl shadow-xl border border-gray-100 max-w-2xl mx-auto mt-10">
        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} />
        </div>
        <h2 className="text-3xl font-bold text-slate-800 mb-2">Registration Submitted!</h2>
        <p className="text-slate-500 mb-8">
            Your song publishing registration for <strong>"{formData.title}"</strong> (Code: {formData.songCode}) has been received.
        </p>
        <button 
        onClick={() => {
            setSuccess(false);
            setFormData({
                ...formData, 
                title: '', 
                songCode: '',
                sampleLink: '', 
                lyrics: '',
                songwriters: [{ id: '1', name: '', role: 'Author & Composer', share: 100 }]
            });
        }}
        className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors"
        >
            Register Another Song
        </button>
    </div>
  );

  return (
    <div className="p-4 md:p-8 w-full max-w-[1400px] mx-auto min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
            <BookOpen size={32} className="text-blue-600" />
            Song Publishing
        </h1>
        <p className="text-slate-500 mt-1">Manage copyrights, writers, and royalties.</p>
      </div>

      {/* CONTENT AREA */}
      <div className="max-w-6xl mx-auto">
        
        {/* === TAB: ADD SONGWRITER (Implementation) === */}
        {currentView === 'ADD_SONGWRITER' && (
             <div className="animate-fade-in">
                 
                 {/* Internal Tabs */}
                 <div className="flex gap-4 mb-6 border-b border-gray-200">
                     <button 
                        onClick={() => setWriterViewMode('FORM')}
                        className={`pb-3 px-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${writerViewMode === 'FORM' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                     >
                         <UserPlus size={16} /> Add Songwriter
                     </button>
                     <button 
                        onClick={() => setWriterViewMode('DATA')}
                        className={`pb-3 px-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${writerViewMode === 'DATA' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                     >
                         <List size={16} /> Data Songwriter
                     </button>
                 </div>

                 {writerSuccess && (
                     <div className="bg-green-50 text-green-700 px-6 py-4 rounded-xl border border-green-200 mb-6 flex items-center gap-2 animate-bounce">
                         <CheckCircle size={20} />
                         <span className="font-bold">Songwriter successfully saved to database!</span>
                     </div>
                 )}

                 {/* VIEW 1: FORM */}
                 {writerViewMode === 'FORM' && (
                    <form onSubmit={handleSubmitWriter} className="bg-white rounded-3xl shadow-sm border border-gray-200 p-8">
                        {/* 1. Personal Details */}
                        <div className="mb-8">
                            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2 border-b border-gray-100 pb-3">
                                <User size={20} className="text-blue-500" /> Personal Details
                            </h3>
                            
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-700">First Name <span className="text-red-500">*</span></label>
                                        <input 
                                            value={writerForm.firstName}
                                            onChange={(e) => handleWriterFormChange('firstName', e.target.value)}
                                            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50/50"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-700">Last Name</label>
                                        <input 
                                            value={writerForm.lastName}
                                            onChange={(e) => handleWriterFormChange('lastName', e.target.value)}
                                            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50/50"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700">Email Address <span className="text-red-500">*</span></label>
                                    <input 
                                        type="email"
                                        value={writerForm.email}
                                        onChange={(e) => handleWriterFormChange('email', e.target.value)}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50/50"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700">Phone Number <span className="text-red-500">*</span></label>
                                    <input 
                                        value={writerForm.phone}
                                        onChange={(e) => handleWriterFormChange('phone', e.target.value)}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50/50"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700">Citizen ID Number (KTP/NIK) <span className="text-red-500">*</span></label>
                                    <input 
                                        value={writerForm.nik}
                                        onChange={(e) => handleWriterFormChange('nik', e.target.value)}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50/50"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700">Personal Tax ID Number (NPWP Pribadi) <span className="text-red-500">*</span></label>
                                    <input 
                                        value={writerForm.npwp}
                                        onChange={(e) => handleWriterFormChange('npwp', e.target.value)}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50/50"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Yellow Alert */}
                        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-xl text-sm font-medium mb-8">
                            These fields below are optional. You may complete them or let the songwriter fill them in themselves.
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                            {/* 2. Address */}
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2 border-b border-gray-100 pb-3">
                                    <MapPin size={20} className="text-blue-500" /> Address
                                </h3>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-700">Country</label>
                                        <select 
                                            value={writerForm.country}
                                            onChange={(e) => {
                                                handleWriterFormChange('country', e.target.value);
                                                if(e.target.value !== 'Indonesia') {
                                                    // Reset API data if not indonesia
                                                    setProvinces([]);
                                                    setRegencies([]);
                                                    setDistricts([]);
                                                    setVillages([]);
                                                    setWriterForm(prev => ({...prev, province: '', city: '', district: '', village: ''}));
                                                }
                                            }}
                                            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 bg-white"
                                        >
                                            <option value="Indonesia">Indonesia</option>
                                            <option value="Malaysia">Malaysia</option>
                                            <option value="Singapore">Singapore</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>

                                    {/* CONDITIONAL ADDRESS INPUTS */}
                                    {writerForm.country === 'Indonesia' ? (
                                        <>
                                            {/* Province */}
                                            <div className="space-y-2 relative">
                                                <label className="text-sm font-semibold text-slate-700">State / Province</label>
                                                <select
                                                    value={selectedProvinceId}
                                                    onChange={(e) => handleRegionChange('province', e.target.value)}
                                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 bg-white disabled:bg-gray-50 disabled:text-gray-400"
                                                    disabled={isLoadingRegions && provinces.length === 0}
                                                >
                                                    <option value="">-- Choose Province --</option>
                                                    {provinces.map(p => (
                                                        <option key={p.id} value={p.id}>{p.name}</option>
                                                    ))}
                                                </select>
                                                {isLoadingRegions && provinces.length === 0 && <div className="absolute right-3 top-9"><Loader2 className="animate-spin text-blue-500" size={16}/></div>}
                                            </div>

                                            {/* City */}
                                            <div className="space-y-2 relative">
                                                <label className="text-sm font-semibold text-slate-700">City (Kabupaten/Kota)</label>
                                                <select
                                                    value={selectedRegencyId}
                                                    onChange={(e) => handleRegionChange('city', e.target.value)}
                                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 bg-white disabled:bg-gray-50 disabled:text-gray-400"
                                                    disabled={!selectedProvinceId}
                                                >
                                                    <option value="">-- Choose City --</option>
                                                    {regencies.map(r => (
                                                        <option key={r.id} value={r.id}>{r.name}</option>
                                                    ))}
                                                </select>
                                                {isLoadingRegions && regencies.length === 0 && selectedProvinceId && <div className="absolute right-3 top-9"><Loader2 className="animate-spin text-blue-500" size={16}/></div>}
                                            </div>

                                            {/* District */}
                                            <div className="space-y-2 relative">
                                                <label className="text-sm font-semibold text-slate-700">District (Kecamatan)</label>
                                                <select
                                                    value={selectedDistrictId}
                                                    onChange={(e) => handleRegionChange('district', e.target.value)}
                                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 bg-white disabled:bg-gray-50 disabled:text-gray-400"
                                                    disabled={!selectedRegencyId}
                                                >
                                                    <option value="">-- Choose District --</option>
                                                    {districts.map(d => (
                                                        <option key={d.id} value={d.id}>{d.name}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Village */}
                                            <div className="space-y-2 relative">
                                                <label className="text-sm font-semibold text-slate-700">Village (Kelurahan)</label>
                                                <select
                                                    value={villages.find(v => v.name === writerForm.village)?.id || ''}
                                                    onChange={(e) => handleRegionChange('village', e.target.value)}
                                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 bg-white disabled:bg-gray-50 disabled:text-gray-400"
                                                    disabled={!selectedDistrictId}
                                                >
                                                    <option value="">-- Choose Village --</option>
                                                    {villages.map(v => (
                                                        <option key={v.id} value={v.id}>{v.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            {/* Fallback Text Inputs for Non-ID Countries */}
                                            <div className="space-y-2">
                                                <label className="text-sm font-semibold text-slate-700">State / Province</label>
                                                <input
                                                    placeholder="-- Choose --"
                                                    value={writerForm.province}
                                                    onChange={(e) => handleWriterFormChange('province', e.target.value)}
                                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 bg-white"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-semibold text-slate-700">City (Kabupaten/Kota)</label>
                                                <input
                                                    placeholder="-- Choose --"
                                                    value={writerForm.city}
                                                    onChange={(e) => handleWriterFormChange('city', e.target.value)}
                                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 bg-white"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-semibold text-slate-700">District (Kecamatan)</label>
                                                <input
                                                    placeholder="-- Choose --"
                                                    value={writerForm.district}
                                                    onChange={(e) => handleWriterFormChange('district', e.target.value)}
                                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 bg-white"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-semibold text-slate-700">Village (Kelurahan)</label>
                                                <input
                                                    placeholder="-- Choose --"
                                                    value={writerForm.village}
                                                    onChange={(e) => handleWriterFormChange('village', e.target.value)}
                                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 bg-white"
                                                />
                                            </div>
                                        </>
                                    )}

                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-700">Postal Code</label>
                                        <input
                                            placeholder={writerForm.country === 'Indonesia' ? "Auto-filled from Village" : "Enter Postal Code"}
                                            value={writerForm.postalCode}
                                            onChange={(e) => writerForm.country !== 'Indonesia' && handleWriterFormChange('postalCode', e.target.value)}
                                            readOnly={writerForm.country === 'Indonesia'}
                                            className={`w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none ${
                                                writerForm.country === 'Indonesia' 
                                                ? 'bg-gray-100 text-slate-500 cursor-not-allowed' 
                                                : 'bg-white focus:border-blue-500'
                                            }`}
                                        />
                                        {writerForm.country === 'Indonesia' && (
                                            <p className="text-[10px] text-slate-400 mt-1">Automatically filled based on selected Village.</p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-700">Address 1</label>
                                        <input
                                            value={writerForm.address1}
                                            onChange={(e) => handleWriterFormChange('address1', e.target.value)}
                                            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 bg-white"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-700">Address 2</label>
                                        <input
                                            value={writerForm.address2}
                                            onChange={(e) => handleWriterFormChange('address2', e.target.value)}
                                            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 bg-white"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* 3. Bank Details */}
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2 border-b border-gray-100 pb-3">
                                    <CreditCard size={20} className="text-blue-500" /> Bank Details
                                </h3>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-700">Bank Name</label>
                                        <input 
                                            value={writerForm.bankName}
                                            onChange={(e) => handleWriterFormChange('bankName', e.target.value)}
                                            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 bg-white"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-700">Bank Branch</label>
                                        <input 
                                            value={writerForm.bankBranch}
                                            onChange={(e) => handleWriterFormChange('bankBranch', e.target.value)}
                                            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 bg-white"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-700">Account Name</label>
                                        <input 
                                            value={writerForm.accountName}
                                            onChange={(e) => handleWriterFormChange('accountName', e.target.value)}
                                            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 bg-white"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-700">Account Number</label>
                                        <input 
                                            value={writerForm.accountNumber}
                                            onChange={(e) => handleWriterFormChange('accountNumber', e.target.value)}
                                            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 bg-white"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-8 mt-8 border-t border-gray-100 flex justify-end">
                            <button
                                type="submit"
                                className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30 flex items-center gap-2"
                            >
                                <Save size={18} /> Save Changes
                            </button>
                        </div>
                    </form>
                 )}

                 {/* VIEW 2: DATA LIST */}
                 {writerViewMode === 'DATA' && (
                     <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
                         {/* Toolbar */}
                         <div className="p-6 border-b border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
                             <div className="relative w-full md:w-80">
                                 <input 
                                     placeholder="Search saved writers..." 
                                     value={writerSearch}
                                     onChange={(e) => setWriterSearch(e.target.value)}
                                     className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                                 />
                                 <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                             </div>
                             <div className="text-sm text-slate-500 font-bold">
                                 Total: {savedSongwriters.length}
                             </div>
                         </div>
                         
                         {/* Table */}
                         <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Name</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Email / Phone</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">ID (NIK)</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Bank</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {savedSongwriters
                                        .filter(w => w.name.toLowerCase().includes(writerSearch.toLowerCase()))
                                        .map(writer => (
                                        <tr key={writer.id} className="hover:bg-slate-50">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-700">{writer.name}</div>
                                                <div className="text-xs text-slate-400">NPWP: {writer.npwp || '-'}</div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-600">
                                                <div>{writer.email}</div>
                                                <div className="text-xs text-slate-400">{writer.phone}</div>
                                            </td>
                                            <td className="px-6 py-4 font-mono text-sm text-slate-600">
                                                {writer.nik || '-'}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-600">
                                                {writer.bankName ? (
                                                    <div>
                                                        <span className="font-bold">{writer.bankName}</span>
                                                        <div className="text-xs">{writer.accountNumber}</div>
                                                    </div>
                                                ) : <span className="text-slate-300 italic">-</span>}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button 
                                                    onClick={() => deleteSavedWriter(writer.id)}
                                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {savedSongwriters.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="p-8 text-center text-slate-400 italic">
                                                No writers found. Add one in the form tab.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                         </div>
                     </div>
                 )}
             </div>
        )}

        {/* === TAB: ADD PUBLISHING === */}
        {currentView === 'ADD_PUBLISHING' && (
            success ? renderSuccess() : (
            <form onSubmit={handleSubmitPublishing} className="bg-white rounded-3xl shadow-sm border border-gray-200 p-8 md:p-10 animate-fade-in">
                
                {/* Header Section */}
                <div className="mb-8 pb-6 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-slate-800 mb-1">Work Registration</h2>
                    <p className="text-sm text-slate-500">Register a new musical work for publishing administration.</p>
                </div>

                {/* Form Fields */}
                <div className="space-y-6">
                    
                    {/* Title & Song Code */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-slate-700 mb-2">Title <span className="text-red-500">*</span></label>
                            <input 
                                value={formData.title}
                                onChange={(e) => handleTextChange('title', e.target.value)}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                                placeholder="Song Title"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Kode Lagu <span className="text-red-500">*</span></label>
                            <input 
                                value={formData.songCode}
                                onChange={(e) => handleTextChange('songCode', e.target.value)}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none bg-blue-50/50"
                                placeholder="Manual Code (e.g. S-001)"
                            />
                        </div>
                    </div>

                    {/* Other Title */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Other Title</label>
                        <input 
                            value={formData.otherTitle}
                            onChange={(e) => handleTextChange('otherTitle', e.target.value)}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                            placeholder="Alternative Title / Translation"
                        />
                    </div>

                    {/* Sample Link */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Link to song sample <span className="text-red-500">*</span></label>
                        <input 
                            value={formData.sampleLink}
                            onChange={(e) => handleTextChange('sampleLink', e.target.value)}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                            placeholder="URL (Google Drive, Dropbox, Soundcloud, etc)"
                        />
                    </div>

                    {/* Rights Granted - AUTO CHECKED & DISABLED */}
                    <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                        <label className="block text-sm font-bold text-slate-700 mb-3">Rights Granted <span className="text-red-500">*</span></label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                                { key: 'synchronization', label: 'Synchronization' },
                                { key: 'printing', label: 'Printing' },
                                { key: 'mechanical', label: 'Mechanical' },
                                { key: 'other', label: 'Other Rights' },
                                { key: 'performing', label: 'Performing' },
                            ].map((right) => (
                                <label key={right.key} className="flex items-center gap-3 cursor-not-allowed opacity-70">
                                    <div className="w-5 h-5 rounded border flex items-center justify-center bg-blue-600 border-blue-600">
                                        <CheckCircle size={14} className="text-white" />
                                    </div>
                                    <input 
                                        type="checkbox" 
                                        className="hidden" 
                                        checked={true}
                                        disabled={true}
                                    />
                                    <span className="text-sm font-bold text-slate-700">{right.label}</span>
                                </label>
                            ))}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-3 italic">* All rights are automatically granted for administration by default.</p>
                    </div>

                    {/* Performer */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Performer <span className="text-red-500">*</span></label>
                        <input 
                            value={formData.performer}
                            onChange={(e) => handleTextChange('performer', e.target.value)}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                            placeholder="Artist / Band Name"
                        />
                    </div>

                    {/* Grid for small details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Duration <span className="text-red-500">*</span></label>
                            <input 
                                value={formData.duration}
                                onChange={(e) => handleTextChange('duration', e.target.value)}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                                placeholder="e.g. 3:45"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Genre <span className="text-red-500">*</span></label>
                            <input 
                                value={formData.genre}
                                onChange={(e) => handleTextChange('genre', e.target.value)}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                                placeholder="Primary Genre"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Language <span className="text-red-500">*</span></label>
                            <input 
                                value={formData.language}
                                onChange={(e) => handleTextChange('language', e.target.value)}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                                placeholder="Lyrics Language"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Region <span className="text-red-500">*</span></label>
                            <input 
                                value={formData.region}
                                readOnly
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-100 text-slate-500 cursor-not-allowed focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">ISWC</label>
                            <input 
                                value={formData.iswc}
                                onChange={(e) => handleTextChange('iswc', e.target.value)}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                                placeholder="International Standard Musical Work Code"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">ISRC <span className="text-red-500">*</span></label>
                            <input 
                                value={formData.isrc}
                                onChange={(e) => handleTextChange('isrc', e.target.value)}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                                placeholder="Recording Code"
                            />
                        </div>
                    </div>

                    {/* Lyrics (MOVED UP) */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Lyrics</label>
                        <textarea 
                            value={formData.lyrics}
                            onChange={(e) => handleTextChange('lyrics', e.target.value)}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none min-h-[150px] font-sans"
                            placeholder="Enter full lyrics here..."
                        />
                    </div>

                    {/* Note */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Note</label>
                        <textarea 
                            value={formData.note}
                            onChange={(e) => handleTextChange('note', e.target.value)}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none min-h-[80px]"
                            placeholder="Additional information..."
                        />
                    </div>

                    <hr className="border-gray-100 my-8" />

                    {/* Songwriters Table */}
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Songwriters</h3>
                        <div className="bg-slate-50 border border-gray-200 rounded-xl overflow-visible mb-2">
                            <table className="w-full text-left">
                                <thead className="bg-slate-100 text-slate-600 font-bold text-xs uppercase">
                                    <tr>
                                        <th className="px-4 py-3">Name</th>
                                        <th className="px-4 py-3 w-1/3">Role</th>
                                        <th className="px-4 py-3 w-32 text-center">Share (%)</th>
                                        <th className="px-4 py-3 w-16"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {formData.songwriters.map((writer, idx) => (
                                        <tr key={writer.id} className="bg-white">
                                            <td className="p-3 relative">
                                                <div className="relative">
                                                    <input 
                                                        value={writer.name}
                                                        onChange={(e) => {}} // No manual typing allowed
                                                        readOnly // KEY CHANGE: Cannot be edited manually
                                                        onClick={() => setActiveSearchRow(writer.id)} // Open dropdown on click
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 text-sm cursor-pointer bg-white"
                                                        placeholder="Select Songwriter..."
                                                        autoComplete="off"
                                                    />
                                                    <ChevronDown size={14} className="absolute right-3 top-2.5 text-slate-400" />
                                                    
                                                    {/* AUTOCOMPLETE DROPDOWN */}
                                                    {activeSearchRow === writer.id && (
                                                        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                                                            {savedSongwriters.map(sw => (
                                                                <div 
                                                                    key={sw.id}
                                                                    onClick={() => selectWriterFromSuggestion(writer.id, sw)}
                                                                    className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm text-slate-700 border-b border-gray-50 last:border-0"
                                                                >
                                                                    <div className="font-bold">{sw.name}</div>
                                                                    <div className="text-xs text-slate-400">{sw.ipi ? `IPI: ${sw.ipi}` : 'No IPI'}</div>
                                                                </div>
                                                            ))}
                                                            {savedSongwriters.length === 0 && (
                                                                <div className="px-3 py-2 text-xs text-slate-400 italic border-t border-gray-100">
                                                                    Tip: Add writers in "Add Songwriter" tab first.
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-3">
                                                <select 
                                                    value={writer.role}
                                                    onChange={(e) => handleWriterChange(writer.id, 'role', e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 text-sm bg-white"
                                                >
                                                    <option value="Author">Author (Lyricist)</option>
                                                    <option value="Composer">Composer (Music)</option>
                                                    <option value="Author & Composer">Author & Composer</option>
                                                    <option value="Arranger">Arranger</option>
                                                </select>
                                            </td>
                                            <td className="p-3">
                                                <div className="relative">
                                                    <input 
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        value={writer.share}
                                                        onChange={(e) => handleWriterChange(writer.id, 'share', e.target.value)}
                                                        className="w-full pl-3 pr-6 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 text-sm text-center font-mono"
                                                    />
                                                    <span className="absolute right-3 top-2 text-slate-400 text-xs font-bold">%</span>
                                                </div>
                                            </td>
                                            <td className="p-3 text-center">
                                                {formData.songwriters.length > 1 && (
                                                    <button 
                                                        type="button"
                                                        onClick={() => removeWriterRow(writer.id)}
                                                        className="text-slate-400 hover:text-red-500 transition-colors"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        
                        <div className="flex justify-between items-center mt-4">
                            <button 
                                type="button"
                                onClick={addWriterRow}
                                className="text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                            >
                                <Plus size={16} /> Add Songwriter
                            </button>
                            <div className="flex items-center gap-2 text-sm">
                                <span className="text-slate-500 font-bold">Total Share:</span>
                                <span className={`font-mono font-bold ${calculateTotalShare() === 100 ? 'text-green-600' : 'text-red-500'}`}>
                                    {calculateTotalShare()}%
                                </span>
                                {calculateTotalShare() !== 100 && (
                                    <span className="text-xs text-red-400 bg-red-50 px-2 py-1 rounded-full flex items-center gap-1">
                                        <AlertCircle size={12} /> Must equal 100%
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="pt-8 border-t border-gray-100 flex justify-end">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-8 py-3 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 transition-all shadow-lg shadow-orange-500/30 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? (
                                <>Saving...</>
                            ) : (
                                <>Submit Publishing <Save size={18} /></>
                            )}
                        </button>
                    </div>
                </div>
            </form>
            )
        )}

        {/* === TAB 3: ALL PUBLISHING (New View) === */}
        {currentView === 'ALL_PUBLISHING' && (
             <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden animate-fade-in">
                 <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                     <div>
                         <h2 className="text-xl font-bold text-slate-800">All Publishing Submissions</h2>
                         <p className="text-sm text-slate-500">Track the status of your work registrations.</p>
                     </div>
                     <div className="text-sm font-bold bg-blue-50 text-blue-600 px-3 py-1 rounded-lg">
                         Total: {allPublishing.length}
                     </div>
                 </div>

                 <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Submission Date</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Title / Code</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Writers</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {allPublishing.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-12 text-center text-slate-400 italic">
                                        <Library size={32} className="mx-auto mb-3 opacity-50" />
                                        No publishing data submitted yet.
                                    </td>
                                </tr>
                            ) : (
                                allPublishing.map((item, idx) => (
                                    <tr key={item.id || idx} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            {item.submissionDate || "N/A"}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-800">{item.title}</div>
                                            <div className="text-xs text-blue-500 font-mono bg-blue-50 inline-block px-1 rounded mt-1">
                                                {item.songCode}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            <div className="flex -space-x-2">
                                                {item.songwriters.slice(0, 3).map((w, i) => (
                                                    <div key={i} className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-600" title={`${w.name} (${w.share}%)`}>
                                                        {w.name.charAt(0)}
                                                    </div>
                                                ))}
                                                {item.songwriters.length > 3 && (
                                                    <div className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-500">
                                                        +{item.songwriters.length - 3}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="text-xs text-slate-400 mt-1">{item.songwriters.length} Writers</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold border 
                                                ${item.status === 'Approved' ? 'bg-green-50 text-green-700 border-green-200' : 
                                                  item.status === 'Rejected' ? 'bg-red-50 text-red-700 border-red-200' : 
                                                  'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>
                                                {item.status || 'Pending'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="text-blue-600 hover:text-blue-800 text-sm font-bold">
                                                View
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                 </div>
             </div>
        )}

        {/* === TAB 4: REPORT PUBLISHING (Placeholder) === */}
        {currentView === 'REPORT' && (
             <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-12 text-center animate-fade-in">
                 <div className="w-20 h-20 bg-purple-50 text-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                     <BarChart2 size={40} />
                 </div>
                 <h2 className="text-xl font-bold text-slate-800">Publishing Reports</h2>
                 <p className="text-slate-500 mt-2">View royalties, collected earnings, and status of registered works.</p>
                 <button className="mt-6 px-6 py-2 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-colors">
                     View Analytics
                 </button>
             </div>
        )}

      </div>
    </div>
  );
};
