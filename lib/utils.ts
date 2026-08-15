import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Lang, BudgetTerm } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Quotes/escapes a CSV cell (doubles internal quotes) — safe for values
// this app computed itself: dates, type strings, amounts formatted as
// "-42.00" for an expense row. Use csvTextField instead for anything
// that came from free-text the user (or a scanned receipt) typed, since
// a leading '-' here is legitimate negative-amount formatting, not
// something to neutralize.
export function csvField(v: string | number): string {
  return `"${String(v).replace(/"/g, '""')}"`;
}

// Raw half of the formula-injection fix — see csvTextField below for
// why this exists. Exported separately for callers that need to
// neutralize a value now but quote/escape it later in a batch (see
// TaxReportModal's exportToCsv), instead of doing both at once.
export function neutralizeCsvFormula(v: string | number): string {
  const s = String(v);
  return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
}

// SECURITY: CSV formula injection (OWASP CSV Injection). A text field
// that starts with =, +, -, @, or a tab/CR is interpreted as an active
// formula by Excel/Sheets when the CSV is opened — not neutralized by
// quoting or comma/quote-escaping alone, which only stops a cell from
// breaking column boundaries, not from being parsed as a formula.
// tx.description and tx.merchant here aren't just user-typed text: OCR
// reads merchant names straight off a photographed receipt, i.e.
// third-party-controlled input a person didn't type themselves and has
// no reason to inspect before it lands in a spreadsheet they (or their
// accountant) open. Use this (not csvField) for description, merchant,
// and category-label cells in every CSV export in the app.
export function csvTextField(v: string | number): string {
  return csvField(neutralizeCsvFormula(v));
}

// `new Date().toISOString()` is always UTC. For a user west of UTC (e.g.
// Toronto, UTC-4/-5), that rolls over to tomorrow's date hours before
// midnight local time — a transaction added at 9pm was silently dated one
// day ahead. These use the local calendar date/month instead, matching
// what the user actually sees on their clock.
export function todayLocalDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function currentLocalYearMonth(): string {
  return todayLocalDate().slice(0, 7);
}

export type BudgetPeriod = 'monthly' | 'quarterly' | 'yearly';

// Whether a transaction date falls inside the CURRENT calendar window for
// a given budget period — 'monthly' keeps the original behavior (this
// calendar month), 'quarterly' widens it to the current calendar quarter
// (Jan-Mar, Apr-Jun, Jul-Sep, Oct-Dec), 'yearly' to the current calendar
// year. Calendar-aligned (not a rolling N-month window from whenever the
// budget was created) so it's predictable and needs no extra stored
// state — same principle as todayLocalDate() above, using local date
// parts rather than UTC to avoid the same day/month-boundary drift.
export function isDateInCurrentBudgetPeriod(dateStr: string, period: BudgetPeriod = 'monthly'): boolean {
  const today = todayLocalDate();
  if (period === 'monthly') return dateStr.startsWith(today.slice(0, 7));
  if (period === 'yearly') return dateStr.startsWith(today.slice(0, 4));
  // quarterly
  const [txYear, txMonth] = dateStr.split('-').map(Number);
  const [curYear, curMonth] = [Number(today.slice(0, 4)), Number(today.slice(5, 7))];
  const txQuarter = Math.ceil(txMonth / 3);
  const curQuarter = Math.ceil(curMonth / 3);
  return txYear === curYear && txQuarter === curQuarter;
}

// Human-readable label for the current window a period resolves to right
// now (e.g. "Q3 2026", "2026") — used next to non-monthly budget amounts
// so it's clear at a glance what timeframe the number covers, since
// unlike the monthly default it isn't otherwise obvious from context.
export function currentBudgetPeriodLabel(period: BudgetPeriod): string | null {
  if (period === 'monthly') return null;
  const today = todayLocalDate();
  const year = today.slice(0, 4);
  if (period === 'yearly') return year;
  const month = Number(today.slice(5, 7));
  const quarter = Math.ceil(month / 3);
  return `Q${quarter} ${year}`;
}

// `new Date("2026-07-27")` parses a date-only string as UTC midnight, not
// local midnight — the classic JS date gotcha. For a user west of UTC that
// shifts every stored transaction date backward by several hours when
// compared against local day/week/month boundaries. This constructs the
// Date from the parts directly, so it lands on local midnight instead.
export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

// FinSnap is a Canadian-dollar product for the Canadian market — the
// currency never changes with the UI language. Only the surrounding text
// (labels, categories, etc.) is translated; showing amounts in Iranian
// Toman for Persian-speaking users would be financially misleading, since
// they're actually paying and being billed in CAD.
export function getCurrencySymbol(_lang: Lang): string {
  return '$';
}

