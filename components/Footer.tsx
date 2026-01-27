
import React from 'react';
import { LogOut } from 'lucide-react';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const appVersion = "1.0.0";

  return (
    <footer className="w-full py-6 px-8 border-t border-gray-200 bg-white/50 backdrop-blur-sm mt-auto">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="text-center md:text-left">
           <p className="text-sm font-bold text-slate-600">
               &copy; {currentYear} Dimensi Suara
           </p>
           <p className="text-xs text-slate-400 mt-0.5">
               CMS Version {appVersion}
           </p>
        </div>
        
        <button className="flex items-center gap-2 px-4 py-2 text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200 font-medium text-sm">
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </footer>
  );
};
