'use client';

import { LayoutDashboard, List, Settings, BarChart2, Calculator, Plus } from 'lucide-react';
import { Translations } from '@/lib/translations';

export type NavTab = 'dashboard' | 'transactions' | 'reports' | 'pricing' | 'settings';

interface NavBarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  tr: Translations;
  /** Opens the add-transaction form. Lives in the nav so it is on every tab and never floats over list content. */
  onAdd?: () => void;
}

export default function NavBar({ activeTab, onTabChange, tr, onAdd }: NavBarProps) {
  const tabs: { id: NavTab; icon: React.ReactNode; label: string }[] = [
    { id: 'dashboard', icon: <LayoutDashboard className="w-5 h-5" />, label: tr.navDashboard },
    { id: 'transactions', icon: <List className="w-5 h-5" />, label: tr.navTransactions },
    { id: 'reports', icon: <BarChart2 className="w-5 h-5" />, label: tr.navReports },
    { id: 'pricing', icon: <Calculator className="w-5 h-5" />, label: tr.navPricing },
    { id: 'settings', icon: <Settings className="w-5 h-5" />, label: tr.navSettings },
  ];

  return (
    // Mobile/tablet (below lg): bottom tab bar, as before. Desktop (lg+):
    // becomes a persistent left (or right, in RTL) sidebar under the
    // header instead — a bottom tab strip centered in a sea of empty
    // space is the single biggest "this wasn't built for a big screen"
    // tell, so this is the highest-value fix in the responsive pass.
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-100 shadow-[0_-1px_20px_rgba(0,0,0,0.06)] lg:top-14 lg:bottom-0 lg:right-auto lg:w-60 lg:border-t-0 lg:border-r lg:shadow-none lg:rtl:right-0 lg:rtl:left-auto lg:rtl:border-r-0 lg:rtl:border-l lg:flex lg:flex-col">
      <div className="max-w-2xl mx-auto px-2 flex items-stretch h-16 lg:max-w-none lg:flex-col lg:items-stretch lg:h-auto lg:px-3 lg:py-4 lg:gap-1 lg:flex-1">
        {/* Desktop: a full-width action at the top of the sidebar */}
        {onAdd && (
          <button
            onClick={onAdd}
            className="hidden lg:flex items-center justify-center mb-2 px-3 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-bold shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 active:scale-[0.98] transition-all"
          >
            {tr.addTransaction}
          </button>
        )}
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            aria-current={activeTab === tab.id ? 'page' : undefined}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-all duration-150 rounded-xl mx-0.5 my-1 lg:flex-none lg:flex-row lg:justify-start lg:gap-3 lg:mx-0 lg:my-0 lg:px-3 lg:py-2.5 ${
              activeTab === tab.id
                ? 'text-emerald-600 bg-emerald-50'
                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span className={`transition-transform duration-150 ${activeTab === tab.id ? 'scale-110' : 'lg:scale-100'}`}>
              {tab.icon}
            </span>
            <span className="text-[10px] font-semibold lg:text-sm">{tab.label}</span>
          </button>
        ))}
        {/* Mobile: a compact action at the end of the bar, same thumb side the old floating button used */}
        {onAdd && (
          <button
            onClick={onAdd}
            aria-label={tr.addTransaction}
            className="lg:hidden flex-none self-center w-12 h-12 mx-1.5 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/40 active:scale-95 transition-all flex items-center justify-center"
          >
            <Plus className="w-6 h-6" strokeWidth={2.5} />
          </button>
        )}
      </div>
    </nav>
  );
}
