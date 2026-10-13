export type PlanId = 'basic' | 'pro' | 'business';
export type BillingPeriod = 'monthly' | 'yearly';

export interface PlanConfig {
  id: PlanId;
  name: string;
  scanLimit: number;
  monthlyPriceId?: string;
  yearlyPriceId: string;
  monthlyPriceCAD?: number;
  yearlyPriceCAD: number;
  // Basic is deliberately yearly-only: it's a low-commitment "everyday use"
  // tier (50 scans for the whole year, ~1/week) rather than a scaled-down
  // version of Pro/Business's monthly allowance — a monthly price at the
  // same per-scan economics wouldn't make sense at this volume. The UI
  // hides this plan under the Monthly tab and checkout rejects a monthly
  // request for it (see UpgradeModal.tsx / stripe/checkout route).
  yearlyOnly?: boolean;
}

// Price IDs come from the Stripe Dashboard (Product catalog).
// These are safe to expose on the client — they are not secret.
export const PLANS: Record<PlanId, PlanConfig> = {
  basic: {
    id: 'basic',
    name: 'Light',
    scanLimit: 50,
    yearlyPriceId: 'price_1UNeqQJdj7e5h39ZRjKF0BA9',
    yearlyPriceCAD: 19.99,
    yearlyOnly: true,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    scanLimit: 250,
    monthlyPriceId: 'price_1Twk48Jdj7e5h39ZLpSxHJQK',
    yearlyPriceId: 'price_1TwkByJdj7e5h39Z2WDjicVd',
    monthlyPriceCAD: 19.99,
    yearlyPriceCAD: 199,
  },
  business: {
    id: 'business',
    name: 'Business',
    scanLimit: 600,
    monthlyPriceId: 'price_1Twk4VJdj7e5h39Z21RhWlfQ',
    yearlyPriceId: 'price_1TwkCTJdj7e5h39ZWCQRg730',
    monthlyPriceCAD: 39.99,
    yearlyPriceCAD: 399,
  },
};

// Reverse lookup: Stripe price ID -> plan + billing period.
// Used by the webhook to figure out what the customer bought.
export function planFromPriceId(priceId: string): { plan: PlanId; billingPeriod: BillingPeriod } | null {
  for (const plan of Object.values(PLANS)) {
    if (plan.monthlyPriceId === priceId) return { plan: plan.id, billingPeriod: 'monthly' };
    if (plan.yearlyPriceId === priceId) return { plan: plan.id, billingPeriod: 'yearly' };
  }
  return null;
}

export function scanLimitForPlan(plan: PlanId | 'free'): number {
  if (plan === 'free') return 0; // OCR/scanning is exclusive to paying plans — see checkAccess in /api/subscription.
  return PLANS[plan].scanLimit;
}

// One-time "extra scans" pack, bought on top of a plan when its own scans
// run out. The Price is a ONE-TIME price (not recurring) created in the
// Stripe Dashboard ("FinSnap — 50 extra scans"). Credited by the webhook
// (see add_extra_scans in the DB), spent only after the plan's own
// allowance is used up, and never expires or resets with the plan period.
export const SCAN_PACK = {
  scans: 50,
  priceCAD: 9.99,
  priceId: 'price_1UPu0aJdj7e5h39Zn91VlUmI',
};

// Kill switch: if the Price ID is ever blanked/placeholdered again, the UI
// hides the buy button and the API refuses, so nothing ships half-working.
export const SCAN_PACK_ENABLED = !!SCAN_PACK.priceId && !SCAN_PACK.priceId.startsWith('REPLACE_');
