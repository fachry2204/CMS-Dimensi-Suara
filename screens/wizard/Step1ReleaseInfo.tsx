import React, { useRef, useState, useEffect } from 'react';
import { ReleaseData, ReleaseType } from '../../types';
import { TextInput, SelectInput } from '../../components/Input';
import { LANGUAGES, VERSIONS, TRACK_GENRES, SUB_GENRES_MAP } from '../../constants';
import { ImagePlus, UserPlus, Trash2, Loader2 } from 'lucide-react';
import { api } from '../../utils/api';
import { AlertModal } from '../../components/AlertModal';

interface Props {
  data: ReleaseData;
  updateData: (updates: Partial<ReleaseData> | ((prev: ReleaseData) => Partial<ReleaseData>)) => void;
  releaseType: ReleaseType;
  isProcessingCover: boolean;
  setIsProcessingCover: (val: boolean) => void;
}

export const Step1ReleaseInfo: React.FC<Props> = ({ data, updateData, releaseType, isProcessingCover, setIsProcessingCover }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [userType, setUserType] = useState<'Company' | 'Personal' | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [alertState, setAlertState] = useState<{ isOpen: boolean; title: string; message: string; type: 'error' | 'warning' | 'info' | 'success' }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'error'
  });

  useEffect(() => {
    const fetchUserType = async () => {
        const token = localStorage.getItem('cms_token');
        if (token) {
            try {
                const profile = await api.getProfile(token);
                // Check account_type, default to Personal if not Company
                const type = (profile.account_type === 'Company' || profile.account_type === 'COMPANY') ? 'Company' : 'Personal';
                setUserType(type);
                setUserRole(profile.role);
                
                if (type === 'Personal' && profile.role !== 'Admin') {
                    updateData({ 
                        label: 'Dimensi Suara',
                        pLine: 'Dimensi Suara',
                        cLine: 'Dimensi Suara'
                    });
                }
            } catch (error) {
                console.error("Failed to fetch user profile", error);
            }
        }
    };
    fetchUserType();
  }, []);

  // --- Image Validation Logic ---
  const validateImage = async (file: File): Promise<boolean> => {
    return new Promise((resolve, reject) => {
      // 1. Check File Type (Strict JPG)
      if (file.type !== 'image/jpeg' && file.type !== 'image/jpg') {
        setAlertState({
          isOpen: true,
          title: 'Format File Salah',
          message: 'Format gambar WAJIB JPG/JPEG. Tidak boleh format lain.',
          type: 'error'
        });
        resolve(false);
        return;
      }

      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        // 2. Check Dimensions (Strict 3000x3000px)
        if (img.width !== 3000 || img.height !== 3000) {
          setAlertState({
            isOpen: true,
            title: 'Ukuran Gambar Salah',
            message: `Ukuran gambar WAJIB 3000x3000px. Tidak boleh ukuran lain. Ukuran file anda: ${img.width}x${img.height}px`,
            type: 'error'
          });
          resolve(false);
        } else {
          resolve(true);
        }
      };
      img.onerror = (err) => {
        setAlertState({
          isOpen: true,
          title: 'Error',
          message: 'Gagal membaca file gambar.',
          type: 'error'
        });
        resolve(false);
      };
    });
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      setIsProcessingCover(true);
      try {
        const isValid = await validateImage(file);
        if (!isValid) {
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        const token = localStorage.getItem('cms_token') || '';
        let storedCover: any = file;
        
        if (token) {
          try {
            // Use TMP upload
            const resp = await api.uploadTmpReleaseFile(
              token,
              { title: (data.title && data.title.trim()) || `Cover-${Date.now()}`, primaryArtists: (data.primaryArtists || []).filter(a => a && a.trim() !== '') },
              'coverArt',
              file
            );
            if (resp && resp.paths && resp.paths['coverArt']) {
              storedCover = resp.paths['coverArt'];
            }
          } catch (err) {
            console.error('Upload cover art failed:', err);
          }
        }
        updateData({ coverArt: storedCover });
      } catch (error) {
        console.error("Image processing failed", error);
        setAlertState({
            isOpen: true,
            title: 'Error',
            message: 'Failed to process image.',
            type: 'error'
        });
      } finally {
        setIsProcessingCover(false);
      }
    }
  };

  const removeCover = () => {
    updateData({ coverArt: null });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // --- Multi Artist Logic ---
  const handleArtistChange = (index: number, value: string) => {
    const newArtists = [...data.primaryArtists];
    newArtists[index] = value;
    updateData({ primaryArtists: newArtists });
  };

  const addArtist = () => {
    updateData({ primaryArtists: [...data.primaryArtists, ""] });
  };

  const removeArtist = (index: number) => {
    if (data.primaryArtists.length > 1) {
      const newArtists = data.primaryArtists.filter((_, i) => i !== index);
      updateData({ primaryArtists: newArtists });
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-xs font-bold text-slate-800 mb-2">Basic Information</h2>
        <p className="text-xs text-slate-500">Let's start with the essentials of your release.</p>
      </div>
      
      <div className="flex flex-col gap-6 items-start w-full">
          {/* Group 1: Main Info */}
          <div className="w-full bg-white border border-gray-200 rounded p-6 relative mt-4">
              <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-4 absolute -top-2 left-4 bg-white px-2">Release Identity</h3>
              
              <div className="flex flex-col md:flex-row gap-8">
                {/* Left Column: Text Inputs */}
                <div className="flex-1 space-y-4">
                  {/* UPC Field Removed - Moved to Step 3 */}


                  <div>
                      <TextInput 
                        label={<>Release Title <span className="text-red-500">*</span></>}
                        value={data.title} 
                        onChange={(e) => updateData({ title: e.target.value })} 
                        placeholder="e.g. Midnight Memories"
                      />
                  </div>

                  {/* Primary Artists (Multiple) */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Primary Artist(s) <span className="text-red-500">*</span></label>
                    <div className="space-y-2">
                      {data.primaryArtists.map((artist, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <input 
                            value={artist}
                            onChange={(e) => handleArtistChange(index, e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded bg-white text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 placeholder-gray-400 transition-all"
                            placeholder="Artist Name"
                          />
                          {data.primaryArtists.length > 1 && (
                            <button 
                              type="button"
                              onClick={() => removeArtist(index)}
                              className="p-2 text-red-500 bg-red-50 rounded hover:bg-red-100 transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <button 
                      type="button"
                      onClick={addArtist}
                      className="mt-2 flex items-center text-blue-600 font-medium text-xs hover:underline"
                    >
                      <UserPlus size={16} className="mr-1" />
                      Add Another Artist
                    </button>
                    
                    <div className="grid grid-cols-1 gap-3 mt-4">
                        <SelectInput 
                          label={<>Release Version <span className="text-red-500">*</span></>}
                          options={VERSIONS}
                          value={data.version}
                          onChange={(e) => updateData({ version: e.target.value })}
                        />
                        <SelectInput 
                          label={<>Language / Territory <span className="text-red-500">*</span></>}
                          options={LANGUAGES}
                          value={data.language}
                          onChange={(e) => updateData({ language: e.target.value })}
                        />
                    </div>
                  </div>
                </div>

                {/* Right Column: Cover Art */}
                <div className="w-full md:w-56 flex-shrink-0">
                  <div className="mb-2">
                    <label className="block text-xs font-medium text-slate-700 mb-2">Cover Art</label>
                    <div className="flex flex-col gap-2">
                        <div
                          className="w-full aspect-square bg-blue-50 rounded flex items-center justify-center overflow-hidden border-2 border-dashed border-blue-200 relative group hover:border-blue-400 transition-colors cursor-pointer"
                          onClick={() => !data.coverArt && !isProcessingCover && fileInputRef.current?.click()}
                        >
                          {isProcessingCover ? (
                            <div className="flex flex-col items-center text-blue-500">
                              <Loader2 size={24} className="animate-spin mb-2" />
                              <span className="text-xs font-medium">Processing...</span>
                            </div>
                          ) : data.coverArt ? (
                            <img
                              src={typeof data.coverArt === 'string' ? data.coverArt : URL.createObjectURL(data.coverArt)}
                              alt="Cover"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="flex flex-col items-center p-4 text-center">
                              <ImagePlus size={32} className="text-blue-500 mb-2" />
                              <p className="text-xs font-medium text-blue-600">Upload Cover</p>
                              <p className="text-[10px] text-slate-400 mt-1">3000x3000px</p>
                            </div>
                          )}
                          {data.coverArt && !isProcessingCover && (
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeCover();
                                }}
                                className="p-2 bg-white text-red-500 rounded-full shadow hover:bg-red-50"
                              >
                                <Trash2 size={20} />
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="text-[10px] text-red-600 font-medium space-y-1 mt-2 p-2 bg-red-50 border border-red-200 rounded text-center leading-tight">
                            <p>Wajib menggunakan format JPG/JPEG dengan resolusi tepat 3000x3000px.</p>
                        </div>
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept=".jpg, .jpeg"
                      onChange={handleCoverUpload}
                    />
                  </div>
                </div>
              </div>
          </div>

          {/* Group 2: Publishing & Classification (Only for Album/Company) */}
          {(releaseType === 'ALBUM' || userType === 'Company' || userRole === 'Admin') && (
          <div className="w-full bg-white border border-gray-200 rounded p-6 relative mt-4">
              <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-4 absolute -top-2 left-4 bg-white px-2">Details & Classification</h3>
              
              {(userType === 'Company' || userRole === 'Admin') && (
                <>
                  <div className="mb-3">
                      <TextInput 
                        label="Record Label" 
                        value={data.label} 
                        onChange={(e) => updateData({ label: e.target.value })} 
                        placeholder="Your Label Name"
                      />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                      <TextInput 
                        label="P-Line (Copyright)" 
                        value={data.pLine} 
                        onChange={(e) => updateData({ pLine: e.target.value })} 
                        placeholder="℗ 2024 Your Label"
                      />
                      <TextInput 
                        label="C-Line (Publishing)" 
                        value={data.cLine} 
                        onChange={(e) => updateData({ cLine: e.target.value })} 
                        placeholder="© 2024 Your Label"
                      />
                  </div>
                </>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {releaseType === 'ALBUM' && (
                    <>
                        <SelectInput 
                          label="Genre"
                          options={TRACK_GENRES}
                          value={data.genre || ""}
                          onChange={(e) => updateData({ genre: e.target.value, subGenre: "" })}
                        />
                        <SelectInput
                          label="Sub Genre"
                          options={SUB_GENRES_MAP[data.genre || ""] || []}
                          value={data.subGenre || ""}
                          onChange={(e) => updateData({ subGenre: e.target.value })}
                        />
                    </>
                  )}
              </div>
          </div>
          )}
      </div>

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
