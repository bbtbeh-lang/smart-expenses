'use client';

import { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, Star, Youtube, FileText, Crown, Loader2, ChevronRight, Wallet, Lock } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { Translations } from '@/lib/translations';
import { AppState, DraftTransaction, Transaction } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

type DateFilter = 'today' | 'this_week' | 'this_month' | 'last_3_months' | 'all';

interface DashboardProps {
  state: AppState;
  tr: Translations;
  onAddTransaction: () => void;
  onOpenUpgrade: () => void;
  onOpenTaxReport: () => void;
  onOpenAIReview: (draft: DraftTransaction) => void;
  onApplyCode: (code: string) => Promise<{ success: boolean; message: string }>;
  onOpenPlanManager: () => void;
  onOpenBudget: () => void;
  onDemoReset: () => void;
}

const EXPENSE_CATS_PERSONAL = [
  'catGroceries', 'catRestaurant', 'catTransport', 'catUtilities',
  'catHealth', 'catEntertainment', 'catOther',
];
const EXPENSE_CATS_BUSINESS = [
  'catBusinessMaterials', 'catOffice', 'catMarketing', 'catSoftware',
  'catTravel', 'catRestaurant', 'catTransport', 'catUtilities', 'catOther',
];

const DONUT_COLORS = [
  '#10b981', '#6366f1', '#f59e0b', '#f43f5e',
  '#3b82f6', '#a855f7', '#ec4899', '#14b8a6', '#84cc16',
];

const DATE_FILTERS: { key: DateFilter; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'this_week', label: 'Week' },
  { key: 'this_month', label: 'Month' },
  { key: 'last_3_months', label: '3 Mo' },
  { key: 'all', label: 'All' },
];

function getDateRange(filter: DateFilter): { from: Date; to: Date } {
  const now = new Date();
  const to = new Date(now);
  to.setHours(23, 59, 59, 999);
  const from = new Date(now);
  from.setHours(0, 0, 0, 0);

  switch (filter) {
    case 'today': break;
    case 'this_week': from.setDate(now.getDate() - now.getDay()); break;
    case 'this_month': from.setDate(1); break;
    case 'last_3_months': from.setMonth(now.getMonth() - 3); from.setDate(1); break;
    case 'all': from.setFullYear(2000); break;
  }
  return { from, to };
}

function filterTxByDate(txs: Transaction[], filter: DateFilter): Transaction[] {
  const { from, to } = getDateRange(filter);
  return txs.filter(t => {
    const d = new Date(t.date);
    return d >= from && d <= to;
  });
}

