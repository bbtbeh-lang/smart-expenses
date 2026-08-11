'use client';

import { useState, useMemo, useRef } from 'react';
import { X, Wallet, Plus, Trash2, Bell, BellOff, ArrowUpDown, Calendar } from 'lucide-react';
import { Translations } from '@/lib/translations';
import { AccountType, Lang, BudgetTerm } from '@/lib/types';
import { getOrCreateCategoryKey, getNextDueDate, BudgetPeriod, getBudgetTermStatus } from '@/lib/utils';

const EXPENSE_CATS_PERSONAL = [
  'catGroceries', 'catRestaurant', 'catTransport', 'catUtilities',
  'catHealth', 'catEntertainment', 'catOther',
];
const EXPENSE_CATS_BUSINESS = [
  'catBusinessMaterials', 'catOffice', 'catMarketing', 'catSoftware',
  'catTravel', 'catRestaurant', 'catTransport', 'catUtilities', 'catOther',
];

type Recurrence = 'none' | 'weekly' | 'monthly' | 'yearly';
interface DueDateEntry { date: string; recurrence: Recurrence }

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
  budgetDueDates: Record<string, DueDateEntry>;
  budgetReminders: Record<string, boolean>;
  budgetPeriods: Record<string, BudgetPeriod>;
  budgetTerms: Record<string, BudgetTerm>;
  onSave: (
    budgets: Record<string, number>,
    customCategories: Record<string, string>,
    budgetDueDates: Record<string, DueDateEntry>,
    budgetReminders: Record<string, boolean>,
    budgetPeriods: Record<string, BudgetPeriod>,
    budgetTerms: Record<string, BudgetTerm>
  ) => void;
  onClose: () => void;
}

