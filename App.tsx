
import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Footer } from './components/Footer';
import { ReleaseTypeSelection } from './screens/ReleaseTypeSelection';
import { ReleaseWizard } from './screens/ReleaseWizard';
import { AllReleases } from './screens/AllReleases';
import { Settings } from './screens/Settings';
import { ReleaseDetailModal } from './components/ReleaseDetailModal'; // Acts as a screen now
import { ReleaseType, ReleaseData } from './types';
import { Menu } from 'lucide-react';

const DUMMY_RELEASES: ReleaseData[] = [
    { 
        id: '101', 
        title: "Summer Vibes", 
        primaryArtists: ["The Weekend Band"], 
        status: 'Live', 
        aggregator: "Tunecore",
        submissionDate: "2023-10-12", 
        coverArt: null, upc: "898921821", language: "", label: "", version: "", tracks: [], isNewRelease: true, originalReleaseDate: "", plannedReleaseDate: ""
    },
    { 
        id: '102', 
        title: "Midnight Rain", 
        primaryArtists: ["Sarah J"], 
        status: 'Processing',
        aggregator: "Believe",
        submissionDate: "2023-11-05", 
        coverArt: null, upc: "", language: "", label: "", version: "", tracks: [], isNewRelease: true, originalReleaseDate: "", plannedReleaseDate: ""
    }
];

const App: React.FC = () => {
  // Sidebar State
  const [activeTab, setActiveTab] = useState<'NEW' | 'ALL' | 'SETTINGS'>('NEW');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Global App State
  const [allReleases, setAllReleases] = useState<ReleaseData[]>(DUMMY_RELEASES);
  const [aggregators, setAggregators] = useState<string[]>(["Believe", "Tunecore", "DistroKid", "The Orchard", "CD Baby"]);

  // Wizard State
  const [wizardStep, setWizardStep] = useState<'SELECTION' | 'WIZARD'>('SELECTION');
  const [releaseType, setReleaseType] = useState<ReleaseType | null>(null);
  
  // Detail/Edit State
  const [editingRelease, setEditingRelease] = useState<ReleaseData | null>(null); // For Wizard Edit
  const [viewingRelease, setViewingRelease] = useState<ReleaseData | null>(null); // For Detail View

  const handleSidebarNavigate = (tab: 'NEW' | 'ALL' | 'SETTINGS') => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false); // Close mobile menu on click
    setViewingRelease(null); // Clear viewing state
    if (tab === 'NEW') {
      // Reset wizard when clicking New Release
      setWizardStep('SELECTION');
      setReleaseType(null);
      setEditingRelease(null);
    }
  };

  const handleSelectType = (type: ReleaseType) => {
    setReleaseType(type);
    setWizardStep('WIZARD');
    setEditingRelease(null); // Clear editing state for new release
  };

  const handleBackToSelection = () => {
    // If coming from "All Releases" view, go back to list
    if (activeTab === 'ALL') {
        setEditingRelease(null);
        setWizardStep('SELECTION'); // Reset logic
        return;
    }
    setWizardStep('SELECTION');
    setReleaseType(null);
  };

  const handleSaveRelease = (data: ReleaseData) => {
      // If editing existing
      if (data.id && allReleases.some(r => r.id === data.id)) {
          setAllReleases(prev => prev.map(r => r.id === data.id ? data : r));
      } else {
          // New
          setAllReleases(prev => [data, ...prev]);
      }
      setActiveTab('ALL'); // Go to list after save
      setViewingRelease(null);
  };

  const handleUpdateRelease = (updated: ReleaseData) => {
     setAllReleases(prev => prev.map(r => r.id === updated.id ? updated : r));
     // Also update the viewing state to reflect changes immediately
     if (viewingRelease && viewingRelease.id === updated.id) {
         setViewingRelease(updated);
     }
  };

  const handleEditWizard = (release: ReleaseData) => {
      setEditingRelease(release);
      setReleaseType(release.tracks.length > 1 ? 'ALBUM' : 'SINGLE');
      setActiveTab('NEW'); // Switch to wizard context (UI wrapper)
      setWizardStep('WIZARD');
  };

  const handleViewDetails = (release: ReleaseData) => {
      setViewingRelease(release);
      // We stay in 'ALL' activeTab conceptually, but render the detail screen
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
      
      {/* Mobile Menu Button */}
      <button 
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md text-slate-700"
      >
        <Menu size={24} />
      </button>

      {/* Sidebar (Desktop & Mobile Overlay) */}
      <div className={`
        fixed inset-0 z-40 transform transition-transform duration-300 md:relative md:translate-x-0 md:w-auto
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
         <Sidebar activeTab={activeTab} onNavigate={handleSidebarNavigate} />
         {/* Mobile Backdrop */}
         <div 
            className={`absolute inset-0 bg-black/50 -z-10 md:hidden ${isMobileMenuOpen ? 'block' : 'hidden'}`}
            onClick={() => setIsMobileMenuOpen(false)}
         ></div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 w-full md:ml-0 overflow-x-hidden min-h-screen flex flex-col">
        <div className="flex-1">
          {activeTab === 'NEW' && (
            <>
              {wizardStep === 'SELECTION' && (
                <ReleaseTypeSelection onSelect={handleSelectType} />
              )}
              {wizardStep === 'WIZARD' && releaseType && (
                <ReleaseWizard 
                  type={releaseType} 
                  onBack={handleBackToSelection} 
                  onSave={handleSaveRelease}
                  initialData={editingRelease}
                />
              )}
            </>
          )}

          {activeTab === 'ALL' && !viewingRelease && (
            <AllReleases 
                releases={allReleases} 
                onViewRelease={handleViewDetails} 
                onUpdateRelease={handleUpdateRelease} // This is for quick edits if we implemented them
                availableAggregators={aggregators}
            />
          )}

          {activeTab === 'ALL' && viewingRelease && (
            <ReleaseDetailModal 
                release={viewingRelease}
                isOpen={true} // Always open as page
                onClose={() => setViewingRelease(null)}
                onUpdate={handleUpdateRelease}
                availableAggregators={aggregators}
            />
          )}

          {activeTab === 'SETTINGS' && (
            <Settings aggregators={aggregators} setAggregators={setAggregators} />
          )}
        </div>
        
        {/* Global Footer */}
        <Footer />
      </main>
    </div>
  );
};

export default App;
