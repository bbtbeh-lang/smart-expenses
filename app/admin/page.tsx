'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { todayLocalDate } from '@/lib/utils';
import { PLANS, PlanId } from '@/lib/plans';
import { ShieldCheck, RefreshCw, Copy, Check, Lock, ExternalLink, Users, TrendingUp, Gift } from 'lucide-react';

interface CodeStatus {
  code: string | null;
  uses: number;
  maxUses: number;
  validDate: string;
}

interface Customer {
  userId: string;
  email: string | null;
  createdAt: string;
  birthDate: string | null;
  plan: 'free' | 'starter' | 'basic' | 'pro' | 'business';
  billingPeriod: 'monthly' | 'yearly' | null;
  status: 'inactive' | 'active' | 'past_due' | 'canceled';
  scansUsed: number;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId: string | null;
  grantedByAdmin: boolean;
}

const PLAN_BADGE_STYLE: Record<Customer['plan'], string> = {
  free: 'bg-slate-100 text-slate-500',
  starter: 'bg-teal-100 text-teal-700',
  basic: 'bg-sky-100 text-sky-700',
  pro: 'bg-violet-100 text-violet-700',
  business: 'bg-amber-100 text-amber-700',
};

const STATUS_BADGE_STYLE: Record<Customer['status'], string> = {
  active: 'bg-emerald-100 text-emerald-700',
  past_due: 'bg-rose-100 text-rose-700',
  canceled: 'bg-slate-100 text-slate-500',
  inactive: 'bg-slate-100 text-slate-400',
};

