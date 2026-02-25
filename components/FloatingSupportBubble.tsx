import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';

export const FloatingSupportBubble: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div 
            onClick={() => navigate('/tickets')}
            className="fixed bottom-6 right-6 z-50 bg-white shadow-lg border border-gray-200 rounded-full px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition-all hover:scale-105 group"
        >
            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <MessageCircle size={20} />
            </div>
            <div className="flex flex-col">
                <span className="text-xs text-gray-900 leading-tight">Ticket Support</span>
                <span className="text-[10px] text-gray-500 leading-tight group-hover:text-indigo-600">Click Here</span>
            </div>
        </div>
    );
};
