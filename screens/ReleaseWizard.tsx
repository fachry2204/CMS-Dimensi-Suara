
import React, { useState, useEffect } from 'react';
import { ReleaseType, ReleaseData, Step } from '../types';
import { StepIndicator } from '../components/StepIndicator';
import { Step1ReleaseInfo } from './wizard/Step1ReleaseInfo';
import { Step2TrackInfo } from './wizard/Step2TrackInfo';
import { Step3ReleaseDetail } from './wizard/Step3ReleaseDetail';
import { Step4Review } from './wizard/Step4Review';
import { ChevronLeft, ChevronRight, AlertTriangle, X } from 'lucide-react';
import { api } from '../utils/api';

interface Props {
  type: ReleaseType;
  onBack: () => void;
  onSave: (data: ReleaseData) => void; // New prop to bubble up data
  initialData?: ReleaseData | null; // For viewing/editing
}

const INITIAL_DATA: ReleaseData = {
  coverArt: null,
  upc: "",
  title: "",
  language: "",
  primaryArtists: [""], 
  label: "",
  genre: "",
  pLine: "",
  cLine: "",
  version: "",
  tracks: [],
  isNewRelease: true,
  originalReleaseDate: "",
  plannedReleaseDate: ""
};

export const ReleaseWizard: React.FC<Props> = ({ type, onBack, onSave, initialData }) => {
  const [currentStep, setCurrentStep] = useState<number>(Step.INFO);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showTrackWarning, setShowTrackWarning] = useState(false);
  const [showArtistWarning, setShowArtistWarning] = useState(false);
  const [showAudioProcessingWarning, setShowAudioProcessingWarning] = useState(false);
  const [showAudioMissingWarning, setShowAudioMissingWarning] = useState<string[] | false>(false);
  
  const [data, setData] = useState<ReleaseData>(() => initialData ? initialData : INITIAL_DATA);

  // If viewing existing data, we might want to ensure tracks exist
  useEffect(() => {
    if (initialData) {
        setData(initialData);
    }
  }, [initialData]);

  const updateData = (updates: Partial<ReleaseData> | ((prev: ReleaseData) => Partial<ReleaseData>)) => {
    setData(prev => {
      const patch = typeof updates === 'function' ? updates(prev) : updates;
      return { ...prev, ...patch };
    });
  };

  const handleNext = () => {
    if (currentStep === Step.INFO) {
        const artists = (data.primaryArtists || []).map(a => (a || '').trim()).filter(a => a.length > 0);
        if (artists.length === 0) {
            setShowArtistWarning(true);
            return;
        }
    }
    if (currentStep === Step.TRACKS) {
        const processing = (data.tracks || []).some(t => (t.processingAudio === true) || (t.processingClip === true));
        if (processing) {
            setShowAudioProcessingWarning(true);
            return;
        }
        // Tidak lagi memblokir di Step 2 berdasarkan cek "sudah diupload ke server".
        // Cukup pastikan proses belum berjalan; validasi audio/clip penuh dilakukan di Step 4.
    }
    if (currentStep === Step.TRACKS && type === 'ALBUM') {
        if (data.tracks.length < 2) {
            setShowTrackWarning(true);
            return;
        }
    }
    if (currentStep < Step.REVIEW) {
        setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > Step.INFO) {
        setCurrentStep(prev => prev - 1);
    } else {
        setShowExitModal(true);
    }
  };

  const handleConfirmExit = () => {
      setShowExitModal(false);
      try {
        const token = localStorage.getItem('cms_token') || '';
        if (token && data.title && (data.primaryArtists || []).length > 0) {
          (async () => {
            try {
              await api.cleanupTmp(token, { title: data.title, primaryArtists: data.primaryArtists });
            } catch (e) {
              console.warn('Failed to cleanup tmp on exit:', (e as any)?.message || e);
            }
          })();
        }
      } catch {}
      onBack();
  };

  const renderStep = () => {
    switch (currentStep) {
        case Step.INFO: return <Step1ReleaseInfo data={data} updateData={updateData} releaseType={type} />;
        case Step.TRACKS: return <Step2TrackInfo data={data} updateData={updateData} releaseType={type} />;
        case Step.DETAILS: return <Step3ReleaseDetail data={data} updateData={updateData} />;
        case Step.REVIEW: return <Step4Review data={{...data, type}} onSave={onSave} onBack={handlePrev} />;
        default: return null;
    }
  };

  const title = initialData ? 'Release Details' : (type === 'SINGLE' ? 'New Single' : 'New Album');

  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-5xl mx-auto pt-6 px-4 md:px-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 backdrop-blur-sm bg-white/50 p-3 rounded-lg border border-white/50 shadow-sm">
            <div className="flex flex-col">
                <div className="flex items-center space-x-2 text-[10px] text-slate-500 mb-0.5">
                    <span className="font-medium text-blue-600">Dashboard</span>
                    <span>/</span>
                    <span>{initialData ? 'View' : 'Upload'}</span>
                </div>
                <h1 className="text-base font-medium text-slate-800 tracking-tight">{title}</h1>
            </div>
            
        </div>

        {/* Stepper */}
        <StepIndicator currentStep={currentStep} onStepClick={(s) => { if (s <= currentStep) setCurrentStep(s); }} />

        {/* Main Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-lg shadow-xl shadow-blue-900/5 border border-white p-4 mb-6 relative">
            {renderStep()}
        </div>

        {/* Bottom Navigation */}
        {currentStep < Step.REVIEW && (
        <div className="flex justify-between items-center px-1">
            <button 
                onClick={handlePrev}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded font-medium bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-[10px] hover:shadow-lg hover:shadow-orange-400/30 transform hover:-translate-y-0.5 transition-all"
            >
                <ChevronLeft size={12} />
                Back
            </button>
            
            <button 
                onClick={handleNext}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-medium rounded text-[10px] hover:shadow-lg hover:shadow-blue-500/30 transform hover:-translate-y-0.5 transition-all duration-200"
            >
                Next Step
                <ChevronRight size={12} />
            </button>
        </div>
        )}
      </div>

      {/* Exit Confirmation Modal */}
      {showExitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-lg shadow-2xl max-w-md w-full overflow-hidden transform transition-all scale-100 animate-fade-in-up">
                <div className="bg-yellow-50 p-3 border-b border-yellow-100 flex items-center gap-3">
                    <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="text-yellow-600" size={16} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-[10px] font-medium text-yellow-800">Warning</h3>
                        <p className="text-[10px] text-yellow-700">Confirmation Required</p>
                    </div>
                    <button 
                        onClick={() => setShowExitModal(false)}
                        className="text-yellow-400 hover:text-yellow-600 transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>
                
                <div className="p-4">
                    <p className="text-slate-600 mb-3 font-medium text-[10px]">
                        Apakah kamu akan kembali ke Pemilihan Single atau EP/Album?
                    </p>
                    <p className="text-[10px] text-slate-500 mb-4 bg-slate-50 p-2.5 rounded-lg">
                        Jika Ya, data draft yang sudah di isi akan dihapus.
                    </p>
                    
                    <div className="flex gap-2 justify-end">
                        <button
                            onClick={() => setShowExitModal(false)}
                            className="px-3 py-1.5 rounded font-medium text-slate-600 hover:bg-slate-100 transition-colors text-[10px]"
                        >
                            Tidak
                        </button>
                        <button
                            onClick={handleConfirmExit}
                            className="px-3 py-1.5 rounded font-medium bg-yellow-500 text-white hover:bg-yellow-600 shadow-lg shadow-yellow-500/30 transition-all text-[10px]"
                        >
                            Ya
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}
      {showAudioProcessingWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-lg shadow-2xl max-w-md w-full overflow-hidden transform transition-all scale-100 animate-fade-in-up">
                <div className="bg-red-50 p-3 border-b border-red-100 flex items-center gap-3">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="text-red-600" size={16} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-[10px] font-medium text-red-800">Proses Belum Selesai</h3>
                        <p className="text-[10px] text-red-700">Audio sedang diproses/diunggah. Tunggu selesai sebelum lanjut.</p>
                    </div>
                    <button 
                        onClick={() => setShowAudioProcessingWarning(false)}
                        className="text-red-300 hover:text-red-500 transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>
                <div className="p-4">
                    <div className="flex justify-end">
                        <button
                            onClick={() => setShowAudioProcessingWarning(false)}
                            className="px-3 py-1.5 rounded font-medium bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/30 transition-all text-[10px]"
                        >
                            Mengerti
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}
      {Array.isArray(showAudioMissingWarning) && showAudioMissingWarning.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-lg shadow-2xl max-w-md w-full overflow-hidden transform transition-all scale-100 animate-fade-in-up">
                <div className="bg-red-50 p-3 border-b border-red-100 flex items-center gap-3">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="text-red-600" size={16} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-[10px] font-medium text-red-800">Data Audio Belum Lengkap</h3>
                        <p className="text-[10px] text-red-700">Perbaiki masalah berikut sebelum lanjut:</p>
                    </div>
                    <button 
                        onClick={() => setShowAudioMissingWarning(false)}
                        className="text-red-300 hover:text-red-500 transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>
                <div className="p-4">
                    <ul className="text-[10px] text-slate-700 list-disc pl-5 space-y-1">
                        {showAudioMissingWarning.map((msg, i) => (<li key={i}>{msg}</li>))}
                    </ul>
                    <div className="flex justify-end mt-4">
                        <button
                            onClick={() => setShowAudioMissingWarning(false)}
                            className="px-3 py-1.5 rounded font-medium bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/30 transition-all text-[10px]"
                        >
                            Mengerti
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {showTrackWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-lg shadow-2xl max-w-md w-full overflow-hidden transform transition-all scale-100 animate-fade-in-up">
                <div className="bg-red-50 p-3 border-b border-red-100 flex items-center gap-3">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="text-red-600" size={16} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-[10px] font-medium text-red-800">Peringatan</h3>
                        <p className="text-[10px] text-red-700">Jumlah track belum mencukupi</p>
                    </div>
                    <button 
                        onClick={() => setShowTrackWarning(false)}
                        className="text-red-300 hover:text-red-500 transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>
                
                <div className="p-4">
                    <p className="text-slate-600 mb-3 font-medium text-[10px]">
                        Untuk rilis Album/EP, minimal harus ada 2 track sebelum lanjut ke Step berikutnya.
                    </p>
                    <p className="text-[10px] text-slate-500 mb-4 bg-slate-50 p-3 rounded-lg">
                        Tambahkan setidaknya satu track lagi di daftar Tracklist.
                    </p>
                    
                    <div className="flex justify-end">
                        <button
                            onClick={() => setShowTrackWarning(false)}
                            className="px-3 py-1.5 rounded font-medium bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/30 transition-all text-[10px]"
                        >
                            Mengerti
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}
      {showArtistWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-lg shadow-2xl max-w-md w-full overflow-hidden transform transition-all scale-100 animate-fade-in-up">
                <div className="bg-red-50 p-3 border-b border-red-100 flex items-center gap-3">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="text-red-600" size={16} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-xs font-medium text-red-800">Peringatan</h3>
                        <p className="text-[10px] text-red-700">Primary Artist(s) wajib diisi</p>
                    </div>
                    <button 
                        onClick={() => setShowArtistWarning(false)}
                        className="text-red-300 hover:text-red-500 transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>
                
                <div className="p-4">
                    <p className="text-slate-600 mb-3 font-medium text-[10px]">
                        Isi setidaknya satu nama artis di kolom Primary Artist(s) sebelum lanjut ke Step 2.
                    </p>
                    <div className="flex justify-end">
                        <button
                            onClick={() => setShowArtistWarning(false)}
                            className="px-3 py-1.5 rounded font-medium bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/30 transition-all text-[10px]"
                        >
                            Mengerti
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
