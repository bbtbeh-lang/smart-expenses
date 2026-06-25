'use client';

import { useState } from 'react';
import { X, Wallet, Plus, Trash2 } from 'lucide-react';
import { Translations } from '@/lib/translations';
import { AccountType, Lang } from '@/lib/types';
import { getCurrencySymbol } from '@/lib/utils';

const EXPENSE_CATS_PERSONAL = [
  'catGroceries', 'catRestaurant', 'catTransport', 'catUtilities',
  'catHealth', 'catEntertainment', 'catOther',
];
const EXPENSE_CATS_BUSINESS = [
  'catBusinessMaterials', 'catOffice', 'catMarketing', 'catSoftware',
  'catTravel', 'catRestaurant', 'catTransport', 'catUtilities', 'catOther',
];

interface CustomItem {
  key: string;
  label: string;
  amount: string;
}

interface BudgetModalProps {
  tr: Translations;
  accountType: AccountType;
  lang: Lang;
  budgets: Record<string, number>;
  customCategories: Record<string, string>;
  onSave: (budgets: Record<string, number>, customCategories: Record<string, string>) => void;
  onClose: () => void;
}

function makeKey(label: string) {
  return 'custom_' + label.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_\u0600-\u06FF]/g, '') + '_' + Date.now();
}

export default function BudgetModal({ tr, accountType, lang, budgets, customCategories, onSave, onClose }: BudgetModalProps) {
  const cats = accountType === 'business' ? EXPENSE_CATS_BUSINESS : EXPENSE_CATS_PERSONAL;

  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    cats.forEach(c => { init[c] = budgets[c] ? String(budgets[c]) : ''; });
    return init;
  });

  const currSym = getCurrencySymbol(lang);
  const isFA = lang === 'FA';

  // Custom items: pre-populate from existing customCategories
  const [customItems, setCustomItems] = useState<CustomItem[]>(() =>
    Object.entries(customCategories).map(([key, label]) => ({
      key,
      label,
      amount: budgets[key] ? String(budgets[key]) : '',
    }))
  );

  const [newLabel, setNewLabel] = useState('');

  const handleAddCustom = () => {
    const label = newLabel.trim();
    if (!label) return;
    setCustomItems(prev => [...prev, { key: makeKey(label), label, amount: '' }]);
    setNewLabel('');
  };

  const handleRemoveCustom = (key: string) => {
    setCustomItems(prev => prev.filter(i => i.key !== key));
  };

  const handleSave = () => {
    const next: Record<string, number> = {};
    // built-in cats
    Object.entries(values).forEach(([k, v]) => {
      const n = parseFloat(v);
      if (!isNaN(n) && n > 0) next[k] = n;
    });
    // custom cats
    const nextCustom: Record<string, string> = {};
    customItems.forEach(item => {
      const n = parseFloat(item.amount);
      if (!isNaN(n) && n > 0) next[item.key] = n;
      if (item.label.trim()) nextCustom[item.key] = item.label.trim();
    });
    onSave(next, nextCustom);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl shadow-2xl z-50 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-slate-200" />
        </div>

        <div className="px-5 pb-8 pt-2">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center">
                <Wallet className="w-4 h-4 text-emerald-600" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">{tr.manageBudgets}</h2>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          {/* Built-in categories */}
          <div className="space-y-3 mb-5">
            {cats.map(cat => (
              <div key={cat} className="flex items-center gap-3">
                <div className="flex-1 text-sm font-medium text-slate-700">{(tr as any)[cat]}</div>
                <div className={`relative w-36 ${isFA ? '' : ''}`} dir="ltr">
                  {!isFA && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">$</span>}
                  <input
                    type="number"
                    inputMode="decimal"
                    value={values[cat] ?? ''}
                    onChange={e => setValues(prev => ({ ...prev, [cat]: e.target.value }))}
                    placeholder={tr.noBudget}
                    className={`w-full ${!isFA ? 'pl-7' : 'pl-3'} pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all`}
                  />
                  {isFA && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">تومان</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Custom items */}
          {customItems.length > 0 && (
            <div className="space-y-3 mb-5">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Custom</div>
              {customItems.map(item => (
                <div key={item.key} className="flex items-center gap-3">
                  <div className="flex-1 flex items-center gap-2 min-w-0">
                    <div className="w-5 h-5 rounded-md bg-teal-100 flex items-center justify-center shrink-0">
                      <span className="text-[10px]">✦</span>
                    </div>
                    <input
                      type="text"
                      value={item.label}
                      onChange={e => setCustomItems(prev => prev.map(i => i.key === item.key ? { ...i, label: e.target.value } : i))}
                      className="flex-1 text-sm font-medium text-slate-700 bg-transparent focus:outline-none border-b border-dashed border-slate-300 focus:border-emerald-400 pb-0.5 min-w-0"
                      dir="auto"
                    />
                  </div>
                  <div className="relative w-28" dir="ltr">
                    {!isFA && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">$</span>}
                    <input
                      type="number"
                      inputMode="decimal"
                      value={item.amount}
                      onChange={e => setCustomItems(prev => prev.map(i => i.key === item.key ? { ...i, amount: e.target.value } : i))}
                      placeholder={tr.noBudget}
                      className={`w-full ${!isFA ? 'pl-7' : 'pl-3'} pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all`}
                    />
                    {isFA && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">تومان</span>}
                  </div>
                  <button
                    onClick={() => handleRemoveCustom(item.key)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-rose-50 text-slate-300 hover:text-rose-400 transition-all shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add custom item row */}
          <div className="border border-dashed border-slate-200 rounded-2xl p-3 mb-5 space-y-2">
            <p className="text-xs text-slate-400">{tr.customItemName}</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustom(); } }}
                placeholder={tr.customItemPlaceholder}
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all"
                dir="auto"
              />
              <button
                onClick={handleAddCustom}
                disabled={!newLabel.trim()}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <button
            onClick={handleSave}
            className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-xl text-sm shadow-lg shadow-emerald-200 hover:shadow-emerald-300 active:scale-[0.98] transition-all duration-150"
          >
            {tr.saveBudgets}
          </button>
        </div>
      </div>
    </div>
  );
}
