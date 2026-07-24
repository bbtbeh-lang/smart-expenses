export type PlanId = 'basic' | 'pro' | 'business';
export type BillingPeriod = 'monthly' | 'yearly';

export interface PlanConfig {
  id: PlanId;
  name: string;
  scanLimit: number;
  monthlyPriceId: string;
  yearlyPriceId: string;
  monthlyPriceCAD: number;
  yearlyPriceCAD: number;
}

// Price IDs come from the Stripe Dashboard (Product catalog).
// These are safe to expose on the client — they are not secret.
export const PLANS: Record<PlanId, PlanConfig> = {
  basic: {
    id: 'basic',
    name: 'Basic',
    scanLimit: 50,
    monthlyPriceId: 'price_1Twk1jJdj7e5h39ZoMGojgJD',
    yearlyPriceId: 'price_1TwkBEJdj7e5h39ZO2kmZnf0',
    monthlyPriceCAD: 6.99,
    yearlyPriceCAD: 69,
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
