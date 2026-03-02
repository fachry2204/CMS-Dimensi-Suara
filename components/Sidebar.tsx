import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { PlusCircle, ListMusic, Music4, Settings, LayoutDashboard, BarChart3, ClipboardList, DollarSign, Upload, UserPlus, FileText, Library, PieChart, Users, Shield, User, MessageSquare, ChevronDown, ChevronRight } from 'lucide-react';

interface SidebarProps {
  currentUser: string;
  userRole?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentUser, userRole }) => {
  const [logo, setLogo] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    dashboard: true,
    aggregator: true,
    publishing: true,
    report: true,
    reportUser: true,
    system: true,
    dataSaya: true,
    bantuan: true
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  useEffect(() => {
      fetch('/api/settings/branding')
          .then(res => res.json())
          .then(data => {
              if (data.logo) setLogo(data.logo);
          })
          .catch(err => console.error("Failed to fetch branding:", err));
  }, []);

  const getLinkClass = (isActive: boolean) => 
    `w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group font-bold text-[13px] ${
      isActive
        ? 'bg-white text-black shadow-sm ring-1 ring-white/20'
        : 'text-white/80 hover:bg-white/10 hover:text-white'
    }`;

  const getIconClass = (isActive: boolean) =>
    isActive ? 'text-black' : 'text-white/70 group-hover:text-white';

  return (
    <aside className="w-64 bg-black backdrop-blur-xl border-r border-white/10 min-h-screen flex flex-col shadow-lg shadow-blue-900/5 transition-all duration-300 hidden md:flex sticky top-0">
      {/* Brand Logo */}
      <div className="min-h-[80px] h-auto py-4 flex flex-col items-center justify-center px-6 border-b border-white/10 flex-shrink-0">
        {logo ? (
            <img src={logo} alt="Logo" className="w-auto h-auto max-h-[150px] object-contain mb-2" />
        ) : (
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30 mb-2">
                <Music4 size={24} />
            </div>
        )}
        <div className="text-center">
            <span className="text-xs font-bold text-white block tracking-wide">Aggregator & Publishing</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-4 space-y-6 overflow-y-auto">
        
        {/* Dashboard Menu */}
        <div>
          <h3 
            className="px-4 text-[14px] font-semibold text-white/60 uppercase tracking-wider mb-3 flex items-center justify-between cursor-pointer hover:text-white transition-colors"
            onClick={() => toggleSection('dashboard')}
          >
            Dashboard
            {expandedSections.dashboard ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </h3>
          {expandedSections.dashboard && (
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
          )}
        </div>

        {/* Aggregator Menu */}
        <div>
          <h3 
            className="px-4 text-[14px] font-semibold text-white/60 uppercase tracking-wider mb-3 flex items-center justify-between cursor-pointer hover:text-white transition-colors"
            onClick={() => toggleSection('aggregator')}
          >
            Aggregator
            {expandedSections.aggregator ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </h3>
          {expandedSections.aggregator && (
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
          )}
        </div>

        {/* Publishing Menu */}
        <div>
          <h3 
            className="px-4 text-[14px] font-semibold text-white/60 uppercase tracking-wider mb-3 flex items-center justify-between cursor-pointer hover:text-white transition-colors"
            onClick={() => toggleSection('publishing')}
          >
            Publishing
            {expandedSections.publishing ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </h3>
          {expandedSections.publishing && (
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
          </ul>
          )}
        </div>

        {/* Report Section */}
        {userRole !== 'User' && (
        <div>
          <h3 
            className="px-4 text-[14px] font-semibold text-white/60 uppercase tracking-wider mb-3 flex items-center justify-between cursor-pointer hover:text-white transition-colors"
            onClick={() => toggleSection('report')}
          >
            Report
            {expandedSections.report ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </h3>
          {expandedSections.report && (
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
            <li>
              <NavLink to="/reports/payments" className={({ isActive }) => getLinkClass(isActive)}>
                {({ isActive }) => (
                  <>
                    <DollarSign size={20} className={getIconClass(isActive)} />
                    Pembayaran
                  </>
                )}
              </NavLink>
            </li>
          </ul>
          )}
        </div>
        )}
        {userRole === 'User' && (
        <div>
          <h3 
            className="px-4 text-[14px] font-semibold text-white/60 uppercase tracking-wider mb-3 flex items-center justify-between cursor-pointer hover:text-white transition-colors"
            onClick={() => toggleSection('reportUser')}
          >
            Report User
            {expandedSections.reportUser ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </h3>
          {expandedSections.reportUser && (
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
          )}
        </div>
        )}

        {/* System / Settings Section */}
        {userRole !== 'User' && (
        <div>
            <h3 
              className="px-4 text-[14px] font-bold text-white/60 uppercase tracking-wider mb-4 flex items-center justify-between cursor-pointer hover:text-white transition-colors"
              onClick={() => toggleSection('system')}
            >
              System
              {expandedSections.system ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </h3>
            {expandedSections.system && (
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
            )}
        </div>
        )}
        {userRole === 'User' && (
        <div>
          <h3 
            className="px-4 text-[14px] font-semibold text-white/60 uppercase tracking-wider mb-3 flex items-center justify-between cursor-pointer hover:text-white transition-colors"
            onClick={() => toggleSection('dataSaya')}
          >
            Data Saya
            {expandedSections.dataSaya ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </h3>
          {expandedSections.dataSaya && (
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
            )}
        </div>
        )}

        {/* Bantuan Section */}
        <div>
          <h3 
            className="px-4 text-[14px] font-bold text-white/60 uppercase tracking-wider mb-4 flex items-center justify-between cursor-pointer hover:text-white transition-colors"
            onClick={() => toggleSection('bantuan')}
          >
            Bantuan
            {expandedSections.bantuan ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </h3>
          {expandedSections.bantuan && (
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
          )}
        </div>
      </nav>
    </aside>
  );
};
