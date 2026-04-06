import React, { useState } from 'react';
import { Mail, MessageCircle, Layout } from 'lucide-react';
import EmailTemplates from './EmailTemplates';
import WhatsAppTemplates from './WhatsAppTemplates';

interface Props {
  token: string;
}

const TemplateGateway: React.FC<Props> = ({ token }) => {
  const [activeTab, setActiveTab] = useState<'whatsapp' | 'email'>('whatsapp');

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
          <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
            <Layout size={24} />
          </div>
          Template Gateway
        </h1>
        <p className="text-slate-500 mt-1">Kelola template pesan otomatis untuk WhatsApp dan Email.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-slate-100 p-1.5 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('whatsapp')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'whatsapp'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <MessageCircle size={18} />
          WhatsApp
        </button>
        <button
          onClick={() => setActiveTab('email')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'email'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Mail size={18} />
          Email
        </button>
      </div>

      {/* Tab Content */}
      <div className="animate-in fade-in duration-300">
        {activeTab === 'whatsapp' ? (
          <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden">
            <WhatsAppTemplates token={token} />
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden">
            <EmailTemplates token={token} />
          </div>
        )}
      </div>
    </div>
  );
};

export default TemplateGateway;
