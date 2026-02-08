
import React, { useState, useEffect } from 'react';
import { ReleaseType, ReleaseData, Step } from '../types';
import { StepIndicator } from '../components/StepIndicator';
import { Step1ReleaseInfo } from './wizard/Step1ReleaseInfo';
import { Step2TrackInfo } from './wizard/Step2TrackInfo';
import { Step3ReleaseDetail } from './wizard/Step3ReleaseDetail';
import { Step4Review } from './wizard/Step4Review';
import { Maximize, Minimize, ChevronLeft, ChevronRight, Save } from 'lucide-react';

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
  language: "Indonesia",
  primaryArtists: [""], 
  label: "",
  genre: "Pop",
  pLine: new Date().getFullYear().toString(),
  cLine: new Date().getFullYear().toString(),
  version: "Original",
  tracks: [],
  isNewRelease: true,
  originalReleaseDate: "",
  plannedReleaseDate: ""
};

export const ReleaseWizard: React.FC<Props> = ({ type, onBack, onSave, initialData }) => {
  const [currentStep, setCurrentStep] = useState<number>(() => {
      const saved = localStorage.getItem('cms_wizard_current_step');
      return saved ? parseInt(saved) : Step.INFO;
  });
  
  const [data, setData] = useState<ReleaseData>(() => {
      if (initialData) return initialData;
      
      const saved = localStorage.getItem('cms_wizard_data');
      if (saved) {
          try {
              const parsed = JSON.parse(saved);
              // Sanitize File objects that became empty objects {}
              if (parsed.coverArt && typeof parsed.coverArt === 'object' && Object.keys(parsed.coverArt).length === 0) {
                  parsed.coverArt = null;
              }
              // Sanitize Tracks
              if (parsed.tracks) {
                  parsed.tracks = parsed.tracks.map((t: any) => ({
                      ...t,
                      audioFile: (t.audioFile && typeof t.audioFile === 'object' && Object.keys(t.audioFile).length === 0) ? null : t.audioFile,
                      audioClip: (t.audioClip && typeof t.audioClip === 'object' && Object.keys(t.audioClip).length === 0) ? null : t.audioClip,
                  }));
              }
              return { ...INITIAL_DATA, ...parsed };
          } catch (e) {
              console.error("Failed to parse saved wizard data", e);
              return INITIAL_DATA;
          }
      }
      return INITIAL_DATA;
  });

  const [isFullscreen, setIsFullscreen] = useState(false);

  // Persist State
  useEffect(() => {
      localStorage.setItem('cms_wizard_current_step', currentStep.toString());
  }, [currentStep]);

  useEffect(() => {
      localStorage.setItem('cms_wizard_data', JSON.stringify(data));
  }, [data]);

  // If viewing existing data, we might want to ensure tracks exist
  useEffect(() => {
    if (initialData) {
        setData(initialData);
    }
  }, [initialData]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message} (${err.name})`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const updateData = (updates: Partial<ReleaseData>) => {
    setData(prev => ({ ...prev, ...updates }));
  };

  const handleNext = () => {
    if (currentStep < Step.REVIEW) {
        setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > Step.INFO) {
        setCurrentStep(prev => prev - 1);
    } else {
        onBack();
    }
  };

  const renderStep = () => {
    switch (currentStep) {
        case Step.INFO: return <Step1ReleaseInfo data={data} updateData={updateData} />;
        case Step.TRACKS: return <Step2TrackInfo data={data} updateData={updateData} releaseType={type} />;
        case Step.DETAILS: return <Step3ReleaseDetail data={data} updateData={updateData} />;
        case Step.REVIEW: return <Step4Review data={{...data, type}} onSave={onSave} />;
        default: return null;
    }
  };

  const title = initialData ? 'Release Details' : (type === 'SINGLE' ? 'New Single' : 'New Album');

  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-5xl mx-auto pt-8 px-4 md:px-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8 backdrop-blur-sm bg-white/50 p-4 rounded-2xl border border-white/50 shadow-sm">
            <div className="flex flex-col">
                <div className="flex items-center space-x-2 text-sm text-slate-500 mb-1">
                    <span className="font-medium text-blue-600">Dashboard</span>
                    <span>/</span>
                    <span>{initialData ? 'View' : 'Upload'}</span>
                </div>
                <h1 className="text-2xl font-bold text-slate-800 tracking-tight">{title}</h1>
            </div>
            <div className="flex items-center gap-3">
                <button 
                  onClick={toggleFullscreen}
                  className="p-2.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200"
                  title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                >
                  {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
                </button>
                <button className="flex items-center gap-2 px-5 py-2.5 border border-blue-200 text-blue-600 bg-white rounded-xl font-semibold text-sm hover:bg-blue-50 hover:border-blue-300 transition-all shadow-sm">
                    <Save size={16} />
                    <span>Save Draft</span>
                </button>
            </div>
        </div>

        {/* Stepper */}
        <StepIndicator currentStep={currentStep} />

        {/* Main Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-blue-900/5 border border-white p-8 mb-8 relative">
            {renderStep()}
        </div>

        {/* Bottom Navigation */}
        <div className="flex justify-between items-center px-2">
            <button 
                onClick={handlePrev}
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-slate-500 hover:text-slate-800 hover:bg-white transition-all"
            >
                <ChevronLeft size={20} />
                Back
            </button>
            
            {currentStep < Step.REVIEW && (
                <button 
                    onClick={handleNext}
                    className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-blue-500/30 transform hover:-translate-y-0.5 transition-all duration-200"
                >
                    Next Step
                    <ChevronRight size={20} />
                </button>
            )}
        </div>
      </div>
    </div>
  );
};
