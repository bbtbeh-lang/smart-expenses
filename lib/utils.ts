import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Lang } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getCurrencySymbol(lang: Lang): string {
  return lang === 'FA' ? 'تومان' : '$';
}

// Returns e.g. "$1,234" or "1,234 تومان"
export function formatCurrency(amount: number, lang: Lang, decimals = 0): string {
  const num = amount.toFixed(decimals);
  return lang === 'FA' ? `${num} تومان` : `$${num}`;
}
