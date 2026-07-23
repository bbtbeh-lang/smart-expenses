'use client';

import { useState, useMemo } from 'react';
import { Download, TrendingUp, TrendingDown, DollarSign, Search, X, Package } from 'lucide-react';
import { Transaction, Lang } from '@/lib/types';

interface ReportsTabProps {
  transactions: Transaction[];
  lang: Lang;
}

type ViewMode = 'all' | 'income' | 'expense';

const LABELS = {
  EN: {
    title: '📊 Financial Reports',
    allTime: 'All Time',
    income: 'Income',
    expenses: 'Expenses',
    all: 'All',
    profit: 'Profit',
    topIncomeCats: 'Top Income Categories',
    topExpenseCats: 'Top Expense Categories',
    transactions: 'Transactions',
    exportCSV: 'Export CSV',
    noTransactions: 'No transactions',
    searchTitle: 'Search by Product / Order',
    searchPlaceholder: 'e.g. "Order #1024" or "iPhone case"',
    searchHint: 'Find every income and expense tied to a specific product or order, based on the transaction description.',
    matches: 'matches',
    totalSpent: 'Total Spent',
    totalReceived: 'Total Received',
    netForItem: 'Net for this item',
    exportMatches: 'Export Matches',
    clear: 'Clear',
    noMatches: 'No transactions match your search',
  },
  FA: {
    title: '📊 گزارش‌های مالی',
    allTime: 'همه زمان‌ها',
    income: 'درآمد',
    expenses: 'هزینه',
    all: 'همه',
    profit: 'سود',
    topIncomeCats: 'دسته‌بندی‌های برتر درآمد',
    topExpenseCats: 'دسته‌بندی‌های برتر هزینه',
    transactions: 'تراکنش‌ها',
    exportCSV: 'خروجی CSV',
    noTransactions: 'تراکنشی وجود ندارد',
    searchTitle: 'جستجو بر اساس محصول / سفارش',
    searchPlaceholder: 'مثلاً «سفارش ۱۰۲۴» یا «کاور آیفون»',
    searchHint: 'همه‌ی درآمدها و هزینه‌های مربوط به یک محصول یا سفارش خاص را بر اساس توضیحات تراکنش پیدا کنید.',
    matches: 'مورد یافت شد',
    totalSpent: 'مجموع هزینه',
    totalReceived: 'مجموع دریافتی',
    netForItem: 'سود خالص این مورد',
    exportMatches: 'خروجی نتایج',
    clear: 'پاک کردن',
    noMatches: 'هیچ تراکنشی با این جستجو مطابقت ندارد',
  },
};

