'use client';

import { Zap, Home, Briefcase, LogOut } from 'lucide-react';
import { Translations } from '@/lib/translations';
import { Lang, AccountType } from '@/lib/types';

interface HeaderProps {
  lang: Lang;
  tr: Translations;
  onLangToggle: (lang: Lang) => void;
  onLogout: () => void;
  isLoggedIn: boolean;
  accountType?: AccountType | null;
  onChangeAccountType?: (type: AccountType) => void;
  showAccountTypeSwitch?: boolean;
}

const LANGS: Lang[] = ['EN', 'FR', 'FA'];
const LANG_NAMES: Record<Lang, string> = { EN: 'English', FR: 'Français', FA: 'فارسی' };

export default function Header({ lang, tr, onLangToggle, onLogout, isLoggedIn, accountType, onChangeAccountType, showAccountTypeSwitch }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-100 shadow-sm">
      <div className="max-w-2xl lg:max-w-none mx-auto px-4 lg:px-6 h-14 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
            <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-[15px] font-bold text-slate-900 tracking-tight hidden sm:inline">{tr.appName}</span>
        </div>

        {/* Global Personal/Business switch — controls which transactions,
            totals, and charts are shown everywhere in the app. */}
        {showAccountTypeSwitch && onChangeAccountType && (
          <div className="flex items-center bg-slate-100 rounded-full p-1 gap-0.5 shrink-0" role="group" aria-label={tr.settingsAccountType}>
            {(['personal', 'business'] as AccountType[]).map(opt => (
              <button
                key={opt}
                onClick={() => onChangeAccountType(opt)}
                aria-label={opt === 'business' ? tr.business : tr.personal}
                className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full transition-all duration-150 ${
                  (accountType || 'personal') === opt ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {opt === 'business' ? <Briefcase className="w-3 h-3" /> : <Home className="w-3 h-3" />}
                <span className="hidden sm:inline">{opt === 'business' ? tr.business : tr.personal}</span>
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center bg-slate-100 rounded-full p-1 gap-0.5" dir="ltr" role="group" aria-label={tr.langSwitcherLabel}>
            {LANGS.map(l => (
              <button
                key={l}
                onClick={() => onLangToggle(l)}
                aria-label={LANG_NAMES[l]}
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
              className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-rose-500 bg-slate-100 hover:bg-rose-50 px-3 py-1.5 rounded-full transition-all duration-150 lg:hidden"
            >
              <LogOut className="w-3.5 h-3.5" />
              {tr.logout}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
