
import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Footer } from './components/Footer';
import { ReleaseTypeSelection } from './screens/ReleaseTypeSelection';
import { ReleaseWizard } from './screens/ReleaseWizard';
import { AllReleases } from './screens/AllReleases';
import { Dashboard } from './screens/Dashboard'; 
import { Statistics } from './screens/Statistics'; 
import { Publishing } from './screens/Publishing'; // Import Publishing
import { Settings } from './screens/Settings';
import { UserManagement } from './screens/UserManagement';
import { ReportScreen } from './screens/ReportScreen';
import { RevenueScreen } from './screens/RevenueScreen';
import { LoginScreen } from './screens/LoginScreen'; 
import { ReleaseDetailModal } from './components/ReleaseDetailModal';
import { ProfileModal } from './components/ProfileModal';
import { ReleaseType, ReleaseData, SavedSongwriter, PublishingRegistration, ReportData, Notification } from './types';
import { Menu, Bell, User, LogOut, ChevronDown, AlertTriangle, CheckCircle, Info, X } from 'lucide-react';
import { generateSongwriters, generatePublishing, generateReleases } from './utils/dummyData';
import { api, API_BASE_URL } from './utils/api';

const App: React.FC = () => {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
  const [currentUser, setCurrentUser] = useState<string>('');
  const [currentUserData, setCurrentUserData] = useState<any>(null);
  const [token, setToken] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('');
  
  // Notification State
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  
  // Profile Modal State
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);

  // Logout Confirmation State
  const [showLogoutDialog, setShowLogoutDialog] = useState<boolean>(false);

  // Sidebar State (Expanded to include publishing sub-tabs)
  const [activeTab, setActiveTab] = useState<string>('DASHBOARD');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Global App State with GENERATED DATA (50+)
  const [savedSongwriters, setSavedSongwriters] = useState<SavedSongwriter[]>([]);
  const [allPublishing, setAllPublishing] = useState<PublishingRegistration[]>([]);
  const [allReleases, setAllReleases] = useState<ReleaseData[]>([]);
  
  // IMPORTED REPORT DATA STATE
  const [reportData, setReportData] = useState<ReportData[]>([]);

  const [aggregators, setAggregators] = useState<string[]>(["LokaMusik", "SoundOn", "Tunecore", "Believe"]);
  
  // Initialize Data
  useEffect(() => {
    const fetchData = async () => {
        if (!token) return;

        try {
            // 1. Fetch Releases
            const releases = await api.getReleases(token);
            setAllReleases(releases);
            
            // 2. Fetch Reports
            const reports = await api.getReports(token);
            setReportData(reports);

            // 3. Fetch Songwriters
            const writers = await api.getSongwriters(token);
            setSavedSongwriters(writers);

            // 4. Fetch Publishing Registrations
            const pubs = await api.getPublishing(token);
            setAllPublishing(pubs);

            // 5. Fetch Aggregators
            try {
                const aggs = await api.getAggregators(token);
                if (aggs && Array.isArray(aggs) && aggs.length > 0) {
                    setAggregators(aggs);
                }
            } catch (aggErr) {
                console.warn("Failed to fetch aggregators, using defaults", aggErr);
            }

        } catch (err) {
            console.error("Failed to fetch data from API, falling back to local data:", err);
            setSavedSongwriters(generateSongwriters(60));
            setAllPublishing(generatePublishing(70, generateSongwriters(60)));
            setAllReleases(generateReleases(55));
        }
    };

    if (isAuthenticated) {
        fetchData();
    }
  }, [isAuthenticated, token]);

  // Fetch Notifications & User Profile
  useEffect(() => {
    if (isAuthenticated && token) {
        // Fetch Profile
        api.getProfile(token).then(user => {
            setCurrentUserData(user);
            // Sync role from DB to State/LocalStorage
            if (user.role && user.role !== userRole) {
                setUserRole(user.role);
                localStorage.setItem('cms_role', user.role);
            }
        }).catch(err => console.error("Failed to fetch profile", err));

        // Fetch Notifications
        const fetchNotifications = async () => {
             try {
                 const notifs = await api.getNotifications(token);
                 setNotifications(notifs);
                 setUnreadCount(notifs.filter((n: any) => !n.is_read).length);
             } catch (err) {
                 console.error("Failed to fetch notifications", err);
             }
        };
        fetchNotifications();
        
        // Poll for notifications every 30 seconds
        const interval = setInterval(fetchNotifications, 30000); 
        return () => clearInterval(interval);
    }
  }, [isAuthenticated, token]);

  const handleNotificationClick = async (notif: Notification) => {
    if (!notif.is_read) {
        try {
            await api.markNotificationRead(token, notif.id);
            setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            console.error("Failed to mark notification read", err);
        }
    }
  };

  const handleUpdateUser = (updatedUser: any) => {
    setCurrentUserData(updatedUser);
    setCurrentUser(updatedUser.username); 
    localStorage.setItem('cms_user', updatedUser.username);
  };

  // Wizard State
  const [wizardStep, setWizardStep] = useState<'SELECTION' | 'WIZARD'>('SELECTION');
  const [releaseType, setReleaseType] = useState<ReleaseType | null>(null);
  
  // Detail/Edit State
  const [editingRelease, setEditingRelease] = useState<ReleaseData | null>(null); 
  const [viewingRelease, setViewingRelease] = useState<ReleaseData | null>(null); 

  // Check LocalStorage on Mount
  useEffect(() => {
    const storedAuth = localStorage.getItem('cms_auth');
    const storedUser = localStorage.getItem('cms_user');
    const storedToken = localStorage.getItem('cms_token');
    const storedRole = localStorage.getItem('cms_role');
    
    if (storedAuth === 'true') {
      setIsAuthenticated(true);
      if (storedUser) setCurrentUser(storedUser);
      if (storedToken) setToken(storedToken);
      if (storedRole) setUserRole(storedRole);
    }
    setIsAuthChecking(false);
  }, []);

  const handleLogin = (user: any, token: string) => {
    localStorage.setItem('cms_auth', 'true');
    localStorage.setItem('cms_user', user.username);
    localStorage.setItem('cms_token', token);
    localStorage.setItem('cms_role', user.role || 'User');
    setCurrentUser(user.username);
    setToken(token);
    setUserRole(user.role || 'User');
    setIsAuthenticated(true);
  };

  const handleLogoutClick = () => {
    setShowLogoutDialog(true);
  };

  const confirmLogout = () => {
    localStorage.removeItem('cms_auth');
    localStorage.removeItem('cms_user');
    localStorage.removeItem('cms_token');
    localStorage.removeItem('cms_role');
    setIsAuthenticated(false);
    setCurrentUser('');
    setToken('');
    setUserRole('');
    setShowLogoutDialog(false);
    // Reset states
    setActiveTab('DASHBOARD');
    setWizardStep('SELECTION');
  };

  const cancelLogout = () => {
    setShowLogoutDialog(false);
  };

  const handleSidebarNavigate = (tab: string) => {
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

  const handleSaveRelease = async (data: ReleaseData) => {
      try {
          if (data.id && allReleases.some(r => r.id === data.id)) {
              // Update Logic (Local for now, API update to be implemented)
              setAllReleases(prev => prev.map(r => r.id === data.id ? data : r));
          } else {
              // Create New Release via API
              if (isAuthenticated && token) {
                  const response = await api.createRelease(token, data);
                  // Merge response ID with data
                  const newRelease = { 
                      ...data, 
                      id: response.id, 
                      status: 'Pending', 
                      submissionDate: new Date().toISOString() 
                  };
                  setAllReleases(prev => [newRelease, ...prev]);
              } else {
                  // Fallback for offline/demo mode
                  setAllReleases(prev => [data, ...prev]);
              }
          }
          setActiveTab('ALL'); 
          setViewingRelease(null);
      } catch (err: any) {
          console.error("Failed to save release:", err);
          alert(`Failed to save release: ${err.message || 'Unknown error'}`);
      }
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

  const handleSaveAggregators = async (newList: string[]) => {
      setAggregators(newList);
      if (token) {
          try {
              await api.updateAggregators(token, newList);
          } catch (err) {
              console.error("Failed to save aggregators:", err);
              // Optionally revert state or show notification
          }
      }
  };

  if (isAuthChecking) return null;

  if (!isAuthenticated) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  // Determine Page Title for Header
  const getPageTitle = () => {
      if (activeTab === 'DASHBOARD') return "Overview";
      if (activeTab === 'NEW') return "Music Distribution";
      if (activeTab === 'ALL') return "Catalog Manager";
      if (activeTab === 'SETTINGS') return "System Settings";
      if (activeTab === 'USER_MANAGEMENT') return "User Management";
      if (activeTab === 'REPORT_MAIN') return "Laporan";
      if (activeTab === 'IMPORT_REPORT') return "Import Laporan";
      if (activeTab === 'REVENUE') return "Pendapatan";
      if (activeTab === 'STATISTICS') return "Analytics & Reports";
      if (activeTab === 'PUBLISHING_ADD') return "Publishing / Registration";
      if (activeTab === 'PUBLISHING_WRITER') return "Publishing / Songwriters";
      if (activeTab === 'PUBLISHING_ALL') return "Publishing / All Submissions";
      if (activeTab === 'PUBLISHING_REPORT') return "Publishing / Reports";
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
         <Sidebar activeTab={activeTab} onNavigate={handleSidebarNavigate} currentUser={currentUser} userRole={userRole} />
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
                <div className="relative">
                    <button 
                        className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors group"
                        onClick={() => setShowNotifications(!showNotifications)}
                    >
                        <Bell size={20} />
                        {unreadCount > 0 && (
                            <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full border border-white text-[10px] flex items-center justify-center text-white font-bold">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </button>

                    {/* Notification Dropdown */}
                    {showNotifications && (
                        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <h3 className="font-bold text-slate-800 text-sm">Notifications</h3>
                                <button 
                                    onClick={() => setShowNotifications(false)}
                                    className="text-slate-400 hover:text-slate-600"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                            <div className="max-h-[400px] overflow-y-auto">
                                {notifications.length === 0 ? (
                                    <div className="p-8 text-center text-slate-400 text-sm">
                                        <Bell size={32} className="mx-auto mb-3 opacity-20" />
                                        No notifications yet
                                    </div>
                                ) : (
                                    notifications.map(notif => (
                                        <div 
                                            key={notif.id}
                                            onClick={() => handleNotificationClick(notif)}
                                            className={`p-4 border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors flex gap-3 ${!notif.is_read ? 'bg-blue-50/50' : ''}`}
                                        >
                                            <div className={`mt-1 flex-shrink-0 ${!notif.is_read ? 'text-blue-500' : 'text-slate-400'}`}>
                                                {notif.type === 'RELEASE_STATUS' ? <CheckCircle size={16} /> : <Info size={16} />}
                                            </div>
                                            <div>
                                                <p className={`text-sm ${!notif.is_read ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>
                                                    {notif.message}
                                                </p>
                                                <span className="text-[10px] text-slate-400 mt-1 block">
                                                    {new Date(notif.created_at).toLocaleString()}
                                                </span>
                                            </div>
                                            {!notif.is_read && (
                                                <div className="flex-shrink-0 self-center">
                                                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Profile Dropdown */}
                <div 
                    className="flex items-center gap-3 pl-6 border-l border-slate-200 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => setShowProfileModal(true)}
                >
                    <div className="text-right hidden sm:block">
                        <div className="text-sm font-bold text-slate-800 capitalize">{currentUser}</div>
                        <div className="text-[10px] text-slate-500 font-medium">
                            {userRole === 'Admin' ? 'Super Administrator' : (userRole === 'Operator' ? 'Content Manager' : 'Artist / Label')}
                        </div>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 overflow-hidden relative">
                        {currentUserData?.profile_picture ? (
                            <img 
                                src={`${API_BASE_URL.replace('/api', '')}${currentUserData.profile_picture}`} 
                                alt={currentUser} 
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    // Fallback if image load fails
                                    (e.target as HTMLImageElement).style.display = 'none';
                                    (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                }}
                            />
                        ) : null}
                         <div className={`absolute inset-0 flex items-center justify-center ${currentUserData?.profile_picture ? 'hidden' : ''}`}>
                            <User size={20} />
                        </div>
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
          {activeTab === 'DASHBOARD' && (
            <Dashboard 
                releases={allReleases}
                onViewRelease={handleViewDetails}
                onNavigateToAll={() => setActiveTab('ALL')}
            />
          )}

          {activeTab === 'STATISTICS' && (
            <Statistics releases={allReleases} reportData={reportData} />
          )}

          {activeTab.startsWith('PUBLISHING') && currentUser === 'fachry' && (
            <Publishing 
                activeTab={activeTab} 
                savedSongwriters={savedSongwriters}
                setSavedSongwriters={setSavedSongwriters}
                allPublishing={allPublishing}
                setAllPublishing={setAllPublishing}
                token={token}
            />
          )}

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

          {/* SHARED MODAL FOR VIEWING DETAILS (Works for both Dashboard & All Releases) */}
          {viewingRelease && (
            <ReleaseDetailModal 
                release={viewingRelease}
                isOpen={true} 
                onClose={() => setViewingRelease(null)}
                onUpdate={handleUpdateRelease}
                availableAggregators={aggregators}
            />
          )}

          {activeTab === 'SETTINGS' && (
            <Settings aggregators={aggregators} setAggregators={handleSaveAggregators} />
          )}

          {activeTab === 'USER_MANAGEMENT' && (
            <UserManagement />
          )}

          {activeTab === 'REPORT_MAIN' && (
            <ReportScreen 
              onImport={(data) => setReportData(data)} 
              data={reportData}
              releases={allReleases}
              aggregators={aggregators}
              mode="view"
            />
          )}

          {activeTab === 'IMPORT_REPORT' && (
            <ReportScreen 
              onImport={(data) => setReportData(data)} 
              data={reportData}
              releases={allReleases}
              aggregators={aggregators}
              mode="import"
            />
          )}

          {activeTab === 'REVENUE' && (
            <RevenueScreen data={reportData} />
          )}
        </div>
        
        <Footer />
        
        {/* PROFILE MODAL */}
        <ProfileModal 
            isOpen={showProfileModal}
            onClose={() => setShowProfileModal(false)}
            token={token}
            onUpdateUser={handleUpdateUser}
        />

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
