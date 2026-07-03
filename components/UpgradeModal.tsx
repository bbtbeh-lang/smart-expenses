'use client';

import { useState } from 'react';
import { X, Zap, Check } from 'lucide-react';
import { Translations } from '@/lib/translations';
import { PlanId } from '@/lib/types';
import { PLANS } from '@/lib/plans';

interface UpgradeModalProps {
  tr: Translations;
  currentPlan: PlanId;
  onClose: () => void;
  onSelectPlan: (plan: 'basic' | 'pro' | 'business', billingPeriod: 'monthly' | 'yearly') => Promise<void> | void;
}

export default function UpgradeModal({ tr, currentPlan, onClose, onSelectPlan }: UpgradeModalProps) {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedPlan, setSelectedPlan] = useState<'basic' | 'pro' | 'business'>(
    currentPlan === 'free' ? 'pro' : (currentPlan as 'basic' | 'pro' | 'business')
  );
  const [loading, setLoading] = useState(false);

  const handlePay = async () => {
    setLoading(true);
    try {
      await onSelectPlan(selectedPlan, billingPeriod);
    } finally {
      setLoading(false);
    }
  };

  const planCards = (['basic', 'pro', 'business'] as const).map(id => ({
    ...PLANS[id],
    price: billingPeriod === 'yearly' ? PLANS[id].yearlyPriceCAD : PLANS[id].monthlyPriceCAD,
  }));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl z-50 overflow-hidden max-h-[92vh] overflow-y-auto">

        {/* Header */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 px-6 pt-8 pb-6 relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-emerald-500/10" />
          <div className="absolute -bottom-4 -left-4 w-24 h-24 rounded-full bg-teal-500/10" />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-widest">FinSnap</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-1">{tr.upgradeTitle}</h2>
          <p className="text-sm text-slate-400">{tr.upgradeSubtitle}</p>
        </div>

        <div className="px-5 py-5 space-y-5">

          {/* Monthly / Yearly toggle */}
          <div className="flex bg-slate-100 rounded-xl p-1">
            {(['monthly', 'yearly'] as const).map(period => (
              <button
                key={period}
                onClick={() => setBillingPeriod(period)}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                  billingPeriod === period ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                }`}
              >
                {period === 'monthly' ? tr.billingMonthly : tr.billingYearly}
                {period === 'yearly' && (
                  <span className="ml-1 text-emerald-600">· {tr.billingYearlySave}</span>
                )}
              </button>
            ))}
          </div>

          {/* 3-tier plan cards */}
          <div className="space-y-2.5">
            {planCards.map(plan => (
              <button
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                className={`relative w-full p-4 rounded-2xl border-2 text-left transition-all duration-150 ${
                  selectedPlan === plan.id
                    ? 'border-emerald-500 bg-emerald-50 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                {plan.id === 'pro' && (
                  <span className="absolute -top-2.5 right-4 text-[10px] font-bold text-white bg-emerald-500 px-2.5 py-0.5 rounded-full">
                    {tr.mostPopular}
                  </span>
                )}
                {selectedPlan === plan.id && (
                  <div className="absolute -top-2 -right-2 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center shadow">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div>
                    <div className={`text-xs font-bold uppercase tracking-wide mb-0.5 ${selectedPlan === plan.id ? 'text-emerald-600' : 'text-slate-500'}`}>
                      {plan.name}
                    </div>
                    <div className="text-lg font-bold text-slate-900" dir="ltr">
                      CA${plan.price}
                      <span className="text-xs font-normal text-slate-400"> /{billingPeriod === 'yearly' ? tr.perYear : tr.perMonth}</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {tr.scansPerMonth.replace('{count}', String(plan.scanLimit))}
                    </div>
                  </div>
                  {currentPlan === plan.id && (
                    <span className="text-xs font-semibold text-slate-400 bg-slate-200 px-2.5 py-1 rounded-full">
                      {tr.currentPlanLabel}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Pay CTA */}
          <button
            onClick={handlePay}
            disabled={loading || currentPlan === selectedPlan}
            className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold rounded-2xl text-sm shadow-lg shadow-emerald-200 hover:shadow-emerald-300 active:scale-[0.98] transition-all duration-150 disabled:opacity-60"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                {tr.processing}
              </span>
            ) : currentPlan === selectedPlan ? (
              tr.currentPlanLabel
            ) : (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                {tr.payWithStripe}
              </span>
            )}
          </button>

          <p className="text-center text-xs text-slate-400">{tr.securePaymentNote}</p>
        </div>
      </div>
    </div>
  );
}
