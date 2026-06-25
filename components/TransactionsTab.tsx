'use client';

import { useState } from 'react';
import { TrendingUp, TrendingDown, Search, X, Download, Pencil } from 'lucide-react';
import { Translations } from '@/lib/translations';
import { Transaction, TransactionType, Lang } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

interface TransactionsTabProps {
  transactions: Transaction[];
  tr: Translations;
  lang: Lang;
  onEdit: (tx: Transaction) => void;
}

type FilterType = 'all' | 'income' | 'expense';

function exportToCsv(transactions: Transaction[], tr: Translations) {
  const header = ['Date', 'Type', 'Description', 'Category', 'Amount', 'Tax', 'Receipt'];
  const rows = transactions
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))
    .map(tx => [
      tx.date,
      tx.type,
      `"${tx.description.replace(/"/g, '""')}"`,
      (tr as any)[tx.category] || tx.category,
      tx.type === 'income' ? tx.amount.toFixed(2) : (-tx.amount).toFixed(2),
      tx.taxAmount != null ? tx.taxAmount.toFixed(2) : '',
      tx.hasReceipt ? 'Yes' : 'No',
    ]);

  const csv = [header, ...rows].map(r => r.join(',')).join('\r\n');
  const bom = '\uFEFF';
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `finsnap-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function TransactionsTab({ transactions, tr, lang, onEdit }: TransactionsTabProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');

  const filtered = transactions
    .slice()
    .reverse()
    .filter(tx => {
      const matchesType = filter === 'all' || tx.type === filter;
      const matchesSearch = !search || tx.description.toLowerCase().includes(search.toLowerCase());
      return matchesType && matchesSearch;
    });

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  return (
    <div className="max-w-2xl mx-auto px-4 pt-5 pb-28 space-y-4">
      {/* Summary pills */}
      <div className="flex gap-3">
        <div className="flex-1 bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-600 shrink-0" />
          <div>
            <div className="text-[10px] text-emerald-600 font-semibold uppercase tracking-wide">{tr.totalIncome}</div>
            <div className="text-base font-bold text-emerald-700" dir="ltr">{formatCurrency(totalIncome, lang, 2)}</div>
          </div>
        </div>
        <div className="flex-1 bg-rose-50 border border-rose-100 rounded-2xl px-4 py-3 flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-rose-500 shrink-0" />
          <div>
            <div className="text-[10px] text-rose-500 font-semibold uppercase tracking-wide">{tr.totalExpenses}</div>
            <div className="text-base font-bold text-rose-600" dir="ltr">{formatCurrency(totalExpenses, lang, 2)}</div>
          </div>
        </div>
      </div>

      {/* Export button */}
      {transactions.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={() => exportToCsv(transactions, tr)}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-semibold rounded-xl transition-all duration-150 shadow-sm shadow-emerald-200"
          >
            <Download className="w-3.5 h-3.5" />
            {tr.exportExcel}
          </button>
        </div>
      )}

      {/* Search + Filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={tr.searchTransactions}
            className="w-full pl-9 pr-9 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
            dir="auto"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden">
          {(['all', 'income', 'expense'] as FilterType[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2.5 text-xs font-semibold transition-all ${
                filter === f ? 'bg-emerald-500 text-white' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              {f === 'all' ? tr.filterAll : f === 'income' ? tr.income : tr.expense}
            </button>
          ))}
        </div>
      </div>

      {/* Transaction List */}
      {filtered.length === 0 ? (
        <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-12 text-center">
          <div className="text-3xl mb-2">📋</div>
          <div className="text-sm text-slate-400">{search ? tr.noResults : tr.noTransactions}</div>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(tx => (
            <div key={tx.id} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tx.type === 'income' ? 'bg-emerald-100' : 'bg-rose-100'}`}>
                  <span className="text-lg">{tx.type === 'income' ? '💰' : '💸'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-800 truncate">{tx.description}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-400">{tx.date}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-300" />
                    <span className="text-xs text-slate-400 truncate">{(tr as any)[tx.category] || tx.category}</span>
                    {tx.hasReceipt && <span className="text-xs bg-teal-50 text-teal-600 px-1.5 py-0.5 rounded-md font-medium">AI</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <div className={`text-sm font-bold ${tx.type === 'income' ? 'text-emerald-600' : 'text-rose-500'}`} dir="ltr">
                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, lang, 2)}
                    </div>
                    {tx.taxAmount && (
                      <div className="text-xs text-slate-400 mt-0.5" dir="ltr">tax {formatCurrency(tx.taxAmount, lang, 2)}</div>
                    )}
                  </div>
                  <button
                    onClick={() => onEdit(tx)}
                    className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all active:scale-95"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
