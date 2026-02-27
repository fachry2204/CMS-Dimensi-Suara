import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { PlusCircle, ListMusic, Music4, Settings, LayoutDashboard, BarChart3, ClipboardList, DollarSign, Upload, UserPlus, FileText, Library, PieChart, Users, Shield, User, MessageSquare } from 'lucide-react';

interface SidebarProps {
  currentUser: string;
  userRole?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentUser, userRole }) => {
  const [logo, setLogo] = useState<string | null>(null);

  useEffect(() => {
      fetch('/api/settings/branding')
          .then(res => res.json())
          .then(data => {
              if (data.logo) setLogo(data.logo);
          })
          .catch(err => console.error("Failed to fetch branding:", err));
  }, []);

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
        {logo ? (
            <img src={logo} alt="Logo" className="h-10 object-contain mr-3" />
        ) : (
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center text-white mr-3 shadow-lg shadow-blue-500/30">
                <Music4 size={20} />
            </div>
        )}
        <span className="font-bold text-lg text-slate-800 tracking-tight">Aggregator Musik</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-4 space-y-6 overflow-y-auto">
        
        {/* Dashboard Menu */}
        <div>
          <h3 className="px-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Dashboard
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
          </ul>
        </div>

        {/* Aggregator Menu */}
        <div>
          <h3 className="px-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Aggregator
          </h3>
          <ul className="space-y-2">
            <li>
              <NavLink to="/aggregator" className={({ isActive }) => getLinkClass(isActive)}>
                {({ isActive }) => (
                  <>
                    <BarChart3 size={20} className={getIconClass(isActive)} />
                    Aggregator
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

        {/* Publishing Menu */}
        <div>
          <h3 className="px-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Publishing
          </h3>
          <ul className="space-y-2">
            <li>
              <NavLink to="/publishing/writer" className={({ isActive }) => getLinkClass(isActive)}>
                {({ isActive }) => (
                  <>
                    <UserPlus size={20} className={getIconClass(isActive)} />
                    Data Pencipta
                  </>
                )}
              </NavLink>
            </li>
             <li>
              <NavLink to="/publishing/songs" className={({ isActive }) => getLinkClass(isActive)}>
                 {({ isActive }) => (
                  <>
                    <ListMusic size={20} className={getIconClass(isActive)} />
                    Data Lagu
                  </>
                )}
              </NavLink>
            </li>
            {userRole !== 'User' && (
            <li>
              <NavLink to="/publishing/analytics" className={({ isActive }) => getLinkClass(isActive)}>
                {({ isActive }) => (
                  <>
                    <BarChart3 size={20} className={getIconClass(isActive)} />
                    Analitik
                  </>
                )}
              </NavLink>
            </li>
            )}
            {userRole !== 'User' && (
            <li>
              <NavLink to="/publishing/reports" className={({ isActive }) => getLinkClass(isActive)}>
                {({ isActive }) => (
                  <>
                    <ClipboardList size={20} className={getIconClass(isActive)} />
                    Report
                  </>
                )}
              </NavLink>
            </li>
            )}
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
                    statistik
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

        {/* Support Section */}
        <div>
          <h3 className="px-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Bantuan
          </h3>
          <ul className="space-y-2">
            <li>
              <NavLink to="/tickets" className={({ isActive }) => getLinkClass(isActive)}>
                {({ isActive }) => (
                  <>
                    <MessageSquare size={20} className={getIconClass(isActive)} />
                    Tiket Bantuan
                  </>
                )}
              </NavLink>
            </li>
          </ul>
        </div>
      </nav>
    </aside>
  );
};
