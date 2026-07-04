export type Lang = 'EN' | 'FR' | 'FA';
export type AccountType = 'personal' | 'business';
export type Tier = 'free' | 'premium';
export type PlanId = 'free' | 'basic' | 'pro' | 'business';
export type BillingPeriod = 'monthly' | 'yearly' | null;
export type TransactionType = 'income' | 'expense';
export type DraftStatus = 'processing' | 'ready';
export type AppScreen = 'auth' | 'onboarding' | 'dashboard';

export interface ReceiptItem {
  name: string;
  price: number;
}

export interface Transaction {
  id: string;
  type: TransactionType;
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
}

export interface DraftTransaction {
  id: string;
  type: TransactionType;
  status: DraftStatus;
  createdAt: number;
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
  subscriptionLoaded: boolean;
  hasManualAccess: boolean;
  hasScanAccess: boolean;
  codeActivated: boolean;
  scansUsedToday: number;
  maxDailyScans: number;
  transactions: Transaction[];
  draftQueue: DraftTransaction[];
  totalIncome: number;
  totalExpenses: number;
  budgets: Record<string, number>;
  customCategories: Record<string, string>;
}

export const INITIAL_STATE: AppState = {
  screen: 'auth',
  lang: 'EN',
  accountType: null,
  tier: 'free',
  plan: 'free',
  billingPeriod: null,
  scansUsedThisPeriod: 0,
  scanLimit: 0,
  currentPeriodEnd: null,
  subscriptionLoaded: false,
  hasManualAccess: false,
  hasScanAccess: false,
  codeActivated: false,
  scansUsedToday: 2,
  maxDailyScans: 2,
  transactions: [],
  draftQueue: [],
  totalIncome: 0,
  totalExpenses: 0,
  budgets: {},
  customCategories: {},
};

// Hardcoded bypass codes were removed as a security fix — all code
// redemption now goes through the atomic, rate-limited, one-per-user
// redeem_daily_code() flow (see /api/code/apply).
