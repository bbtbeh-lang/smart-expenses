'use client';

import { useState, useMemo } from 'react';
import { Download, TrendingUp, TrendingDown, DollarSign, Calendar } from 'lucide-react';
import { Transaction, Lang } from '@/lib/types';

interface ReportsTabProps {
  transactions: Transaction[];
  lang: Lang;
}

function exportToCSV(transactions: Transaction[], month: string) {
  const filtered = month === 'all' 
    ? transactions 
    : transactions.filter(t => t.date.startsWith(month));
  
  const headers = ['Date', 'Description', 'Category', 'Type', 'Amount'];
  const rows = filtered.map(t => [
    t.date,
    `"${t.description}"`,
    t.category,
    t.type,
    t.type === 'expense' ? `-${t.amount}` : t.amount
  ]);
  
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const fileName = month === 'all' ? 'All_Transactions' : `Report_${month}`;
  a.href = url;
  a.download = `${fileName}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsTab({ transactions, lang }: ReportsTabProps) {
  const [selectedMonth, setSelectedMonth] = useState('all');
  const isRtl = lang === 'FA';

  // Get unique months
  const months = useMemo(() => {
    const m = new Set(transactions.map(t => t.date.slice(0, 7)));
    return Array.from(m).sort().reverse();
  }, [transactions]);

  // Filter transactions
  const filtered = useMemo(() => {
    if (selectedMonth === 'all') return transactions;
    return transactions.filter(t => t.date.startsWith(selectedMonth));
  }, [transactions, selectedMonth]);

  // Calculate totals
  const income = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expenses = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const profit = income - expenses;

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const cats: Record<string, number> = {};
    filtered.filter(t => t.type === 'expense').forEach(t => {
      cats[t.category] = (cats[t.category] || 0) + t.amount;
    });
    return Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [filtered]);

  const fmt = (n: number) => n.toLocaleString('en-CA', { style: 'currency', currency: 'CAD' });

  return (
    <div className="px-4 pt-4 pb-28 max-w-2xl mx-auto" dir={isRtl ? 'rtl' : 'ltr'}>
      <h2 className="text-xl font-bold text-slate-900 mb-4">📊 Financial Reports</h2>

      {/* Month selector */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedMonth('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${selectedMonth === 'all' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600'}`}
        >
          All Time
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

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-emerald-50 rounded-2xl p-3">
          <div className="flex items-center gap-1 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-[10px] font-semibold text-emerald-600 uppercase">Income</span>
          </div>
          <p className="text-sm font-bold text-emerald-700" dir="ltr">{fmt(income)}</p>
        </div>
        <div className="bg-rose-50 rounded-2xl p-3">
          <div className="flex items-center gap-1 mb-1">
            <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
            <span className="text-[10px] font-semibold text-rose-600 uppercase">Expenses</span>
          </div>
          <p className="text-sm font-bold text-rose-700" dir="ltr">{fmt(expenses)}</p>
        </div>
        <div className={`rounded-2xl p-3 ${profit >= 0 ? 'bg-indigo-50' : 'bg-orange-50'}`}>
          <div className="flex items-center gap-1 mb-1">
            <DollarSign className="w-3.5 h-3.5 text-indigo-600" />
            <span className="text-[10px] font-semibold text-indigo-600 uppercase">Profit</span>
          </div>
          <p className={`text-sm font-bold ${profit >= 0 ? 'text-indigo-700' : 'text-orange-700'}`} dir="ltr">{fmt(profit)}</p>
        </div>
      </div>

      {/* Category breakdown */}
      {categoryBreakdown.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-4 mb-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-3">Top Expense Categories</h3>
          <div className="space-y-2">
            {categoryBreakdown.map(([cat, amount]) => (
              <div key={cat}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600">{cat}</span>
                  <span className="font-semibold text-slate-800" dir="ltr">{fmt(amount)}</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 rounded-full"
                    style={{ width: `${Math.min((amount / expenses) * 100, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transactions list */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm mb-4">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-800">
            Transactions ({filtered.length})
          </h3>
          <button
            onClick={() => exportToCSV(transactions, selectedMonth)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold rounded-xl transition-all active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">No transactions</div>
        ) : (
          <div className="divide-y divide-slate-50 max-h-80 overflow-y-auto">
            {filtered.slice(0, 50).map(t => (
              <div key={t.id} className="flex items-center justify-between px-4 py-2.5">
                <div>
                  <p className="text-xs font-semibold text-slate-800">{t.description}</p>
                  <p className="text-[10px] text-slate-400">{t.date} · {t.category}</p>
                </div>
                <span className={`text-xs font-bold ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`} dir="ltr">
                  {t.type === 'income' ? '+' : '-'}{fmt(t.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
