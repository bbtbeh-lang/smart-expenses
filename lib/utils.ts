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