function exportToCSV(transactions: Transaction[], fileName: string) {
  const headers = ['Date', 'Description', 'Category', 'Type', 'Amount'];
  const rows = transactions.map(t => [
    t.date,
    `"${t.description.replace(/"/g, '""')}"`,
    t.category,
    t.type,
    t.type === 'expense' ? `-${t.amount}` : t.amount
  ]);

  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileName}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function CategoryBreakdown({ title, entries, total, color }: { title: string; entries: [string, number][]; total: number; color: string; }) {
  if (entries.length === 0) return null;
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 mb-4 shadow-sm">
      <h3 className="text-sm font-bold text-slate-800 mb-3">{title}</h3>
      <div className="space-y-2">
        {entries.map(([cat, amount]) => (
          <div key={cat}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-600">{cat}</span>
              <span className="font-semibold text-slate-800" dir="ltr">
                {amount.toLocaleString('en-CA', { style: 'currency', currency: 'CAD' })}
              </span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${color}`}
                style={{ width: `${total > 0 ? Math.min((amount / total) * 100, 100) : 0}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ReportsTab({ transactions, lang }: ReportsTabProps) {
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [view, setView] = useState<ViewMode>('all');
  const [search, setSearch] = useState('');
  const isRtl = lang === 'FA';
  const L = isRtl ? LABELS.FA : LABELS.EN;

  const fmt = (n: number) => n.toLocaleString('en-CA', { style: 'currency', currency: 'CAD' });

  // Get unique months
  const months = useMemo(() => {
    const m = new Set(transactions.map(t => t.date.slice(0, 7)));
    return Array.from(m).sort().reverse();
  }, [transactions]);

  // Filter by month
  const monthFiltered = useMemo(() => {
    if (selectedMonth === 'all') return transactions;
    return transactions.filter(t => t.date.startsWith(selectedMonth));
  }, [transactions, selectedMonth]);

  // Filter by selected view (income / expense / all)
  const filtered = useMemo(() => {
    if (view === 'all') return monthFiltered;
    return monthFiltered.filter(t => t.type === view);
  }, [monthFiltered, view]);

  // Calculate totals (always computed on the month-filtered set so the summary cards stay consistent)
  const income = monthFiltered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expenses = monthFiltered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const profit = income - expenses;

  // Category breakdowns, split cleanly between income and expense
  const expenseCategoryBreakdown = useMemo(() => {
    const cats: Record<string, number> = {};
    monthFiltered.filter(t => t.type === 'expense').forEach(t => {
      cats[t.category] = (cats[t.category] || 0) + t.amount;
    });
    return Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [monthFiltered]);

  const incomeCategoryBreakdown = useMemo(() => {
    const cats: Record<string, number> = {};
    monthFiltered.filter(t => t.type === 'income').forEach(t => {
      cats[t.category] = (cats[t.category] || 0) + t.amount;
    });
    return Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [monthFiltered]);

  // Product / order search — matches against the transaction description across ALL transactions
  // (not limited to the selected month) so a full history for one product/order can be pulled at once.
  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return transactions.filter(t => t.description.toLowerCase().includes(q));
  }, [transactions, search]);

  const searchSpent = searchResults.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const searchReceived = searchResults.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);

  const renderRow = (t: Transaction) => (
    <div key={t.id} className="flex items-center justify-between px-4 py-2.5">
      <div>
        <p className="text-xs font-semibold text-slate-800">{t.description}</p>
        <p className="text-[10px] text-slate-400">{t.date} · {t.category}</p>
      </div>
      <span className={`text-xs font-bold ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`} dir="ltr">
        {t.type === 'income' ? '+' : '-'}{fmt(t.amount)}
      </span>
    </div>
  );

  return (
    <div className="px-4 pt-4 pb-28 max-w-2xl mx-auto" dir={isRtl ? 'rtl' : 'ltr'}>
      <h2 className="text-xl font-bold text-slate-900 mb-4">{L.title}</h2>

      {/* Month selector */}
      <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedMonth('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${selectedMonth === 'all' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600'}`}
        >
          {L.allTime}
        </button>
        {months.map(m => (
          <button
            key={m}
            onClick={() => setSelectedMonth(m)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${selectedMonth === m ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600'}`}
          >
            {new Date(m + '-01').toLocaleString('default', { month: 'long', year: 'numeric' })}
          </button>
        ))}
      </div>

      {/* Income / Expense / All view toggle */}
      <div className="flex gap-1.5 mb-4 bg-slate-100 rounded-xl p-1">
        {(['all', 'income', 'expense'] as ViewMode[]).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              view === v
                ? v === 'income'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : v === 'expense'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500'
            }`}
          >
            {v === 'all' ? L.all : v === 'income' ? L.income : L.expenses}
          </button>
        ))}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-emerald-50 rounded-2xl p-3">
          <div className="flex items-center gap-1 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-[10px] font-semibold text-emerald-600 uppercase">{L.income}</span>
          </div>
          <p className="text-sm font-bold text-emerald-700" dir="ltr">{fmt(income)}</p>
        </div>
        <div className="bg-rose-50 rounded-2xl p-3">
          <div className="flex items-center gap-1 mb-1">
            <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
            <span className="text-[10px] font-semibold text-rose-600 uppercase">{L.expenses}</span>
          </div>
          <p className="text-sm font-bold text-rose-700" dir="ltr">{fmt(expenses)}</p>
        </div>
        <div className={`rounded-2xl p-3 ${profit >= 0 ? 'bg-indigo-50' : 'bg-orange-50'}`}>
          <div className="flex items-center gap-1 mb-1">
            <DollarSign className="w-3.5 h-3.5 text-indigo-600" />
            <span className="text-[10px] font-semibold text-indigo-600 uppercase">{L.profit}</span>
          </div>
          <p className={`text-sm font-bold ${profit >= 0 ? 'text-indigo-700' : 'text-orange-700'}`} dir="ltr">{fmt(profit)}</p>
        </div>
      </div>

      {/* Category breakdowns — shown independently per type so income & expense reporting stay fully separated */}
      {(view === 'all' || view === 'income') && (
        <CategoryBreakdown title={L.topIncomeCats} entries={incomeCategoryBreakdown} total={income} color="bg-emerald-400" />
      )}
      {(view === 'all' || view === 'expense') && (
        <CategoryBreakdown title={L.topExpenseCats} entries={expenseCategoryBreakdown} total={expenses} color="bg-rose-400" />
      )}

      {/* Transactions list */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm mb-4">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-800">
            {L.transactions} ({filtered.length})
          </h3>
          <button
            onClick={() => exportToCSV(filtered, selectedMonth === 'all' ? `All_${view}` : `Report_${selectedMonth}_${view}`)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold rounded-xl transition-all active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            {L.exportCSV}
          </button>
        </div>
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">{L.noTransactions}</div>
        ) : (
          <div className="divide-y divide-slate-50 max-h-80 overflow-y-auto">
            {filtered.slice(0, 50).map(t => renderRow(t))}
          </div>
        )}
      </div>

      {/* Product / Order search report */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm mb-4">
        <div className="p-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 mb-1">
            <Package className="w-4 h-4 text-emerald-600" />
            {L.searchTitle}
          </h3>
          <p className="text-[11px] text-slate-400 mb-3">{L.searchHint}</p>
          <div className="relative">
            <Search className={`w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 ${isRtl ? 'right-3' : 'left-3'}`} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={L.searchPlaceholder}
              className={`w-full py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 ${isRtl ? 'pr-9 pl-8' : 'pl-9 pr-8'}`}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className={`absolute top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 ${isRtl ? 'left-3' : 'right-3'}`}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {search.trim() !== '' && (
          <>
            {searchResults.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">{L.noMatches}</div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-3 p-4 border-b border-slate-100">
                  <div className="bg-rose-50 rounded-xl p-2.5">
                    <p className="text-[9px] font-semibold text-rose-600 uppercase mb-0.5">{L.totalSpent}</p>
                    <p className="text-xs font-bold text-rose-700" dir="ltr">{fmt(searchSpent)}</p>
                  </div>
                  <div className="bg-emerald-50 rounded-xl p-2.5">
                    <p className="text-[9px] font-semibold text-emerald-600 uppercase mb-0.5">{L.totalReceived}</p>
                    <p className="text-xs font-bold text-emerald-700" dir="ltr">{fmt(searchReceived)}</p>
                  </div>
                  <div className={`rounded-xl p-2.5 ${searchReceived - searchSpent >= 0 ? 'bg-indigo-50' : 'bg-orange-50'}`}>
                    <p className="text-[9px] font-semibold text-indigo-600 uppercase mb-0.5">{L.netForItem}</p>
                    <p className={`text-xs font-bold ${searchReceived - searchSpent >= 0 ? 'text-indigo-700' : 'text-orange-700'}`} dir="ltr">
                      {fmt(searchReceived - searchSpent)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100">
                  <span className="text-xs text-slate-500">{searchResults.length} {L.matches}</span>
                  <button
                    onClick={() => exportToCSV(searchResults, `Product_Report_${search.trim().replace(/[^a-z0-9]+/gi, '_')}`)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl transition-all active:scale-95"
                  >
                    <Download className="w-3.5 h-3.5" />
                    {L.exportMatches}
                  </button>
                </div>
                <div className="divide-y divide-slate-50 max-h-80 overflow-y-auto">
                  {searchResults.map(t => renderRow(t))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
