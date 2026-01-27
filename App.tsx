
import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Footer } from './components/Footer';
import { ReleaseTypeSelection } from './screens/ReleaseTypeSelection';
import { ReleaseWizard } from './screens/ReleaseWizard';
import { AllReleases } from './screens/AllReleases';
import { Settings } from './screens/Settings';
import { LoginScreen } from './screens/LoginScreen'; 
import { ReleaseDetailModal } from './components/ReleaseDetailModal';
import { ReleaseType, ReleaseData } from './types';
import { Menu, Bell, User, LogOut, ChevronDown, AlertTriangle } from 'lucide-react';

const DUMMY_RELEASES: ReleaseData[] = [
    { 
        id: '101', 
        title: "Summer Vibes", 
        primaryArtists: ["The Weekend Band"], 
        status: 'Live', 
        aggregator: "LokaMusik",
        submissionDate: "2023-10-12", 
        coverArt: null, upc: "898921821", language: "", label: "", version: "", tracks: [], isNewRelease: true, originalReleaseDate: "", plannedReleaseDate: ""
    },
    { 
        id: '102', 
        title: "Midnight Rain", 
        primaryArtists: ["Sarah J"], 
        status: 'Processing',
        aggregator: "SoundOn",
        submissionDate: "2023-11-05", 
        coverArt: null, upc: "", language: "", label: "", version: "", tracks: [], isNewRelease: true, originalReleaseDate: "", plannedReleaseDate: ""
    }
];