// Returns e.g. "$1,234.00" — always CAD, with thousands separators.
export function formatCurrency(amount: number, _lang: Lang, decimals = 2): string {
  // BUG FIX: toLocaleString() puts the minus sign first, so a negative
  // amount used to render as "$-730.80" (sign after the currency
  // symbol) instead of the standard "-$730.80".
  const isNegative = amount < 0;
  const formatted = Math.abs(amount).toLocaleString('en-CA', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${isNegative ? '-' : ''}$${formatted}`;
}

// Given an anchor due date (YYYY-MM-DD) and a recurrence rule, returns the
// next occurrence on or after `today` — or null if it's a one-off ('none')
// that has already passed. Handles month/year-end edge cases (e.g. an
// anchor of Jan 31 rolling into a 30-day month) by clamping to the last
// valid day of the target month.
export function getNextDueDate(
  anchorDate: string,
  recurrence: 'none' | 'weekly' | 'monthly' | 'yearly',
  today: Date = new Date()
): Date | null {
  const anchor = new Date(anchorDate + 'T00:00:00');
  if (isNaN(anchor.getTime())) return null;

  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (anchor >= startOfToday) return anchor;

  if (recurrence === 'none') return null;

  if (recurrence === 'weekly') {
    const daysSince = Math.floor((startOfToday.getTime() - anchor.getTime()) / (1000 * 60 * 60 * 24));
    const weeksToAdd = Math.ceil(daysSince / 7);
    const next = new Date(anchor);
    next.setDate(next.getDate() + weeksToAdd * 7);
    return next;
  }

  const clampToMonth = (year: number, month: number, day: number) => {
    const lastDay = new Date(year, month + 1, 0).getDate();
    return new Date(year, month, Math.min(day, lastDay));
  };

  if (recurrence === 'monthly') {
    let year = startOfToday.getFullYear();
    let month = startOfToday.getMonth();
    let candidate = clampToMonth(year, month, anchor.getDate());
    if (candidate < startOfToday) {
      month += 1;
      if (month > 11) { month = 0; year += 1; }
      candidate = clampToMonth(year, month, anchor.getDate());
    }
    return candidate;
  }

  // yearly
  let year = startOfToday.getFullYear();
  let candidate = clampToMonth(year, anchor.getMonth(), anchor.getDate());
  if (candidate < startOfToday) {
    candidate = clampToMonth(year + 1, anchor.getMonth(), anchor.getDate());
  }
  return candidate;
}

export type BudgetTermStatus = 'upcoming' | 'active' | 'ended';

// Where `referenceDate` (a local YYYY-MM-DD string, defaulting to today)
// sits relative to a fixed term's optional start/end bounds. A term with
// neither bound set (or no term at all) is always 'active' — plain
// string comparison is safe here since YYYY-MM-DD sorts lexicographically
// the same as chronologically. Bounds are inclusive.
export function getBudgetTermStatus(
  term: BudgetTerm | undefined,
  referenceDate: string = todayLocalDate()
): BudgetTermStatus {
  if (!term) return 'active';
  if (term.startDate && referenceDate < term.startDate) return 'upcoming';
  if (term.endDate && referenceDate > term.endDate) return 'ended';
  return 'active';
}

// Caps a recurring due date's next occurrence at a fixed term's end
// date. getNextDueDate on its own has no concept of a term, so a
// "monthly" reminder for a car lease or apartment rent would otherwise
// keep resurfacing forever after the lease/rent term actually ended —
// this makes the reminder stop once the term is over.
export function nextDueDateWithinTerm(
  anchorDate: string,
  recurrence: 'none' | 'weekly' | 'monthly' | 'yearly',
  term: BudgetTerm | undefined,
  today: Date = new Date()
): Date | null {
  const next = getNextDueDate(anchorDate, recurrence, today);
  if (!next || !term?.endDate) return next;
  const end = parseLocalDate(term.endDate);
  return next > end ? null : next;
}

// Custom categories are stored as { key: label }. Every place that lets a
// user type a new category name (TransactionModal, BudgetModal, the AI
// review screen) must go through this, or the same label ends up minted
// as multiple distinct keys — which then get double-counted separately
// in reports and budgets. If a category with the same label (trimmed,
// case-insensitive) already exists, its key is reused; only a genuinely
// new label gets a new key.
export function getOrCreateCategoryKey(
  label: string,
  existingCustomCategories: Record<string, string>
): { key: string; isNew: boolean } {
  const trimmed = label.trim();
  const normalized = trimmed.toLowerCase();
  const existingEntry = Object.entries(existingCustomCategories).find(
    ([, existingLabel]) => existingLabel.trim().toLowerCase() === normalized
  );
  if (existingEntry) {
    return { key: existingEntry[0], isNew: false };
  }
  const slug = trimmed.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_\u0600-\u06FF]/g, '');
  return { key: `custom_${slug}_${Date.now()}`, isNew: true };
}

// Resolves a transaction/budget category key to its display label.
// Built-in categories (catGroceries, catOther, etc.) live in the
// translations file; user-minted custom categories (see
// getOrCreateCategoryKey above) live in customCategories/
// customIncomeCategories instead and are NOT in translations — so a
// lookup that only checks `tr` shows the raw internal key (e.g.
// "custom_suger_1784775632372") for any custom category. Several
// components used to reimplement this lookup independently and most of
// them forgot the custom-category fallback; this is the one place it
// should happen going forward.
export function resolveCategoryLabel(
  key: string,
  tr: Record<string, string>,
  customCategories: Record<string, string> = {},
  customIncomeCategories: Record<string, string> = {}
): string {
  return tr[key] || customCategories[key] || customIncomeCategories[key] || key;
}
