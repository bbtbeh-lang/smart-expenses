'use client';

import { useState, useMemo } from 'react';
import { X, Wallet, Plus, Trash2, Bell, BellOff, ArrowUpDown } from 'lucide-react';
import { Translations } from '@/lib/translations';
import { AccountType, Lang } from '@/lib/types';
import { getOrCreateCategoryKey } from '@/lib/utils';

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
  budgetDueDays: Record<string, number>;
  budgetReminders: Record<string, boolean>;
  onSave: (
    budgets: Record<string, number>,
    customCategories: Record<string, string>,
    budgetDueDays: Record<string, number>,
    budgetReminders: Record<string, boolean>
  ) => void;
  onClose: () => void;
}

export default function BudgetModal({ tr, accountType, lang, budgets, customCategories, budgetDueDays, budgetReminders, onSave, onClose }: BudgetModalProps) {
  const cats = accountType === 'business' ? EXPENSE_CATS_BUSINESS : EXPENSE_CATS_PERSONAL;

  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    cats.forEach(c => { init[c] = budgets[c] ? String(budgets[c]) : ''; });
    return init;
  });

  // Due day (1-31) and reminder toggle per built-in category key.
  const [dueDays, setDueDays] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    cats.forEach(c => { init[c] = budgetDueDays[c] ? String(budgetDueDays[c]) : ''; });
    return init;
  });
  const [reminders, setReminders] = useState<Record<string, boolean>>(() => ({ ...budgetReminders }));
  const [sortByDueDate, setSortByDueDate] = useState(false);

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
    // Check both what's already saved and what's been added in this
    // session but not saved yet, so typing the same label twice in a row
    // doesn't create two rows either.
    const sessionLabels = Object.fromEntries(customItems.map(i => [i.key, i.label]));
    const { key, isNew } = getOrCreateCategoryKey(label, { ...customCategories, ...sessionLabels });
    if (!isNew && customItems.some(i => i.key === key)) {
      // Already in the list — just focus attention there instead of duplicating.
      setNewLabel('');
      return;
    }
    setCustomItems(prev => [...prev, { key, label, amount: '' }]);
    setNewLabel('');
  };

  const handleRemoveCustom = (key: string) => {
    setCustomItems(prev => prev.filter(i => i.key !== key));
    setDueDays(prev => { const next = { ...prev }; delete next[key]; return next; });
    setReminders(prev => { const next = { ...prev }; delete next[key]; return next; });
  };

  const handleDueDayChange = (key: string, raw: string) => {
    const digitsOnly = raw.replace(/[^0-9]/g, '');
    if (digitsOnly === '') { setDueDays(prev => ({ ...prev, [key]: '' })); return; }
    const n = Math.min(31, Math.max(1, parseInt(digitsOnly, 10)));
    setDueDays(prev => ({ ...prev, [key]: String(n) }));
  };

  const toggleReminder = (key: string) => {
    setReminders(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Sorted display order for the built-in category list: by due day
  // ascending when the toggle is on (items with no due day sink to the
  // bottom), otherwise the original fixed order.
  const sortedCats = useMemo(() => {
    if (!sortByDueDate) return cats;
    return [...cats].sort((a, b) => {
      const da = dueDays[a] ? parseInt(dueDays[a], 10) : 999;
      const db = dueDays[b] ? parseInt(dueDays[b], 10) : 999;
      return da - db;
    });
  }, [cats, sortByDueDate, dueDays]);

  const sortedCustomItems = useMemo(() => {
    if (!sortByDueDate) return customItems;
    return [...customItems].sort((a, b) => {
      const da = dueDays[a.key] ? parseInt(dueDays[a.key], 10) : 999;
      const db = dueDays[b.key] ? parseInt(dueDays[b.key], 10) : 999;
      return da - db;
    });
  }, [customItems, sortByDueDate, dueDays]);

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

    // Due days / reminders only make sense for items that actually have a
    // budget amount set — drop stale entries for anything that got zeroed
    // out or removed.
    const nextDueDays: Record<string, number> = {};
    const nextReminders: Record<string, boolean> = {};
    Object.entries(dueDays).forEach(([k, v]) => {
      if (next[k] === undefined) return;
      const n = parseInt(v, 10);
      if (!isNaN(n) && n >= 1 && n <= 31) nextDueDays[k] = n;
    });
    Object.entries(reminders).forEach(([k, v]) => {
      if (next[k] === undefined || nextDueDays[k] === undefined) return;
      if (v) nextReminders[k] = true;
    });

    onSave(next, nextCustom, nextDueDays, nextReminders);
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
            <div className="flex items-center gap-1">
              <button
                onClick={() => setSortByDueDate(s => !s)}
                title={tr.sortByDueDate}
                className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${sortByDueDate ? 'bg-emerald-100 text-emerald-600' : 'hover:bg-slate-100 text-slate-500'}`}
              >
                <ArrowUpDown className="w-4 h-4" />
              </button>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
          </div>

          {/* Built-in categories */}
          <div className="space-y-3 mb-5">
            {sortedCats.map(cat => (
              <div key={cat} className="rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="flex-1 text-sm font-medium text-slate-700">{(tr as any)[cat]}</div>
                  <div className="relative w-36" dir="ltr">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">$</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={values[cat] ?? ''}
                      onChange={e => setValues(prev => ({ ...prev, [cat]: e.target.value }))}
                      placeholder={tr.noBudget}
                      className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all"
                    />
                  </div>
                </div>
                {values[cat] && parseFloat(values[cat]) > 0 && (
                  <div className="flex items-center gap-2 mt-1.5 pl-0.5">
                    <span className="text-[11px] text-slate-400">{tr.dueDayLabel}</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={31}
                      value={dueDays[cat] ?? ''}
                      onChange={e => handleDueDayChange(cat, e.target.value)}
                      placeholder="—"
                      dir="ltr"
                      className="w-14 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-center text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all"
                    />
                    <button
                      onClick={() => toggleReminder(cat)}
                      disabled={!dueDays[cat]}
                      title={tr.reminderToggle}
                      className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed ${reminders[cat] ? 'bg-amber-100 text-amber-600' : 'hover:bg-slate-100 text-slate-300'}`}
                    >
                      {reminders[cat] ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Custom items */}
          {sortedCustomItems.length > 0 && (
            <div className="space-y-3 mb-5">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Custom</div>
              {sortedCustomItems.map(item => (
                <div key={item.key} className="rounded-xl">
                  <div className="flex items-center gap-3">
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
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">$</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={item.amount}
                        onChange={e => setCustomItems(prev => prev.map(i => i.key === item.key ? { ...i, amount: e.target.value } : i))}
                        placeholder={tr.noBudget}
                        className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all"
                      />
                    </div>
                    <button
                      onClick={() => handleRemoveCustom(item.key)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-rose-50 text-slate-300 hover:text-rose-400 transition-all shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {item.amount && parseFloat(item.amount) > 0 && (
                    <div className="flex items-center gap-2 mt-1.5 pl-7">
                      <span className="text-[11px] text-slate-400">{tr.dueDayLabel}</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={31}
                        value={dueDays[item.key] ?? ''}
                        onChange={e => handleDueDayChange(item.key, e.target.value)}
                        placeholder="—"
                        dir="ltr"
                        className="w-14 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-center text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all"
                      />
                      <button
                        onClick={() => toggleReminder(item.key)}
                        disabled={!dueDays[item.key]}
                        title={tr.reminderToggle}
                        className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed ${reminders[item.key] ? 'bg-amber-100 text-amber-600' : 'hover:bg-slate-100 text-slate-300'}`}
                      >
                        {reminders[item.key] ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  )}
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
