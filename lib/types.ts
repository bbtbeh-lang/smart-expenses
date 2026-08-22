export type Lang = 'EN' | 'FR' | 'FA';
export type AccountType = 'personal' | 'business';
export type Tier = 'free' | 'premium';
export type PlanId = 'free' | 'starter' | 'basic' | 'pro' | 'business';
export type BillingPeriod = 'monthly' | 'yearly' | null;
export type TransactionType = 'income' | 'expense';
export type AppScreen = 'loading' | 'auth' | 'onboarding' | 'dashboard';

export interface ReceiptItem {
  name: string;
  price: number;
  quantity?: number;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  accountType: AccountType;
  amount: number;
  description: string;
  category: string;
  date: string;
  hasReceipt: boolean;
  merchant?: string;
  taxAmount?: number;
  originalCurrency?: string;
  originalAmount?: number;
  items?: ReceiptItem[];
  receiptHash?: string;
}

export interface AppState {
  screen: AppScreen;
  lang: Lang;
  accountType: AccountType | null;
  tier: Tier;
  plan: PlanId;
  billingPeriod: BillingPeriod;
  scansUsedThisPeriod: number;
  scanLimit: number;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  subscriptionLoaded: boolean;
  hasManualAccess: boolean;
  hasScanAccess: boolean;
  hasStripeSubscription: boolean;
  codeActivated: boolean;
  scansUsedToday: number;
  maxDailyScans: number;
  transactions: Transaction[];
  totalIncome: number;
  totalExpenses: number;
  budgets: Record<string, number>;
  customCategories: Record<string, string>;
  customIncomeCategories: Record<string, string>; // اضافه شده برای دسته‌بندی‌های سفارشی درآمد
  // Calendar due date + recurrence per budget item (category key). `date`
  // is the anchor due date (YYYY-MM-DD); recurrence determines how the
  // *next* occurrence is computed from that anchor.
  budgetDueDates: Record<string, { date: string; recurrence: 'none' | 'weekly' | 'monthly' | 'yearly' }>;
  // Whether an in-app reminder banner should fire within 3 days of the
  // item's (next) due date. Optional per category key, defaults to off.
  budgetReminders: Record<string, boolean>;
  // How often a category's budget amount resets/recalculates against
  // spending. Optional per category key — absent (or 'monthly') keeps
  // the original behavior exactly as before: budget vs. this calendar
  // month's spending. 'quarterly'/'yearly' compare the same amount
  // against the current calendar quarter's/year's spending instead, for
  // categories where a monthly window doesn't fit (insurance, annual
  // software licenses, etc).
  budgetPeriods: Record<string, 'monthly' | 'quarterly' | 'yearly'>;
  // Optional fixed term (start/end date) for a recurring budget item —
  // e.g. a car lease or an apartment rent that's only meant to apply for
  // a known window rather than indefinitely. Both bounds are optional
  // and independent: startDate alone means "active from this date on",
  // endDate alone means "active until this date", both together bound a
  // finite window, and an absent entry (or an entry with neither bound
  // set) means the item is active indefinitely — same opt-in shape as
  // budgetPeriods above, so nothing changes for anyone who doesn't touch
  // this feature.
  budgetTerms: Record<string, BudgetTerm>;
}

export interface BudgetTerm {
  startDate?: string;
  endDate?: string;
}

// NOTE: the actual initial app state lives in freshState() in
// app/page.tsx — this file used to also export a duplicate INITIAL_STATE
// constant that nothing ever imported (dead code, and its values had
// already drifted from freshState()'s real defaults). Removed rather
// than fixed in place, since keeping two independent copies of the same
// shape around is exactly what let them drift in the first place.

export const INCOME_OCR_CATEGORIES = [
  'catSalesRevenue',
  'catServiceRevenue',
  'catConsulting',
  'catCommission',
  'catRental',
  'catOtherIncome',
] as const;

// Hardcoded bypass codes were removed as a security fix — all code
// redemption now goes through the atomic, rate-limited, one-per-user
// redeem_daily_code() flow (see /api/code/apply).
