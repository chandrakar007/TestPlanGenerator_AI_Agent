import React from 'react';

interface TabsNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const TabsNav: React.FC<TabsNavProps> = ({ activeTab, setActiveTab }) => {
  return (
    <div className="flex space-x-4 border-b border-slate-200 mb-6">
      <button 
        onClick={() => setActiveTab('generate')}
        className={`py-2 px-4 font-semibold text-sm border-b-2 transition-colors ${activeTab === 'generate' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
        Generate Plan
      </button>
      <button 
        onClick={() => setActiveTab('settings')}
        className={`py-2 px-4 font-semibold text-sm border-b-2 transition-colors ${activeTab === 'settings' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
        Configuration
      </button>
      <button 
        onClick={() => setActiveTab('history')}
        className={`py-2 px-4 font-semibold text-sm border-b-2 transition-colors ${activeTab === 'history' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
        History
      </button>
    </div>
  );
};
