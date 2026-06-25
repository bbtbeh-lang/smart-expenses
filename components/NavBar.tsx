'use client';

import { LayoutDashboard, List, Settings } from 'lucide-react';
import { Translations } from '@/lib/translations';

export type NavTab = 'dashboard' | 'transactions' | 'settings';

interface NavBarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  tr: Translations;
}

export default function NavBar({ activeTab, onTabChange, tr }: NavBarProps) {
  const tabs: { id: NavTab; icon: React.ReactNode; label: string }[] = [
    { id: 'dashboard', icon: <LayoutDashboard className="w-5 h-5" />, label: tr.navDashboard },
    { id: 'transactions', icon: <List className="w-5 h-5" />, label: tr.navTransactions },
    { id: 'settings', icon: <Settings className="w-5 h-5" />, label: tr.navSettings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-100 shadow-[0_-1px_20px_rgba(0,0,0,0.06)]">
      <div className="max-w-2xl mx-auto px-2 flex items-stretch h-16">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-all duration-150 rounded-xl mx-0.5 my-1 ${
              activeTab === tab.id
                ? 'text-emerald-600 bg-emerald-50'
                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span className={`transition-transform duration-150 ${activeTab === tab.id ? 'scale-110' : ''}`}>
              {tab.icon}
            </span>
            <span className="text-[10px] font-semibold">{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
