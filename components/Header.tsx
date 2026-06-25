'use client';

import { Zap } from 'lucide-react';
import { Translations } from '@/lib/translations';
import { Lang } from '@/lib/types';

interface HeaderProps {
  lang: Lang;
  tr: Translations;
  onLangToggle: (lang: Lang) => void;
  onLogout: () => void;
  isLoggedIn: boolean;
}

const LANGS: Lang[] = ['EN', 'FR', 'FA'];

export default function Header({ lang, tr, onLangToggle, onLogout, isLoggedIn }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-100 shadow-sm">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
            <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-[15px] font-bold text-slate-900 tracking-tight">{tr.appName}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Language switcher — always LTR */}
          <div className="flex items-center bg-slate-100 rounded-full p-1 gap-0.5" dir="ltr">
            {LANGS.map((l, i) => (
              <button
                key={l}
                onClick={() => onLangToggle(l)}
                className={`text-xs font-semibold px-2.5 py-1 rounded-full transition-all duration-150 ${
                  lang === l
                    ? 'bg-white text-emerald-600 shadow-sm'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {l}
              </button>
            ))}
          </div>

          {isLoggedIn && (
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-rose-500 bg-slate-100 hover:bg-rose-50 px-3 py-1.5 rounded-full transition-all duration-150"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              {tr.logout}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
