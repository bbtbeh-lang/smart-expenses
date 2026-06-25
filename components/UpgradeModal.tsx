'use client';

import { useState } from 'react';
import { X, Zap, Check, Tag } from 'lucide-react';
import { Translations } from '@/lib/translations';
import { AccountType, VALID_CODES } from '@/lib/types';

interface UpgradeModalProps {
  tr: Translations;
  accountType: AccountType | null;
  onClose: () => void;
  onUpgrade: () => void;
}

const FEATURES = (tr: Translations) => [
  tr.feature1,
  tr.feature2,
  tr.feature3,
  tr.feature4,
  tr.feature5,
];

export default function UpgradeModal({ tr, accountType, onClose, onUpgrade }: UpgradeModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<'business' | 'personal'>(
    accountType === 'business' ? 'business' : 'personal'
  );
  const [loading, setLoading] = useState(false);
  const [promo, setPromo] = useState('');
  const [promoMsg, setPromoMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const handlePay = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onUpgrade();
    }, 1500);
  };

  const handleApplyPromo = () => {
    const code = promo.trim().toUpperCase();
    if (!code) return;
    if (VALID_CODES.includes(code)) {
      setPromoMsg({ text: tr.promoSuccess, ok: true });
      setTimeout(() => onUpgrade(), 800);
    } else {
      setPromoMsg({ text: tr.promoInvalid, ok: false });
    }
  };

  const plans = [
    {
      id: 'free',
      label: tr.planFree,
      price: '$0',
      desc: tr.planFreeDesc,
      disabled: true,
    },
    {
      id: 'personal',
      label: tr.planPersonalLabel,
      price: tr.planPersonal,
      desc: 'Perfect for individuals',
      disabled: false,
    },
    {
      id: 'business',
      label: tr.planBusinessLabel,
      price: tr.planBusiness,
      desc: 'GST / HST / QST ready',
      disabled: false,
      badge: tr.mostPopular,
    },
  ];

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

          {/* 3-tier plan cards */}
          <div className="space-y-2.5">
            {plans.map(plan => (
              <button
                key={plan.id}
                onClick={() => !plan.disabled && setSelectedPlan(plan.id as 'personal' | 'business')}
                disabled={plan.disabled}
                className={`relative w-full p-4 rounded-2xl border-2 text-left transition-all duration-150 ${
                  plan.disabled
                    ? 'border-slate-100 bg-slate-50 opacity-60 cursor-default'
                    : selectedPlan === plan.id
                    ? 'border-emerald-500 bg-emerald-50 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                {plan.badge && (
                  <span className="absolute -top-2.5 right-4 text-[10px] font-bold text-white bg-emerald-500 px-2.5 py-0.5 rounded-full">
                    {plan.badge}
                  </span>
                )}
                {!plan.disabled && selectedPlan === plan.id && (
                  <div className="absolute -top-2 -right-2 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center shadow">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div>
                    <div className={`text-xs font-bold uppercase tracking-wide mb-0.5 ${plan.disabled ? 'text-slate-400' : selectedPlan === plan.id ? 'text-emerald-600' : 'text-slate-500'}`}>
                      {plan.label}
                    </div>
                    <div className="text-lg font-bold text-slate-900" dir="ltr">{plan.price}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{plan.desc}</div>
                  </div>
                  {plan.disabled && (
                    <span className="text-xs font-semibold text-slate-400 bg-slate-200 px-2.5 py-1 rounded-full">
                      Current
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Features */}
          <div className="space-y-2.5">
            {FEATURES(tr).map((feature, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 text-emerald-600" />
                </div>
                <span className="text-sm text-slate-700">{feature}</span>
              </div>
            ))}
          </div>

          {/* Pay CTA */}
          <button
            onClick={handlePay}
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold rounded-2xl text-sm shadow-lg shadow-emerald-200 hover:shadow-emerald-300 active:scale-[0.98] transition-all duration-150 disabled:opacity-80"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Processing...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                {tr.payWithStripe}
              </span>
            )}
          </button>

          <p className="text-center text-xs text-slate-400">Secure payment via Stripe · Cancel anytime</p>

          {/* Promo code */}
          <div className="border-t border-slate-100 pt-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Tag className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs font-semibold text-slate-500">{tr.promoCode}</span>
            </div>
            <div className="flex gap-2" dir="ltr">
              <input
                type="text"
                value={promo}
                onChange={e => { setPromo(e.target.value); setPromoMsg(null); }}
                onKeyDown={e => e.key === 'Enter' && handleApplyPromo()}
                placeholder="e.g. FINFREE"
                className="flex-1 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 uppercase placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all font-mono tracking-wider"
              />
              <button
                onClick={handleApplyPromo}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl text-sm transition-all active:scale-[0.97] whitespace-nowrap"
              >
                {tr.promoApply}
              </button>
            </div>
            {promoMsg && (
              <div className={`mt-2 text-xs font-medium rounded-lg px-3 py-2 ${promoMsg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>
                {promoMsg.text}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
