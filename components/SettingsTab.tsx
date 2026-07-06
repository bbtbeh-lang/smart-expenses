'use client';

import { useState, useEffect } from 'react';
import { User, Globe, Bell, Shield, ChevronRight, Moon, Sun, Smartphone } from 'lucide-react';
import { Translations } from '@/lib/translations';
import { AppState, Lang } from '@/lib/types';
import { supabase } from '@/lib/supabase';

interface SettingsTabProps {
  state: AppState;
  tr: Translations;
  onLogout: () => void;
  onOpenUpgrade: () => void;
  onOpenPlanManager: () => void;
  onLangToggle: (lang: Lang) => void;
  onDeleteAccount: () => Promise<void>;
}

const LANGS: { id: Lang; native: string; flag: string }[] = [
  { id: 'EN', native: 'English', flag: '🇨🇦' },
  { id: 'FR', native: 'Français', flag: '🇫🇷' },
  { id: 'FA', native: 'فارسی', flag: '🇮🇷' },
];

export default function SettingsTab({ state, tr, onLogout, onOpenUpgrade, onOpenPlanManager, onLangToggle, onDeleteAccount }: SettingsTabProps) {
  const [notifications, setNotifications] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserEmail(user?.email || null);
    });
  }, []);

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await onDeleteAccount();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 pt-5 pb-28 space-y-5">

      {/* Account Card */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-white font-bold">{userEmail || '—'}</div>
              <div className="text-emerald-100 text-xs mt-0.5 capitalize">{state.accountType} account</div>
            </div>
          </div>
        </div>
        <div className="px-5 py-4">
          <button
            onClick={state.tier === 'premium' ? onOpenPlanManager : onOpenUpgrade}
            className="w-full flex items-center justify-between py-2 group"
          >
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${state.tier === 'premium' ? 'bg-amber-100' : 'bg-slate-100'}`}>
                <span className="text-base">{state.tier === 'premium' ? '⭐' : '💡'}</span>
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-800">{tr.tier}: {state.tier === 'premium' ? tr.premium : tr.free}</div>
                <div className="text-xs text-slate-400">{state.tier === 'premium' ? tr.settingsManagePlan : tr.upgradeToPremium}</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
          </button>
        </div>
      </div>

      {/* Language */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-50">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{tr.settingsLanguage}</span>
          </div>
        </div>
        <div className="px-3 py-2 space-y-1">
          {LANGS.map(lang => (
            <button
              key={lang.id}
              onClick={() => onLangToggle(lang.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                state.lang === lang.id ? 'bg-emerald-50 text-emerald-700' : 'hover:bg-slate-50 text-slate-700'
              }`}
            >
              <span className="text-xl">{lang.flag}</span>
              <span className="text-sm font-medium flex-1">{lang.native}</span>
              {state.lang === lang.id && (
                <span className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Preferences */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-50">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{tr.settingsPreferences}</span>
          </div>
        </div>
        <div className="divide-y divide-slate-50">
          <div className="px-5 py-3.5 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-slate-800">{tr.settingsNotifications}</div>
              <div className="text-xs text-slate-400">{tr.settingsNotificationsDesc}</div>
            </div>
            <button
              onClick={() => setNotifications(n => !n)}
              className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${notifications ? 'bg-emerald-500' : 'bg-slate-200'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200 ${notifications ? 'left-5' : 'left-0.5'}`} />
            </button>
          </div>
          <div className="px-5 py-3.5 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-slate-800">{tr.settingsCurrency}</div>
              <div className="text-xs text-slate-400">Canadian Dollar</div>
            </div>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full" dir="ltr">CAD $</span>
          </div>
        </div>
      </div>

      {/* About */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-50">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{tr.settingsAbout}</span>
          </div>
        </div>
        <div className="divide-y divide-slate-50">
          {[
            { label: tr.settingsVersion, value: 'v1.0.0', href: null },
            { label: tr.settingsPrivacy, value: '→', href: '/privacy' },
            { label: tr.settingsTerms, value: '→', href: '/terms' },
          ].map(({ label, value, href }) => (
            href ? (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <span className="text-sm font-medium text-slate-700">{label}</span>
                <span className="text-xs text-slate-400">{value}</span>
              </a>
            ) : (
              <div key={label} className="px-5 py-3.5 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">{label}</span>
                <span className="text-xs text-slate-400">{value}</span>
              </div>
            )
          ))}
        </div>
      </div>

      {/* Danger Zone: delete account */}
      <div className="bg-white border border-rose-100 rounded-2xl shadow-sm p-4">
        {!confirmingDelete ? (
          <button
            onClick={() => setConfirmingDelete(true)}
            className="w-full text-center text-sm font-semibold text-rose-500 hover:text-rose-600 transition-colors"
          >
            {tr.deleteAccountBtn}
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-rose-600 text-center leading-relaxed">{tr.deleteAccountConfirm}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmingDelete(false)}
                disabled={deleting}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-xl text-sm transition-all"
              >
                {tr.cancel}
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-semibold rounded-xl text-sm transition-all disabled:opacity-60"
              >
                {deleting ? '…' : tr.deleteAccountConfirmBtn}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sign Out */}
      <button
        onClick={onLogout}
        className="w-full py-3.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 font-semibold rounded-2xl text-sm transition-all active:scale-[0.98]"
      >
        {tr.logout}
      </button>
    </div>
  );
}
