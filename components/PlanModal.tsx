'use client';

import { useState } from 'react';
import { X, Zap, ExternalLink, ArrowUpCircle } from 'lucide-react';
import { Translations } from '@/lib/translations';
import { PlanId, BillingPeriod } from '@/lib/types';
import { PLANS } from '@/lib/plans';

interface PlanModalProps {
  tr: Translations;
  plan: PlanId;
  billingPeriod: BillingPeriod;
  currentPeriodEnd: string | null;
  onClose: () => void;
  onManageSubscription: () => Promise<void> | void;
  onOpenUpgrade: () => void;
}

export default function PlanModal({ tr, plan, billingPeriod, currentPeriodEnd, onClose, onManageSubscription, onOpenUpgrade }: PlanModalProps) {
  const [loading, setLoading] = useState(false);

  const handleManage = async () => {
    setLoading(true);
    try {
      await onManageSubscription();
    } finally {
      setLoading(false);
    }
  };

  const planConfig = plan !== 'free' ? PLANS[plan] : null;
  const renewalDate = currentPeriodEnd ? new Date(currentPeriodEnd).toLocaleDateString() : null;
  const daysUntilRenewal = currentPeriodEnd
    ? Math.ceil((new Date(currentPeriodEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const renewalSoon = daysUntilRenewal !== null && daysUntilRenewal <= 3 && daysUntilRenewal >= 0;

  const handleUpgradeClick = () => {
    onClose();
    onOpenUpgrade();
  };

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
        </div>

        <div className="px-5 py-5">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <span className="text-xl">⭐</span>
              </div>
              <div>
                <div className="text-sm font-bold text-amber-800">
                  {planConfig ? planConfig.name : tr.planFree}
                </div>
                <div className="text-xs text-amber-600">
                  {billingPeriod === 'yearly' ? tr.billingYearly : tr.billingMonthly}
                  {planConfig && ` · ${planConfig.scanLimit} ${tr.scansPerMonth.replace('{count}', '').trim()}`}
                </div>
              </div>
              <span className="ml-auto text-xs font-bold text-amber-700 bg-amber-200 px-2 py-0.5 rounded-full">{tr.planActive}</span>
            </div>
            {renewalDate && (
              <div className={`text-xs mt-3 border-t border-amber-200 pt-3 ${renewalSoon ? 'text-rose-600 font-semibold' : 'text-amber-700'}`}>
                {tr.renewsOn}: {renewalDate}
                {renewalSoon && (
                  <span className="block mt-1 text-rose-600">
                    {tr.renewalReminderSoon.replace('{days}', String(daysUntilRenewal))}
                  </span>
                )}
              </div>
            )}
          </div>

          <p className="text-sm text-slate-500 mb-4 leading-relaxed">{tr.manageSubscriptionDesc}</p>

          {/* In-app plan change / upgrade — does NOT leave FinSnap */}
          <button
            onClick={handleUpgradeClick}
            className="w-full py-3.5 mb-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold rounded-xl text-sm shadow-lg shadow-emerald-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <ArrowUpCircle className="w-4 h-4" />
            {tr.changePlanBtn}
          </button>

          {/* Stripe-hosted portal — payment method, invoices, cancellation */}
          <button
            onClick={handleManage}
            disabled={loading}
            className="w-full py-3.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl text-sm active:scale-[0.98] transition-all disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {loading ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>
            ) : (
              <ExternalLink className="w-4 h-4" />
            )}
            {tr.manageSubscriptionBtn}
          </button>
        </div>
      </div>
    </div>
  );
}
