import React from 'react';
import { NavLink } from 'react-router-dom';
import { PlusCircle, ListMusic, Music4, Settings, LayoutDashboard, BarChart3, ClipboardList, DollarSign, Upload, UserPlus, FileText, Library, PieChart, Users, Shield, User } from 'lucide-react';

interface SidebarProps {
  currentUser: string;
  userRole?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentUser, userRole }) => {
  const getLinkClass = (isActive: boolean) => 
    `w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group font-medium text-[13px] ${
      isActive
        ? 'bg-blue-50 text-blue-600 shadow-sm ring-1 ring-blue-100'
        : 'text-slate-600 hover:bg-gray-50 hover:text-slate-900'
    }`;

  const getIconClass = (isActive: boolean) =>
    isActive ? 'text-blue-500' : 'text-slate-400 group-hover:text-slate-600';

  return (
    <aside className="w-64 bg-white/80 backdrop-blur-xl border-r border-white/50 min-h-screen flex flex-col shadow-lg shadow-blue-900/5 transition-all duration-300 hidden md:flex sticky top-0">
      {/* Brand Logo */}
      <div className="h-20 flex items-center px-6 border-b border-gray-100 flex-shrink-0">
        <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center text-white mr-3 shadow-lg shadow-blue-500/30">
          <Music4 size={20} />
        </div>
        <span className="font-bold text-lg text-slate-800 tracking-tight">Dimensi Suara</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-4 space-y-6 overflow-y-auto">
        
        {/* Main Menu */}
        <div>
          <h3 className="px-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Menu Utama
          </h3>
          <ul className="space-y-2">
            <li>
              <NavLink to="/dashboard" className={({ isActive }) => getLinkClass(isActive)}>
                {({ isActive }) => (
                  <>
                    <LayoutDashboard size={20} className={getIconClass(isActive)} />
                    Dashboard
                  </>
                )}
              </NavLink>
            </li>
            <li>
              <NavLink to={userRole === 'User' ? "/my-releases" : "/releases"} className={({ isActive }) => getLinkClass(isActive)}>
                {({ isActive }) => (
                  <>
                    <ListMusic size={20} className={getIconClass(isActive)} />
                    {userRole === 'User' ? 'My Releases' : 'All Release'}
                  </>
                )}
              </NavLink>
            </li>
          </ul>
        </div>

        {/* Report Section */}
        {userRole !== 'User' && (
        <div>
          <h3 className="px-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Report
          </h3>
          <ul className="space-y-2">
            <li>
              <NavLink to="/statistics" className={({ isActive }) => getLinkClass(isActive)}>
                {({ isActive }) => (
                  <>
                    <BarChart3 size={20} className={getIconClass(isActive)} />
                    Statistik
                  </>
                )}
              </NavLink>
            </li>
            <li>
              <NavLink to="/reports" className={({ isActive }) => getLinkClass(isActive)}>
                 {({ isActive }) => (
                  <>
                    <ClipboardList size={20} className={getIconClass(isActive)} />
                    Laporan
                  </>
                )}
              </NavLink>
            </li>
             <li>
              <NavLink to="/revenue" className={({ isActive }) => getLinkClass(isActive)}>
                {({ isActive }) => (
                  <>
                    <DollarSign size={20} className={getIconClass(isActive)} />
                    Pendapatan
                  </>
                )}
              </NavLink>
            </li>
            <li>
              <NavLink to="/import-reports" className={({ isActive }) => getLinkClass(isActive)}>
                {({ isActive }) => (
                  <>
                    <Upload size={20} className={getIconClass(isActive)} />
                    Import Laporan
                  </>
                )}
              </NavLink>
            </li>
          </ul>
        </div>
        )}
        {userRole === 'User' && (
        <div>
          <h3 className="px-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Report User
          </h3>
          <ul className="space-y-2">
            <li>
              <NavLink to="/user/reports/analytics" className={({ isActive }) => getLinkClass(isActive)}>
                {({ isActive }) => (
                  <>
                    <BarChart3 size={20} className={getIconClass(isActive)} />
                    Analitik
                  </>
                )}
              </NavLink>
            </li>
            <li>
              <NavLink to="/user/reports/payments" className={({ isActive }) => getLinkClass(isActive)}>
                {({ isActive }) => (
                  <>
                    <DollarSign size={20} className={getIconClass(isActive)} />
                    Pembayaran
                  </>
                )}
              </NavLink>
            </li>
          </ul>
        </div>
        )}

        {/* Publishing Category - ONLY FOR 'fachry' */}
        {/* {currentUser === 'fachry' && (
          <div className="animate-fade-in">
            <h3 className="px-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Publishing
            </h3>
            <ul className="space-y-2">
              <li>
                <NavLink to="/publishing/writer" className={({ isActive }) => getLinkClass(isActive)}>
                  {({ isActive }) => (
                    <>
                      <UserPlus size={20} className={getIconClass(isActive)} />
                      Add Song Writer
                    </>
                  )}
                </NavLink>
              </li>
               <li>
                <NavLink to="/publishing/add" className={({ isActive }) => getLinkClass(isActive)}>
                   {({ isActive }) => (
                    <>
                      <FileText size={20} className={getIconClass(isActive)} />
                      Add Publishing
                    </>
                  )}
                </NavLink>
              </li>
              <li>
                <NavLink to="/publishing/all" className={({ isActive }) => getLinkClass(isActive)}>
                  {({ isActive }) => (
                    <>
                      <Library size={20} className={getIconClass(isActive)} />
                      All Publishing
                    </>
                  )}
                </NavLink>
              </li>
              <li>
                <NavLink to="/publishing/report" className={({ isActive }) => getLinkClass(isActive)}>
                  {({ isActive }) => (
                    <>
                      <PieChart size={20} className={getIconClass(isActive)} />
                      Report Publishing
                    </>
                  )}
                </NavLink>
              </li>
            </ul>
          </div>
        )} */}

        {/* System / Settings Section */}
        {userRole !== 'User' && (
        <div>
            <h3 className="px-4 text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
              System
            </h3>
            <ul className="space-y-2">
            <li>
              <NavLink to="/settings" className={({ isActive }) => getLinkClass(isActive)}>
                {({ isActive }) => (
                  <>
                    <Settings size={20} className={getIconClass(isActive)} />
                    Settings
                  </>
                )}
              </NavLink>
            </li>
            {(userRole === 'Admin' || userRole === 'Operator') && (
            <li>
              <NavLink to="/users" className={({ isActive }) => getLinkClass(isActive)}>
                {({ isActive }) => (
                  <>
                    <Users size={20} className={getIconClass(isActive)} />
                    User Management
                  </>
                )}
              </NavLink>
            </li>
            )}
            {(userRole === 'Admin' || userRole === 'Operator') && (
            <li>
              <NavLink to="/roles/user" className={({ isActive }) => getLinkClass(isActive)}>
                {({ isActive }) => (
                  <>
                    <Shield size={20} className={getIconClass(isActive)} />
                    Role User
                  </>
                )}
              </NavLink>
            </li>
            )}
          </ul>
        </div>
        )}
        {userRole === 'User' && (
        <div>
            <h3 className="px-4 text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
              Data Saya
            </h3>
            <ul className="space-y-2">
            <li>
              <NavLink to="/me/profile" className={({ isActive }) => getLinkClass(isActive)}>
                {({ isActive }) => (
                  <>
                    <User size={20} className={getIconClass(isActive)} />
                    Profile
                  </>
                )}
              </NavLink>
            </li>
            <li>
              <NavLink to="/me/contracts" className={({ isActive }) => getLinkClass(isActive)}>
                {({ isActive }) => (
                  <>
                    <FileText size={20} className={getIconClass(isActive)} />
                    Kontrak
                  </>
                )}
              </NavLink>
            </li>
            </ul>
        </div>
        )}
      </nav>
    </aside>
  );
};