export default function Dashboard({
  state, tr, onAddTransaction, onOpenUpgrade, onOpenTaxReport, onOpenAIReview, onApplyCode, onOpenPlanManager, onOpenBudget, onDemoReset,
}: DashboardProps) {
  const [code, setCode] = useState('');
  const [codeMsg, setCodeMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilter>('this_month');

  const scansLeft = Math.max(0, state.scanLimit - state.scansUsedThisPeriod);

  // Filtered transactions
  const filteredTxs = useMemo(() => filterTxByDate(state.transactions, dateFilter), [state.transactions, dateFilter]);

  // Metrics for filtered period
  const periodIncome = useMemo(() => filteredTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0), [filteredTxs]);
  const periodExpenses = useMemo(() => filteredTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0), [filteredTxs]);
  const netProfit = periodIncome - periodExpenses;
  const profitMargin = periodIncome > 0 ? Math.round((netProfit / periodIncome) * 100) : 0;

  // Monthly trend (always last 6 months)
  const monthlyData = useMemo(() => {
    const result: { month: string; income: number; expenses: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const ym = d.toISOString().slice(0, 7);
      const label = d.toLocaleString('default', { month: 'short' });
      const txs = state.transactions.filter((t: Transaction) => t.date.startsWith(ym));
      result.push({
        month: label,
        income: +txs.filter((t: Transaction) => t.type === 'income').reduce((s, t) => s + t.amount, 0).toFixed(0),
        expenses: +txs.filter((t: Transaction) => t.type === 'expense').reduce((s, t) => s + t.amount, 0).toFixed(0),
      });
    }
    return result;
  }, [state.transactions]);

  // Donut chart data — expenses by category for filtered period
  const expenseCatKeys = state.accountType === 'business' ? EXPENSE_CATS_BUSINESS : EXPENSE_CATS_PERSONAL;
  const donutData = useMemo(() => {
    const catMap: Record<string, { label: string; value: number }> = {};
    filteredTxs.filter(t => t.type === 'expense').forEach(t => {
      const label = (tr as any)[t.category] || state.customCategories[t.category] || t.category;
      if (!catMap[t.category]) catMap[t.category] = { label, value: 0 };
      catMap[t.category].value += t.amount;
    });
    return Object.values(catMap).filter(x => x.value > 0).sort((a, b) => b.value - a.value);
  }, [filteredTxs, tr, state.customCategories]);

  // Category spending vs budget
  const currentYm = new Date().toISOString().slice(0, 7);
  const allCategorySpending = useMemo(() => [
    ...expenseCatKeys.map(cat => ({
      cat,
      label: (tr as any)[cat] as string,
      spent: state.transactions.filter(t => t.type === 'expense' && t.category === cat && t.date.startsWith(currentYm)).reduce((s, t) => s + t.amount, 0),
      budget: state.budgets[cat] ?? 0,
    })),
    ...Object.entries(state.customCategories).map(([key, label]) => ({
      cat: key,
      label,
      spent: state.transactions.filter(t => t.type === 'expense' && t.category === key && t.date.startsWith(currentYm)).reduce((s, t) => s + t.amount, 0),
      budget: state.budgets[key] ?? 0,
    })),
  ].filter(x => x.spent > 0 || x.budget > 0), [state.transactions, state.budgets, state.customCategories, expenseCatKeys, tr, currentYm]);

  const handleApplyCode = async () => {
    if (!code.trim()) return;
    const { success, message } = await onApplyCode(code.trim().toUpperCase());
    const errorText = message === 'limit_reached' ? tr.codeLimitReached
      : message === 'already_used' ? tr.codeAlreadyUsed
      : message === 'invalid_or_expired' ? tr.codeError
      : tr.codeError;
    setCodeMsg({ text: success ? tr.codeSuccess : errorText, ok: success });
    if (success) setCode('');
    setTimeout(() => setCodeMsg(null), 4000);
  };

  const handleTierBadgeClick = () => {
    if (state.tier === 'premium') onOpenPlanManager();
    else onOpenUpgrade();
  };

  return (
    <div className="max-w-2xl mx-auto px-4 pt-5 pb-28 space-y-4">

      {/* Tier Badge + Scan Status */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <button onClick={handleTierBadgeClick} className="transition-opacity hover:opacity-80 active:opacity-60">
            {state.tier === 'premium' ? (
              <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-full px-3 py-1.5">
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span className="text-xs font-bold text-amber-700">{tr.tier}: {tr.premium}</span>
              </div>
            ) : state.hasManualAccess ? (
              <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1.5">
                <span className="text-sm">✏️</span>
                <span className="text-xs font-bold text-emerald-700">{tr.manualAccessUnlockedToday}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 bg-slate-100 rounded-full px-3 py-1.5">
                <span className="text-sm">💡</span>
                <span className="text-xs font-semibold text-slate-600">{tr.tier}: {tr.free}</span>
              </div>
            )}
          </button>

          {state.hasScanAccess ? (
            <div className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 ${state.tier === 'premium' ? 'bg-emerald-50' : 'bg-blue-50'}`}>
              <span className="text-sm">⚡</span>
              <span className={`text-xs font-semibold ${state.tier === 'premium' ? 'text-emerald-600' : 'text-blue-600'}`} dir="ltr">
                {tr.scansRemaining}: {scansLeft}/{state.scanLimit}
              </span>
            </div>
          ) : (
            <button
              onClick={onOpenUpgrade}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              <Lock className="w-3 h-3 text-slate-500" />
              <span className="text-xs font-semibold text-slate-500">{tr.scanRequiresPlan}</span>
            </button>
          )}
        </div>
      </div>

      {/* YouTube Code Widget — unlocks Manual Entry ONLY, never OCR scanning */}
      {!state.hasManualAccess && (
        <div className="bg-gradient-to-br from-rose-50 to-orange-50 border border-rose-200 rounded-2xl p-4">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-8 h-8 rounded-xl bg-rose-500 flex items-center justify-center shrink-0">
              <Youtube className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-800">{tr.youtubeWidgetTitle}</div>
              <div className="text-xs text-slate-500 mt-0.5">{tr.youtubeWidgetSub}</div>
            </div>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleApplyCode(); } }}
              placeholder={tr.enterCode}
              className="flex-1 px-3 py-2.5 bg-white border border-rose-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent transition-all"
              dir="ltr"
            />
            <button
              type="button"
              onClick={handleApplyCode}
              disabled={!code.trim()}
              className="px-4 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-semibold rounded-xl text-sm transition-all active:scale-[0.97] whitespace-nowrap disabled:opacity-40"
            >
              {tr.applyCode}
            </button>
          </div>
          {codeMsg && (
            <div className={`mt-2.5 text-xs font-medium rounded-xl px-3 py-2 ${codeMsg.ok ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
              {codeMsg.ok ? '🎉 ' : '❌ '}{codeMsg.text}
            </div>
          )}
        </div>
      )}

      {/* Date Filter */}
      <div className="flex gap-1.5 bg-white border border-slate-100 rounded-2xl p-1.5 shadow-sm">
        {DATE_FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setDateFilter(f.key)}
            className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              dateFilter === f.key
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm text-center">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center mx-auto mb-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xs text-slate-500 leading-tight mb-1">{tr.totalIncome}</div>
          <div className="text-base font-bold text-emerald-600" dir="ltr">{formatCurrency(periodIncome, state.lang)}</div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm text-center">
          <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center mx-auto mb-2">
            <TrendingDown className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xs text-slate-500 leading-tight mb-1">{tr.totalExpenses}</div>
          <div className="text-base font-bold text-rose-500" dir="ltr">{formatCurrency(periodExpenses, state.lang)}</div>
        </div>

        <div className={`border rounded-2xl p-4 shadow-sm text-center ${netProfit >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center mx-auto mb-2 ${netProfit >= 0 ? 'bg-emerald-200' : 'bg-rose-200'}`}>
            {netProfit >= 0 ? <TrendingUp className="w-4 h-4 text-emerald-700" /> : <TrendingDown className="w-4 h-4 text-rose-700" />}
          </div>
          <div className="text-xs text-slate-500 leading-tight mb-1">{tr.netProfit}</div>
          <div className={`text-sm font-bold ${netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`} dir="ltr">
            {netProfit >= 0 ? '+' : ''}{formatCurrency(netProfit, state.lang)}
          </div>
          {periodIncome > 0 && (
            <div className={`text-[10px] font-semibold mt-0.5 ${profitMargin >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
              {profitMargin >= 0 ? '+' : ''}{profitMargin}% margin
            </div>
          )}
        </div>
      </div>

      {/* Monthly Trend Chart */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">{tr.monthlyTrend}</div>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={monthlyData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, fontSize: 12 }} labelStyle={{ fontWeight: 700, color: '#1e293b' }} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
            <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3, fill: '#10b981' }} activeDot={{ r: 5 }} />
            <Line type="monotone" dataKey="expenses" stroke="#f43f5e" strokeWidth={2.5} dot={{ r: 3, fill: '#f43f5e' }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Donut Chart — Expenses by Category */}
      {donutData.length > 0 && (
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
            Expense Breakdown
          </div>
          <div className="flex items-center gap-4">
            <div className="shrink-0">
              <PieChart width={130} height={130}>
                <Pie
                  data={donutData}
                  cx={60}
                  cy={60}
                  innerRadius={38}
                  outerRadius={58}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {donutData.map((_, i) => (
                    <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 11 }}
                  formatter={(v: number) => [formatCurrency(v, state.lang), '']}
                />
              </PieChart>
            </div>
            <div className="flex-1 space-y-1.5 min-w-0">
              {donutData.slice(0, 5).map((item, i) => (
                <div key={i} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                    <span className="text-xs text-slate-600 truncate">{item.label}</span>
                  </div>
                  <span className="text-xs font-semibold text-slate-700 shrink-0" dir="ltr">
                    {formatCurrency(item.value, state.lang)}
                  </span>
                </div>
              ))}
              {donutData.length > 5 && (
                <div className="text-[10px] text-slate-400 pl-3.5">+{donutData.length - 5} more</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Monthly Budget / Category Spending */}
      {allCategorySpending.length > 0 && (
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">{tr.spendingByCategory}</div>
            <button onClick={onOpenBudget} className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors">
              <Wallet className="w-3.5 h-3.5" />
              {tr.manageBudgets}
            </button>
          </div>
          <div className="space-y-3">
            {allCategorySpending.map(({ cat, label, spent, budget }) => {
              const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
              const over = budget > 0 && spent > budget;
              return (
                <div key={cat}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-slate-600">{label}</span>
                    <span className={`text-xs font-semibold ${over ? 'text-rose-500' : 'text-slate-500'}`} dir="ltr">
                      {formatCurrency(spent, state.lang)}{budget > 0 ? ` / ${formatCurrency(budget, state.lang)}` : ''}
                      {over && <span className="ml-1">!</span>}
                    </span>
                  </div>
                  {budget > 0 && (
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${over ? 'bg-rose-400' : pct > 80 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {allCategorySpending.length === 0 && (
        <button
          onClick={onOpenBudget}
          className="w-full bg-white border border-dashed border-slate-200 rounded-2xl p-4 flex items-center gap-3 hover:border-emerald-300 hover:bg-emerald-50 transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-100 group-hover:bg-emerald-200 flex items-center justify-center shrink-0 transition-colors">
            <Wallet className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-left">
            <div className="text-sm font-semibold text-slate-700">{tr.manageBudgets}</div>
            <div className="text-xs text-slate-400">{tr.budgetTitle}</div>
          </div>
        </button>
      )}

      {/* Processing Queue */}
      {state.draftQueue.length > 0 && (
        <div>
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-1">{tr.processingQueue}</div>
          <div className="space-y-2">
            {state.draftQueue.map(draft => (
              <div key={draft.id}>
                {draft.status === 'processing' ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                      <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-700">{draft.type === 'income' ? '💰' : '💸'} {draft.type === 'income' ? tr.income : tr.expense}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{tr.aiParsing}</div>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => onOpenAIReview(draft)}
                    className="w-full bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-4 flex items-center gap-3 shadow-sm hover:bg-emerald-100 active:scale-[0.99] transition-all"
                  >
                    <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0">
                      <span className="text-lg">{draft.type === 'income' ? '💰' : '💸'}</span>
                    </div>
                    <div className="flex-1 text-left">
                      <div className="text-sm font-bold text-emerald-800">{tr.readyForReview}</div>
                      <div className="text-xs text-emerald-600 mt-0.5">{tr.tapToReview}</div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-emerald-500 shrink-0" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      <div>
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-1">
          Recent Transactions
          {filteredTxs.length > 0 && <span className="ml-2 text-slate-400 font-normal normal-case">({filteredTxs.length} total)</span>}
        </div>
        {filteredTxs.length === 0 ? (
          <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-8 text-center">
            <div className="text-3xl mb-2">📋</div>
            <div className="text-sm text-slate-400">{tr.noTransactions}</div>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTxs.slice(-5).reverse().map(tx => (
              <div key={tx.id} className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tx.type === 'income' ? 'bg-emerald-100' : 'bg-rose-100'}`}>
                  <span className="text-lg">{tx.type === 'income' ? '💰' : '💸'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-800 truncate">{tx.description}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{tx.date}</div>
                  {tx.items && tx.items.length > 0 && (
                    <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                      {tx.items.map(i => i.name).join(' · ')}
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className={`text-sm font-bold ${tx.type === 'income' ? 'text-emerald-600' : 'text-rose-500'}`} dir="ltr">
                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, state.lang, 2)}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5 truncate max-w-[80px] text-right">{(tr as any)[tx.category] || tx.category}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <button
          onClick={onOpenTaxReport}
          className="flex items-center justify-center gap-2 py-3 bg-white border border-slate-200 hover:border-teal-400 hover:bg-teal-50 rounded-2xl text-sm font-semibold text-slate-700 hover:text-teal-700 transition-all duration-150 shadow-sm"
        >
          <FileText className="w-4 h-4" />
          {tr.generateTaxReport}
        </button>
        <button
          onClick={state.tier === 'premium' ? onOpenPlanManager : onOpenUpgrade}
          className={`flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold transition-all duration-150 shadow-sm ${state.tier === 'premium' ? 'bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100' : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-amber-200 hover:shadow-amber-300'}`}
        >
          <Crown className="w-4 h-4" />
          {state.tier === 'premium' ? `${tr.tier}: ${tr.premium}` : tr.upgradeToPremium}
        </button>
      </div>

      <div className="pt-4 flex justify-center">
        <button
          onClick={onDemoReset}
          className="text-xs text-slate-400 border border-dashed border-slate-300 rounded-full px-4 py-1.5 hover:text-rose-500 hover:border-rose-300 transition-colors"
          dir="rtl"
        >
          ریست دمو
        </button>
      </div>
    </div>
  );
}
