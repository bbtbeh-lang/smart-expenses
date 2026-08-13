'use client';

import { LayoutDashboard, List, Settings, BarChart2, Calculator } from 'lucide-react';
import { Translations } from '@/lib/translations';
import { Lang } from '@/lib/types';

export type NavTab = 'dashboard' | 'transactions' | 'reports' | 'pricing' | 'settings';

const LANGS: Lang[] = ['EN', 'FR', 'FA'];
const LANG_NAMES: Record<Lang, string> = { EN: 'English', FR: 'Français', FA: 'فارسی' };

interface NavBarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  tr: Translations;
  // Desktop-only: rendered at the bottom of the sidebar instead of
  // cluttering the top header once there's room for them here. Optional
  // so NavBar still works if a caller doesn't need this (e.g. tests).
  lang?: Lang;
  onLangToggle?: (lang: Lang) => void;
  onLogout?: () => void;
  isLoggedIn?: boolean;
}

export default function NavBar({ activeTab, onTabChange, tr, lang, onLangToggle, onLogout, isLoggedIn }: NavBarProps) {
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
      </div>

      {/* Desktop-only: language switcher + logout, moved out of the top
          header where they used to compete for space with the app name
          and the Personal/Business switch. */}
      {(onLangToggle || onLogout) && (
        <div className="hidden lg:block border-t border-slate-100 px-3 py-3 space-y-2">
          {onLangToggle && lang && (
            <div className="flex items-center bg-slate-100 rounded-full p-1 gap-0.5" dir="ltr">
              {LANGS.map(l => (
                <button
                  key={l}
                  onClick={() => onLangToggle(l)}
                  aria-label={LANG_NAMES[l]}
                  className={`flex-1 text-xs font-semibold px-2 py-1.5 rounded-full transition-all duration-150 ${
                    lang === l ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          )}
          {isLoggedIn && onLogout && (
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-rose-500 bg-slate-100 hover:bg-rose-50 px-3 py-2 rounded-xl transition-all duration-150"
            >
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              {tr.logout}
            </button>
          )}
        </div>
      )}
    </nav>
  );
}