const App: React.FC = () => {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
  
  // Logout Confirmation State
  const [showLogoutDialog, setShowLogoutDialog] = useState<boolean>(false);

  // Sidebar State
  const [activeTab, setActiveTab] = useState<'NEW' | 'ALL' | 'SETTINGS'>('NEW');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Global App State
  const [allReleases, setAllReleases] = useState<ReleaseData[]>(DUMMY_RELEASES);
  // UPDATED: Default Aggregators
  const [aggregators, setAggregators] = useState<string[]>(["LokaMusik", "SoundOn"]);

  // Wizard State
  const [wizardStep, setWizardStep] = useState<'SELECTION' | 'WIZARD'>('SELECTION');
  const [releaseType, setReleaseType] = useState<ReleaseType | null>(null);
  
  // Detail/Edit State
  const [editingRelease, setEditingRelease] = useState<ReleaseData | null>(null); 
  const [viewingRelease, setViewingRelease] = useState<ReleaseData | null>(null); 

  // Check LocalStorage on Mount
  useEffect(() => {
    const storedAuth = localStorage.getItem('cms_auth');
    if (storedAuth === 'true') {
      setIsAuthenticated(true);
    }
    setIsAuthChecking(false);
  }, []);

  const handleLogin = () => {
    localStorage.setItem('cms_auth', 'true');
    setIsAuthenticated(true);
  };

  const handleLogoutClick = () => {
    setShowLogoutDialog(true);
  };

  const confirmLogout = () => {
    localStorage.removeItem('cms_auth');
    setIsAuthenticated(false);
    setShowLogoutDialog(false);
    // Reset states
    setActiveTab('NEW');
    setWizardStep('SELECTION');
  };

  const cancelLogout = () => {
    setShowLogoutDialog(false);
  };

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
    setEditingRelease(null); 
  };

  const handleBackToSelection = () => {
    if (activeTab === 'ALL') {
        setEditingRelease(null);
        setWizardStep('SELECTION'); 
        return;
    }
    setWizardStep('SELECTION');
    setReleaseType(null);
  };

  const handleSaveRelease = (data: ReleaseData) => {
      if (data.id && allReleases.some(r => r.id === data.id)) {
          setAllReleases(prev => prev.map(r => r.id === data.id ? data : r));
      } else {
          setAllReleases(prev => [data, ...prev]);
      }
      setActiveTab('ALL'); 
      setViewingRelease(null);
  };

  const handleUpdateRelease = (updated: ReleaseData) => {
     setAllReleases(prev => prev.map(r => r.id === updated.id ? updated : r));
     if (viewingRelease && viewingRelease.id === updated.id) {
         setViewingRelease(updated);
     }
  };

  const handleViewDetails = (release: ReleaseData) => {
      setViewingRelease(release);
  };

  if (isAuthChecking) return null;

  if (!isAuthenticated) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  // Determine Page Title for Header
  const getPageTitle = () => {
      if (activeTab === 'NEW') return "Music Distribution";
      if (activeTab === 'ALL') return "Catalog Manager";
      if (activeTab === 'SETTINGS') return "System Settings";
      return "Dashboard";
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 font-sans">
      
      {/* Mobile Menu Button */}
      <button 
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md text-slate-700"
      >
        <Menu size={24} />
      </button>

      {/* Sidebar */}
      <div className={`
        fixed inset-0 z-40 transform transition-transform duration-300 md:relative md:translate-x-0 md:w-auto
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
         <Sidebar activeTab={activeTab} onNavigate={handleSidebarNavigate} />
         <div 
            className={`absolute inset-0 bg-black/50 -z-10 md:hidden ${isMobileMenuOpen ? 'block' : 'hidden'}`}
            onClick={() => setIsMobileMenuOpen(false)}
         ></div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 w-full md:ml-0 overflow-x-hidden min-h-screen flex flex-col relative">
        
        {/* GLOBAL HEADER */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-white/50 px-6 py-4 flex items-center justify-between shadow-sm">
            <h2 className="text-xl font-bold text-slate-800 tracking-tight hidden md:block">
                {getPageTitle()}
            </h2>
            <div className="flex-1 md:flex-none flex justify-end items-center gap-6">
                {/* Notifications */}
                <button className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors group">
                    <Bell size={20} />
                    <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                </button>

                {/* Profile Dropdown Simulation */}
                <div className="flex items-center gap-3 pl-6 border-l border-slate-200">
                    <div className="text-right hidden sm:block">
                        <div className="text-sm font-bold text-slate-800">Admin User</div>
                        <div className="text-[10px] text-slate-500 font-medium">Super Administrator</div>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                        <User size={20} />
                    </div>
                </div>

                {/* Logout Button */}
                <button 
                    onClick={handleLogoutClick}
                    className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl font-bold text-xs transition-colors ml-2"
                    title="Sign Out"
                >
                    <LogOut size={16} />
                    <span className="hidden sm:inline">Logout</span>
                </button>
            </div>
        </header>

        {/* CONTENT */}
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
                onUpdateRelease={handleUpdateRelease} 
                availableAggregators={aggregators}
            />
          )}

          {activeTab === 'ALL' && viewingRelease && (
            <ReleaseDetailModal 
                release={viewingRelease}
                isOpen={true} 
                onClose={() => setViewingRelease(null)}
                onUpdate={handleUpdateRelease}
                availableAggregators={aggregators}
            />
          )}

          {activeTab === 'SETTINGS' && (
            <Settings aggregators={aggregators} setAggregators={setAggregators} />
          )}
        </div>
        
        <Footer />
        
        {/* LOGOUT CONFIRMATION DIALOG */}
        {showLogoutDialog && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                {/* Backdrop */}
                <div 
                    className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
                    onClick={cancelLogout}
                ></div>
                
                {/* Dialog Card */}
                <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm relative z-10 animate-fade-in-up border border-white">
                    <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4 mx-auto">
                        <AlertTriangle size={24} />
                    </div>
                    
                    <h3 className="text-xl font-bold text-slate-800 text-center mb-2">Konfirmasi Logout</h3>
                    <p className="text-slate-500 text-center text-sm mb-8">
                        Apakah anda yakin ingin keluar dari aplikasi? Anda harus login kembali untuk mengakses data.
                    </p>
                    
                    <div className="flex gap-3">
                        <button 
                            onClick={cancelLogout}
                            className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors text-sm"
                        >
                            Batal
                        </button>
                        <button 
                            onClick={confirmLogout}
                            className="flex-1 px-4 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-lg shadow-red-500/30 transition-colors text-sm"
                        >
                            Ya, Keluar
                        </button>
                    </div>
                </div>
            </div>
        )}

      </main>
    </div>
  );
};

export default App;
