import React, { useRef, useState, useEffect } from 'react';
import { ReleaseData, ReleaseType } from '../../types';
import { TextInput, SelectInput } from '../../components/Input';
import { LANGUAGES, VERSIONS, TRACK_GENRES, SUB_GENRES_MAP } from '../../constants';
import { ImagePlus, UserPlus, Trash2, Loader2 } from 'lucide-react';
import { api } from '../../utils/api';

interface Props {
  data: ReleaseData;
  updateData: (updates: Partial<ReleaseData> | ((prev: ReleaseData) => Partial<ReleaseData>)) => void;
  releaseType: ReleaseType;
}

export const Step1ReleaseInfo: React.FC<Props> = ({ data, updateData, releaseType }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessingImg, setIsProcessingImg] = useState(false);
  const [userType, setUserType] = useState<'Company' | 'Personal' | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

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

  // --- Image Processing Logic ---
  const processImage = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 3000;
        canvas.height = 3000;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error("Canvas context error"));
          return;
        }

        // Fill white background (optional, but good for JPG)
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, 3000, 3000);

        // Draw image stretched/resized to 3000x3000px
        ctx.drawImage(img, 0, 0, 3000, 3000);

        canvas.toBlob((blob) => {
          if (blob) {
            const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
              type: "image/jpeg",
              lastModified: Date.now(),
            });
            resolve(newFile);
          } else {
            reject(new Error("Blob creation failed"));
          }
        }, "image/jpeg", 0.9);
      };
      img.onerror = (err) => reject(err);
    });
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsProcessingImg(true);
      try {
        const processedFile = await processImage(e.target.files[0]);
        const token = localStorage.getItem('cms_token') || '';
        let storedCover: any = processedFile;
        if (token) {
          try {
            // Use TMP upload
            const resp = await api.uploadTmpReleaseFile(
              token,
              { title: (data.title && data.title.trim()) || `Cover-${Date.now()}`, primaryArtists: (data.primaryArtists || []).filter(a => a && a.trim() !== '') },
              'coverArt',
              processedFile
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
        alert("Failed to process image.");
      } finally {
        setIsProcessingImg(false);
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
        <h2 className="text-base font-medium text-slate-800 mb-1">Basic Information</h2>
        <p className="text-[10px] text-slate-500">Let's start with the essentials of your release.</p>
      </div>
      
      <div className="flex flex-col gap-6 items-start w-full">
          {/* Group 1: Main Info */}
          <div className="w-full bg-white border border-gray-200 rounded-lg p-4 relative mt-2">
              <h3 className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-3 absolute -top-2 left-3 bg-white px-1">Release Identity</h3>
              
              <div className="flex flex-col md:flex-row gap-6">
                {/* Left Column: Text Inputs */}
                <div className="flex-1 space-y-3">
                  {/* UPC Field */}
                  <div>
                      <TextInput 
                        label="Kode UPC (Jika pernah rilis sebelumnya)" 
                        value={data.upc} 
                        onChange={(e) => updateData({ upc: e.target.value })} 
                        placeholder="Leave blank to auto-generate"
                      />
                  </div>

                  <div>
                      <TextInput 
                        label="Release Title" 
                        value={data.title} 
                        onChange={(e) => updateData({ title: e.target.value })} 
                        placeholder="e.g. Midnight Memories"
                      />
                  </div>

                  {/* Primary Artists (Multiple) */}
                  <div>
                    <label className="block text-[10px] font-medium text-slate-700 mb-1">Primary Artist(s)</label>
                    <div className="space-y-2">
                      {data.primaryArtists.map((artist, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <input 
                            value={artist}
                            onChange={(e) => handleArtistChange(index, e.target.value)}
                            className="flex-1 px-2.5 py-1.5 border border-gray-300 rounded bg-white text-[10px] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 placeholder-gray-400 transition-all"
                            placeholder="Artist Name"
                          />
                          {data.primaryArtists.length > 1 && (
                            <button 
                              type="button"
                              onClick={() => removeArtist(index)}
                              className="p-1.5 text-red-500 bg-red-50 rounded hover:bg-red-100 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <button 
                      type="button"
                      onClick={addArtist}
                      className="mt-2 flex items-center text-blue-600 font-medium text-[10px] hover:underline"
                    >
                      <UserPlus size={12} className="mr-1" />
                      Add Another Artist
                    </button>
                  </div>
                </div>

                {/* Right Column: Cover Art */}
                <div className="w-full md:w-48 flex-shrink-0">
                  <div className="mb-1">
                    <label className="block text-[10px] font-medium text-slate-700 mb-2">Cover Art</label>
                    <div className="flex flex-col gap-2">
                        <div
                          className="w-full aspect-square bg-blue-50 rounded flex items-center justify-center overflow-hidden border-2 border-dashed border-blue-200 relative group hover:border-blue-400 transition-colors cursor-pointer"
                          onClick={() => !data.coverArt && !isProcessingImg && fileInputRef.current?.click()}
                        >
                          {isProcessingImg ? (
                            <div className="flex flex-col items-center text-blue-500">
                              <Loader2 size={20} className="animate-spin mb-1" />
                              <span className="text-[10px] font-medium">Processing...</span>
                            </div>
                          ) : data.coverArt ? (
                            <img
                              src={typeof data.coverArt === 'string' ? data.coverArt : URL.createObjectURL(data.coverArt)}
                              alt="Cover"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="flex flex-col items-center p-2 text-center">
                              <ImagePlus size={24} className="text-blue-500 mb-1" />
                              <p className="text-[10px] font-medium text-blue-600">Upload Cover</p>
                              <p className="text-[9px] text-slate-400 mt-1">3000x3000px</p>
                            </div>
                          )}
                          {data.coverArt && !isProcessingImg && (
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeCover();
                                }}
                                className="p-1 bg-white text-red-500 rounded-full shadow-lg hover:bg-red-50"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="text-[9px] text-slate-500 space-y-0.5">
                            <p className="font-medium text-slate-700">Requirements:</p>
                            <ul className="list-disc pl-3">
                                <li>Format: JPG/PNG</li>
                                <li>Size: 3000x3000px</li>
                                <li>Ratio: 1:1</li>
                            </ul>
                        </div>
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={handleCoverUpload}
                    />
                  </div>
                </div>
              </div>
          </div>

          {/* Group 2: Publishing & Classification */}
          <div className="w-full bg-white border border-gray-200 rounded-lg p-4 relative mt-2">
              <h3 className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-3 absolute -top-2 left-3 bg-white px-1">Details & Classification</h3>
              
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
                  <SelectInput 
                    label="Language / Territory"
                    options={LANGUAGES}
                    value={data.language}
                    onChange={(e) => updateData({ language: e.target.value })}
                  />
                  <SelectInput 
                    label="Release Version"
                    options={VERSIONS}
                    value={data.version}
                    onChange={(e) => updateData({ version: e.target.value })}
                  />
              </div>
          </div>
      </div>
    </div>
  );
};
