import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Lang } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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
  const formatted = amount.toLocaleString('en-CA', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `$${formatted}`;
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