export default function AdminPage() {
  const [authChecked, setAuthChecked] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [status, setStatus] = useState<CodeStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customersError, setCustomersError] = useState('');
  const [customerFilter, setCustomerFilter] = useState<'all' | 'paying'>('all');
  const [grantEmail, setGrantEmail] = useState('');
  const [grantPlan, setGrantPlan] = useState<'starter' | 'basic' | 'pro' | 'business'>('business');
  const [grantDuration, setGrantDuration] = useState<'1_month' | '3_months' | '1_year' | 'lifetime'>('1_month');
  const [grantLoading, setGrantLoading] = useState(false);
  const [grantMessage, setGrantMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [revokingEmail, setRevokingEmail] = useState<string | null>(null);

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  };

  const loadStatus = useCallback(async () => {
    setError('');
    const token = await getToken();
    if (!token) { setForbidden(true); setAuthChecked(true); return; }
    const res = await fetch(`/api/admin/code/status?date=${encodeURIComponent(todayLocalDate())}`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 403 || res.status === 401) {
      setForbidden(true);
      setAuthChecked(true);
      return;
    }
    const data = await res.json();
    setStatus(data);
    setForbidden(false);
    setAuthChecked(true);
  }, []);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  const loadCustomers = useCallback(async () => {
    setCustomersLoading(true);
    setCustomersError('');
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch('/api/admin/customers', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setCustomersError(data.error || 'Failed to load customers');
        return;
      }
      const data = await res.json();
      setCustomers(data.customers);
    } catch {
      setCustomersError('Failed to load customers');
    } finally {
      setCustomersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authChecked && !forbidden) loadCustomers();
  }, [authChecked, forbidden, loadCustomers]);

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    try {
      const token = await getToken();
      if (!token) { setForbidden(true); return; }
      const res = await fetch('/api/admin/code/generate', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: todayLocalDate() }),
      });
      if (res.status === 403) { setForbidden(true); return; }
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to generate code'); return; }
      setStatus({ code: data.code, uses: 0, maxUses: data.maxUses, validDate: data.validDate });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!status?.code) return;
    navigator.clipboard.writeText(status.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGrant = async () => {
    if (!grantEmail.trim()) return;
    setGrantLoading(true);
    setGrantMessage(null);
    try {
      const token = await getToken();
      if (!token) { setForbidden(true); return; }
      const res = await fetch('/api/admin/grant-access', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: grantEmail.trim(), plan: grantPlan, duration: grantDuration }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGrantMessage({ text: data.error || 'Failed to grant access', ok: false });
        return;
      }
      setGrantMessage({ text: `Granted ${grantPlan} access to ${data.email}.`, ok: true });
      setGrantEmail('');
      loadCustomers();
    } catch {
      setGrantMessage({ text: 'Failed to grant access', ok: false });
    } finally {
      setGrantLoading(false);
    }
  };

  const handleRevoke = async (email: string) => {
    setRevokingEmail(email);
    try {
      const token = await getToken();
      if (!token) { setForbidden(true); return; }
      const res = await fetch('/api/admin/grant-access', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) loadCustomers();
    } finally {
      setRevokingEmail(null);
    }
  };

  // Monthly-equivalent revenue per active paid subscriber — yearly plans
  // are annualized (yearlyPriceCAD / 12), matching the fix already applied
  // to the upgrade/downgrade comparison in /api/stripe/change-plan.
  // NOTE: this must stay above the early `return`s below — hooks can never
  // run conditionally, or React throws a client-side exception once the
  // number of hooks called differs between renders.
  const { mrr, activeSubscribers } = useMemo(() => {
    if (!customers) return { mrr: 0, activeSubscribers: 0 };
    // Admin-granted accounts (Settings → Grant Free Access) are marked
    // active/paid so they get real feature access, but they generate no
    // actual revenue — excluded here so a batch of comped accounts
    // doesn't inflate the MRR number.
    const paying = customers.filter(c => c.status === 'active' && c.plan !== 'free' && !c.grantedByAdmin);
    const total = paying.reduce((sum, c) => {
      const plan = PLANS[c.plan as PlanId];
      if (!plan) return sum;
      return sum + (c.billingPeriod === 'yearly' ? plan.yearlyPriceCAD / 12 : plan.monthlyPriceCAD);
    }, 0);
    return { mrr: total, activeSubscribers: paying.length };
  }, [customers]);

  const formatCAD = (n: number) =>
    n.toLocaleString('en-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 2 });

  if (!authChecked) {
    return <div className="min-h-screen flex items-center justify-center text-slate-400 text-sm">Loading…</div>;
  }

  if (forbidden) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-sm w-full bg-white border border-slate-100 rounded-2xl shadow-sm p-8 text-center">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6 text-rose-500" />
          </div>
          <h1 className="text-lg font-bold text-slate-900 mb-1">Access Denied</h1>
          <p className="text-sm text-slate-500">This page is restricted to admin accounts only.</p>
        </div>
      </div>
    );
  }

  const usagePercent = status?.maxUses ? Math.min(100, (status.uses / status.maxUses) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="max-w-3xl mx-auto">
        <div className="max-w-md mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center">
            <ShieldCheck className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Daily Code Admin</h1>
            <p className="text-xs text-slate-400">Manual-entry access code — never grants scanning</p>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 mb-4">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
            Today's code ({status?.validDate})
          </div>

          {status?.code ? (
            <>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-mono text-lg font-bold text-slate-900 tracking-wider text-center" dir="ltr">
                  {status.code}
                </div>
                <button
                  onClick={handleCopy}
                  className="w-11 h-11 shrink-0 flex items-center justify-center rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-colors"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-slate-500">Usage today</span>
                <span className="font-semibold text-slate-700" dir="ltr">{status.uses} / {status.maxUses}</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${usagePercent >= 100 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-400 py-4 text-center">No code generated for today yet.</p>
          )}
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl px-3 py-2 mb-4">{error}</div>
        )}

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-sm transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {status?.code ? 'Generate a new code (replaces today\'s)' : "Generate today's code"}
        </button>

        <p className="text-xs text-slate-400 text-center mt-4 leading-relaxed">
          This code unlocks <b>manual transaction entry only</b> for whoever redeems it today.
          It never grants OCR/receipt scanning — that's exclusive to paid plans.
        </p>

        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5 mt-4">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
            Quick links
          </div>
          <a
            href="https://console.anthropic.com/settings/limits"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 hover:border-slate-300 hover:bg-slate-50 transition-colors"
          >
            <ExternalLink className="w-4 h-4 text-slate-400 shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-800">Anthropic Console — API usage &amp; limits</div>
              <div className="text-xs text-slate-400">Manage the API key and rate/spend limits behind OCR receipt scanning</div>
            </div>
          </a>
        </div>
        </div>

        {/* Grant free access */}
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5 mt-6 max-w-md mx-auto">
          <div className="flex items-center gap-2 mb-1">
            <Gift className="w-4 h-4 text-slate-400" />
            <h2 className="text-sm font-bold text-slate-800">Grant free access</h2>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            Give anyone with a FinSnap account full premium access, no payment involved — for
            testing, partners, or comps. They must have already signed up.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2 mb-3">
            <input
              type="email"
              value={grantEmail}
              onChange={e => setGrantEmail(e.target.value)}
              placeholder="person@example.com"
              className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              dir="ltr"
            />
            <select
              value={grantPlan}
              onChange={e => setGrantPlan(e.target.value as typeof grantPlan)}
              className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              <option value="starter">Starter</option>
              <option value="basic">Basic</option>
              <option value="pro">Pro</option>
              <option value="business">Business</option>
            </select>
            <select
              value={grantDuration}
              onChange={e => setGrantDuration(e.target.value as typeof grantDuration)}
              className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              <option value="1_month">1 month</option>
              <option value="3_months">3 months</option>
              <option value="1_year">1 year</option>
              <option value="lifetime">Lifetime</option>
            </select>
          </div>

          {grantMessage && (
            <div className={`text-xs rounded-xl px-3 py-2 mb-3 ${grantMessage.ok ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-rose-50 border border-rose-200 text-rose-700'}`}>
              {grantMessage.text}
            </div>
          )}

          <button
            onClick={handleGrant}
            disabled={grantLoading || !grantEmail.trim()}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Gift className="w-4 h-4" />
            {grantLoading ? 'Granting…' : 'Grant access'}
          </button>
        </div>

        {/* Revenue snapshot */}
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5 mt-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-slate-400" />
            <h2 className="text-sm font-bold text-slate-800">Revenue snapshot</h2>
          </div>
          {customers ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-slate-400 mb-1">Estimated MRR</div>
                <div className="text-2xl font-bold text-slate-900" dir="ltr">{formatCAD(mrr)}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Yearly plans counted at 1/12 their price</div>
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-1">Active paying subscribers</div>
                <div className="text-2xl font-bold text-slate-900" dir="ltr">{activeSubscribers}</div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400 py-2 text-center">Loading…</p>
          )}
        </div>

        {/* Customers */}
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5 mt-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-400" />
              <h2 className="text-sm font-bold text-slate-800">
                Customers {customers && <span className="text-slate-400 font-normal">({customers.length})</span>}
              </h2>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="flex rounded-lg bg-slate-100 p-0.5">
                <button
                  onClick={() => setCustomerFilter('all')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${customerFilter === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
                >
                  All
                </button>
                <button
                  onClick={() => setCustomerFilter('paying')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${customerFilter === 'paying' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
                >
                  Paying only
                </button>
              </div>
              <button
                onClick={loadCustomers}
                disabled={customersLoading}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${customersLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {customersError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl px-3 py-2 mb-3">{customersError}</div>
          )}

          {customersLoading && !customers ? (
            <p className="text-sm text-slate-400 py-6 text-center">Loading customers…</p>
          ) : customers && customers.length > 0 ? (
            <div className="overflow-x-auto -mx-5 px-5">
              <table className="w-full text-sm min-w-[560px]">
                <thead>
                  <tr className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wide border-b border-slate-100">
                    <th className="pb-2 pr-3">Email</th>
                    <th className="pb-2 pr-3">Birth date</th>
                    <th className="pb-2 pr-3">Plan</th>
                    <th className="pb-2 pr-3">Status</th>
                    <th className="pb-2 pr-3">Scans used</th>
                    <th className="pb-2 pr-3">Renews / signed up</th>
                    <th className="pb-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customers
                    .filter(c => customerFilter === 'all' || c.plan !== 'free')
                    .map(c => (
                      <tr key={c.userId} className="border-b border-slate-50 last:border-0">
                        <td className="py-2.5 pr-3 text-slate-700 truncate max-w-[220px]">{c.email || '—'}</td>
                        <td className="py-2.5 pr-3 text-slate-500 text-xs" dir="ltr">
                          {c.birthDate ? new Date(c.birthDate + 'T00:00:00').toLocaleDateString() : '—'}
                        </td>
                        <td className="py-2.5 pr-3">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${PLAN_BADGE_STYLE[c.plan]}`}>
                            {c.plan}{c.billingPeriod ? ` · ${c.billingPeriod}` : ''}
                          </span>
                          {c.grantedByAdmin && (
                            <span className="ml-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-pink-100 text-pink-700">
                              Comp
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 pr-3">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${STATUS_BADGE_STYLE[c.status]}`}>
                            {c.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-2.5 pr-3 text-slate-500" dir="ltr">{c.scansUsed}</td>
                        <td className="py-2.5 pr-3 text-xs" dir="ltr">
                          {c.currentPeriodEnd ? (
                            <span className={c.cancelAtPeriodEnd ? 'text-amber-600 font-semibold' : 'text-slate-400'}>
                              {new Date(c.currentPeriodEnd).toLocaleDateString()}
                              {c.cancelAtPeriodEnd && ' (canceling)'}
                            </span>
                          ) : (
                            <span className="text-slate-400">{new Date(c.createdAt).toLocaleDateString()}</span>
                          )}
                        </td>
                        <td className="py-2.5">
                          {c.grantedByAdmin && c.status === 'active' && c.email && (
                            <button
                              onClick={() => handleRevoke(c.email!)}
                              disabled={revokingEmail === c.email}
                              className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 disabled:opacity-50"
                            >
                              {revokingEmail === c.email ? 'Revoking…' : 'Revoke'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-slate-400 py-6 text-center">No customers yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