export default function BudgetModal({ tr, accountType, budgets, customCategories, budgetDueDates, budgetReminders, budgetPeriods, budgetTerms, onSave, onClose }: BudgetModalProps) {
  const cats = accountType === 'business' ? EXPENSE_CATS_BUSINESS : EXPENSE_CATS_PERSONAL;

  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    cats.forEach(c => { init[c] = budgets[c] ? String(budgets[c]) : ''; });
    return init;
  });

  // Per-category period (monthly/quarterly/yearly) the budget amount is
  // compared against — see lib/utils.ts isDateInCurrentBudgetPeriod.
  // Starts as a straight copy of whatever's already saved; handleSave
  // below reconciles it the same way it reconciles budgets/due dates.
  const [periods, setPeriods] = useState<Record<string, BudgetPeriod>>(() => ({ ...budgetPeriods }));

  // Optional fixed term (start/end date) — for recurring items that are
  // only meant to apply for a known window (a car lease, an apartment
  // rent), rather than indefinitely. Same reconcile-on-save pattern as
  // periods above.
  const [terms, setTerms] = useState<Record<string, BudgetTerm>>(() => ({ ...budgetTerms }));

  // Due date (calendar date) + recurrence rule, and reminder toggle, per
  // built-in category key.
  const [dueDates, setDueDates] = useState<Record<string, DueDateEntry>>(() => ({ ...budgetDueDates }));
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
  const newLabelInputRef = useRef<HTMLInputElement>(null);

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
    setDueDates(prev => { const next = { ...prev }; delete next[key]; return next; });
    setReminders(prev => { const next = { ...prev }; delete next[key]; return next; });
    setTerms(prev => { const next = { ...prev }; delete next[key]; return next; });
  };

  const setDueDate = (key: string, date: string) => {
    setDueDates(prev => ({ ...prev, [key]: { date, recurrence: prev[key]?.recurrence || 'none' } }));
  };
  const setRecurrence = (key: string, recurrence: Recurrence) => {
    setDueDates(prev => ({ ...prev, [key]: { date: prev[key]?.date || '', recurrence } }));
  };

  const setTermStart = (key: string, startDate: string) => {
    setTerms(prev => ({ ...prev, [key]: { ...prev[key], startDate: startDate || undefined } }));
  };
  const setTermEnd = (key: string, endDate: string) => {
    setTerms(prev => ({ ...prev, [key]: { ...prev[key], endDate: endDate || undefined } }));
  };

  const toggleReminder = (key: string) => {
    setReminders(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // For sorting: the next occurrence date (recurrence-aware), or a far-
  // future sentinel for items with no due date so they sink to the bottom.
  const sortKey = (key: string) => {
    const entry = dueDates[key];
    if (!entry?.date) return Infinity;
    const next = getNextDueDate(entry.date, entry.recurrence);
    return next ? next.getTime() : Infinity;
  };

  // Sorted display order for the built-in category list: by next due date
  // ascending when the toggle is on (items with no due date sink to the
  // bottom), otherwise the original fixed order.
  const sortedCats = useMemo(() => {
    if (!sortByDueDate) return cats;
    return [...cats].sort((a, b) => sortKey(a) - sortKey(b));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cats, sortByDueDate, dueDates]);

  const sortedCustomItems = useMemo(() => {
    if (!sortByDueDate) return customItems;
    return [...customItems].sort((a, b) => sortKey(a.key) - sortKey(b.key));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customItems, sortByDueDate, dueDates]);

  const handleSave = () => {
    // BUG FIX: this used to build `next` from scratch containing only
    // this session's category set (the CURRENT account type's built-in
    // categories + custom items). Since the parent replaces the entire
    // budgets object with whatever this returns, saving budgets while in
    // "business" mode used to silently wipe out every "personal"-only
    // category's budget (catHealth, catEntertainment, etc.) and vice
    // versa. Starting from a copy of the existing budgets means anything
    // outside this session's category set — the other account type's
    // exclusive categories — is left untouched.
    const next: Record<string, number> = { ...budgets };

    // Built-in categories for the account type currently open in this
    // modal — safe to fully reconcile (set, or clear if zeroed/blanked).
    cats.forEach(cat => {
      const n = parseFloat(values[cat]);
      if (!isNaN(n) && n > 0) next[cat] = n;
      else delete next[cat];
    });

    // Custom categories are shown regardless of account type (see the
    // customItems useState initializer below), so this list always
    // reflects the full, current set — safe to fully reconcile too,
    // including clearing anything the person just removed.
    const nextCustom: Record<string, string> = {};
    customItems.forEach(item => {
      const n = parseFloat(item.amount);
      if (!isNaN(n) && n > 0) next[item.key] = n;
      else delete next[item.key];
      if (item.label.trim()) nextCustom[item.key] = item.label.trim();
    });
    Object.keys(customCategories).forEach(key => {
      if (!customItems.some(i => i.key === key)) delete next[key];
    });

    // Due dates / reminders only make sense for items that actually have a
    // budget amount set — drop stale entries for anything that got zeroed
    // out or removed. `next` now correctly retains the other account
    // type's categories too, so their due dates/reminders survive here.
    const nextDueDates: Record<string, DueDateEntry> = {};
    const nextReminders: Record<string, boolean> = {};
    Object.entries(dueDates).forEach(([k, entry]) => {
      if (next[k] === undefined || !entry.date) return;
      nextDueDates[k] = entry;
    });
    Object.entries(reminders).forEach(([k, v]) => {
      if (next[k] === undefined || nextDueDates[k] === undefined) return;
      if (v) nextReminders[k] = true;
    });

    // Same reconciliation as budgets above: only keep a period entry for
    // items that still have a budget amount, but preserve entries outside
    // this session's category set (the other account type's categories),
    // and only store non-default values — 'monthly' is the implicit
    // default, so leaving it out keeps the common case unchanged from
    // before this feature existed.
    const nextPeriods: Record<string, BudgetPeriod> = {};
    Object.entries(periods).forEach(([k, period]) => {
      if (next[k] === undefined || period === 'monthly') return;
      nextPeriods[k] = period;
    });

    // Same reconciliation again: only keep a term entry for items that
    // still have a budget amount, and only if it actually has a bound
    // set (an item touched then cleared back to blank shouldn't leave a
    // stray {} entry behind).
    const nextTerms: Record<string, BudgetTerm> = {};
    Object.entries(terms).forEach(([k, term]) => {
      if (next[k] === undefined) return;
      if (!term.startDate && !term.endDate) return;
      nextTerms[k] = term;
    });

    onSave(next, nextCustom, nextDueDates, nextReminders, nextPeriods, nextTerms);
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
                aria-label={tr.sortByDueDate}
                className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${sortByDueDate ? 'bg-emerald-100 text-emerald-600' : 'hover:bg-slate-100 text-slate-500'}`}
              >
                <ArrowUpDown className="w-4 h-4" />
              </button>
              <button onClick={onClose} title={tr.closeModal} aria-label={tr.closeModal} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors">
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
                  <div className="mt-1.5 pl-0.5 space-y-2">
                    <div>
                      <div className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide mb-1">{tr.dueDateSectionLabel}</div>
                      <div className="flex items-center gap-2 flex-wrap" dir="ltr">
                        <select
                          value={periods[cat] ?? 'monthly'}
                          onChange={e => setPeriods(prev => ({ ...prev, [cat]: e.target.value as BudgetPeriod }))}
                          title={tr.budgetPeriodLabel}
                          className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all"
                        >
                          <option value="monthly">{tr.budgetPeriodMonthly}</option>
                          <option value="quarterly">{tr.budgetPeriodQuarterly}</option>
                          <option value="yearly">{tr.budgetPeriodYearly}</option>
                        </select>
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <input
                          type="date"
                          value={dueDates[cat]?.date ?? ''}
                          onChange={e => setDueDate(cat, e.target.value)}
                          title={tr.dueDateFieldTitle}
                          className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all"
                        />
                        <select
                          value={dueDates[cat]?.recurrence ?? 'none'}
                          onChange={e => setRecurrence(cat, e.target.value as Recurrence)}
                          disabled={!dueDates[cat]?.date}
                          title={tr.recurrenceFieldTitle}
                          className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all disabled:opacity-40"
                        >
                          <option value="none">{tr.recurrenceNone}</option>
                          <option value="weekly">{tr.recurrenceWeekly}</option>
                          <option value="monthly">{tr.recurrenceMonthly}</option>
                          <option value="yearly">{tr.recurrenceYearly}</option>
                        </select>
                        <button
                          onClick={() => toggleReminder(cat)}
                          disabled={!dueDates[cat]?.date}
                          title={tr.reminderToggle}
                          aria-label={tr.reminderToggle}
                          className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed ${reminders[cat] ? 'bg-amber-100 text-amber-600' : 'hover:bg-slate-100 text-slate-300'}`}
                        >
                          {reminders[cat] ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide mb-1">{tr.termSectionLabel}</div>
                      <TermFields
                        tr={tr}
                        term={terms[cat]}
                        onStartChange={d => setTermStart(cat, d)}
                        onEndChange={d => setTermEnd(cat, d)}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Custom items */}
          {sortedCustomItems.length > 0 && (
            <div className="space-y-3 mb-5">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{tr.customSectionLabel}</div>
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
                      title={tr.removeItem}
                      aria-label={tr.removeItem}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-rose-50 text-slate-300 hover:text-rose-400 transition-all shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {item.amount && parseFloat(item.amount) > 0 && (
                    <div className="mt-1.5 pl-7 space-y-2">
                      <div>
                        <div className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide mb-1">{tr.dueDateSectionLabel}</div>
                        <div className="flex items-center gap-2 flex-wrap" dir="ltr">
                          <select
                            value={periods[item.key] ?? 'monthly'}
                            onChange={e => setPeriods(prev => ({ ...prev, [item.key]: e.target.value as BudgetPeriod }))}
                            title={tr.budgetPeriodLabel}
                            className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all"
                          >
                            <option value="monthly">{tr.budgetPeriodMonthly}</option>
                            <option value="quarterly">{tr.budgetPeriodQuarterly}</option>
                            <option value="yearly">{tr.budgetPeriodYearly}</option>
                          </select>
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <input
                            type="date"
                            value={dueDates[item.key]?.date ?? ''}
                            onChange={e => setDueDate(item.key, e.target.value)}
                            title={tr.dueDateFieldTitle}
                            className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all"
                          />
                          <select
                            value={dueDates[item.key]?.recurrence ?? 'none'}
                            onChange={e => setRecurrence(item.key, e.target.value as Recurrence)}
                            disabled={!dueDates[item.key]?.date}
                            title={tr.recurrenceFieldTitle}
                            className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all disabled:opacity-40"
                          >
                            <option value="none">{tr.recurrenceNone}</option>
                            <option value="weekly">{tr.recurrenceWeekly}</option>
                            <option value="monthly">{tr.recurrenceMonthly}</option>
                            <option value="yearly">{tr.recurrenceYearly}</option>
                          </select>
                          <button
                            onClick={() => toggleReminder(item.key)}
                            disabled={!dueDates[item.key]?.date}
                            title={tr.reminderToggle}
                            aria-label={tr.reminderToggle}
                            className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed ${reminders[item.key] ? 'bg-amber-100 text-amber-600' : 'hover:bg-slate-100 text-slate-300'}`}
                          >
                            {reminders[item.key] ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <div className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide mb-1">{tr.termSectionLabel}</div>
                        <TermFields
                          tr={tr}
                          term={terms[item.key]}
                          onStartChange={d => setTermStart(item.key, d)}
                          onEndChange={d => setTermEnd(item.key, d)}
                        />
                      </div>
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
                ref={newLabelInputRef}
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
                title={tr.addCustomItem}
                aria-label={tr.addCustomItem}
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

// Start/end date pair for a budget item's optional fixed term, plus a
// small badge when the term is upcoming or already ended — shared by
// both the built-in category rows and the custom item rows above so the
// two stay in sync rather than drifting apart as separate copies.
function TermFields({ tr, term, onStartChange, onEndChange }: {
  tr: Translations;
  term?: BudgetTerm;
  onStartChange: (date: string) => void;
  onEndChange: (date: string) => void;
}) {
  const status = getBudgetTermStatus(term);
  const hasBound = !!(term?.startDate || term?.endDate);
  return (
    <span className="flex items-end gap-1.5 flex-wrap">
      <span className="flex flex-col gap-0.5">
        <label className="text-[9px] text-slate-400">{tr.termFromLabel}</label>
        <input
          type="date"
          value={term?.startDate ?? ''}
          onChange={e => onStartChange(e.target.value)}
          title={tr.budgetStartDate}
          className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all w-[7.2rem]"
        />
      </span>
      <span className="flex flex-col gap-0.5">
        <label className="text-[9px] text-slate-400">{tr.termToLabel}</label>
        <input
          type="date"
          value={term?.endDate ?? ''}
          onChange={e => onEndChange(e.target.value)}
          title={tr.budgetEndDate}
          className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all w-[7.2rem]"
        />
      </span>
      {hasBound && status !== 'active' && (
        <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold shrink-0 mb-1 ${status === 'ended' ? 'bg-slate-100 text-slate-400' : 'bg-sky-100 text-sky-600'}`}>
          {status === 'ended' ? tr.termStatusEnded : tr.termStatusUpcoming}
        </span>
      )}
    </span>
  );
}
