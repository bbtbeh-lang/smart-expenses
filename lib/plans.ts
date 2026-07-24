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
    monthlyPriceId: 'price_1ToFJsQyfdnvMWfzwnEhY2GB',
    yearlyPriceId: 'price_1ToFPIQyfdnvMWfzdxGkn9Zn',
    monthlyPriceCAD: 6.99,
    yearlyPriceCAD: 69,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    scanLimit: 250,
    monthlyPriceId: 'price_1ToFR6QyfdnvMWfz3t79GkxA',
    yearlyPriceId: 'price_1ToFRrQyfdnvMWfz5RohddTE',
    monthlyPriceCAD: 19.99,
    yearlyPriceCAD: 199,
  },
  business: {
    id: 'business',
    name: 'Business',
    scanLimit: 600,
    monthlyPriceId: 'price_1ToFSwQyfdnvMWfzvWKOTJBn',
    yearlyPriceId: 'price_1ToFTaQyfdnvMWfzPKRNZd5w',
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
