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
