'use client';

import { useState } from 'react';
import { X, Check, AlertTriangle, Zap } from 'lucide-react';
import { Translations } from '@/lib/translations';
import { Tier, AccountType } from '@/lib/types';

interface PlanModalProps {
  tr: Translations;
  tier: Tier;
  accountType: AccountType | null;
  onClose: () => void;
  onDowngrade: () => void;
  onSwitchPlan: (plan: 'business' | 'personal') => void;
}

type ModalView = 'manage' | 'confirmDowngrade';

export default function PlanModal({ tr, tier, accountType, onClose, onDowngrade, onSwitchPlan }: PlanModalProps) {
  const [view, setView] = useState<ModalView>('manage');
  const [selectedPlan, setSelectedPlan] = useState<'business' | 'personal'>(accountType === 'business' ? 'business' : 'personal');
  const [loading, setLoading] = useState(false);

  const handleSwitchPlan = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onSwitchPlan(selectedPlan);
    }, 1000);
  };

  const handleConfirmDowngrade = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onDowngrade();
    }, 1000);
  };

  const currentPlanLabel = accountType === 'business' ? tr.planBusinessLabel : tr.planPersonalLabel;
  const currentPlanPrice = accountType === 'business' ? tr.planBusiness : tr.planPersonal;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl z-50 overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 px-6 pt-7 pb-6 relative overflow-hidden">
          <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-amber-500/10" />
          <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors">
            <X className="w-4 h-4 text-white" />
          </button>
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">FinSnap</span>
          </div>
          <h2 className="text-xl font-bold text-white">{tr.planManageTitle}</h2>
          <p className="text-sm text-slate-400 mt-1">{currentPlanPrice} · {currentPlanLabel}</p>
        </div>

        <div className="px-5 py-5">
          {view === 'manage' && (
            <>
              {/* Current plan */}
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                    <span className="text-xl">⭐</span>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-amber-800">{tr.premium} {tr.tier}</div>
                    <div className="text-xs text-amber-600">{tr.planActiveLabel}</div>
                  </div>
                  <span className="ml-auto text-xs font-bold text-amber-700 bg-amber-200 px-2 py-0.5 rounded-full">{tr.planActive}</span>
                </div>
              </div>

              {/* Switch plan */}
              <div className="mb-4">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">{tr.planSwitchTitle}</div>
                <div className="grid grid-cols-2 gap-2">
                  {(['business', 'personal'] as const).map(plan => (
                    <button
                      key={plan}
                      onClick={() => setSelectedPlan(plan)}
                      className={`relative p-3 rounded-xl border-2 text-left transition-all ${selectedPlan === plan ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}
                    >
                      {selectedPlan === plan && (
                        <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                      <div className="text-xs font-bold text-slate-700">{plan === 'business' ? tr.planBusiness : tr.planPersonal}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{plan === 'business' ? tr.planBusinessLabel : tr.planPersonalLabel}</div>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleSwitchPlan}
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold rounded-xl text-sm shadow-lg shadow-emerald-200 active:scale-[0.98] transition-all disabled:opacity-70 mb-3"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>
                    {tr.planUpdating}
                  </span>
                ) : tr.planSwitchBtn}
              </button>

              <button
                onClick={() => setView('confirmDowngrade')}
                className="w-full py-2.5 text-rose-500 hover:bg-rose-50 font-medium rounded-xl text-sm transition-all"
              >
                {tr.planDowngrade}
              </button>
            </>
          )}

          {view === 'confirmDowngrade' && (
            <>
              <div className="flex flex-col items-center text-center mb-5 pt-2">
                <div className="w-14 h-14 rounded-2xl bg-rose-100 flex items-center justify-center mb-3">
                  <AlertTriangle className="w-7 h-7 text-rose-500" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1">{tr.planDowngradeConfirmTitle}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{tr.planDowngradeConfirmDesc}</p>
              </div>
              <div className="space-y-2">
                {[tr.feature1, tr.feature2, tr.feature3].map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-slate-500">
                    <X className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-5">
                <button onClick={() => setView('manage')} className="flex-1 py-3 bg-slate-100 text-slate-700 font-semibold rounded-xl text-sm hover:bg-slate-200 transition-all">
                  {tr.cancel}
                </button>
                <button
                  onClick={handleConfirmDowngrade}
                  disabled={loading}
                  className="flex-1 py-3 bg-rose-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-rose-200 active:scale-[0.98] transition-all disabled:opacity-70"
                >
                  {loading ? '...' : tr.planDowngradeConfirmBtn}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
