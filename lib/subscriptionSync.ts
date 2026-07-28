import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { planFromPriceId } from '@/lib/plans';
import Stripe from 'stripe';

// Single source of truth for turning a Stripe subscription object into a
// row in our `subscriptions` table. Used by:
//  - the customer.subscription.* webhook handlers (the ultimate source of
//    truth — covers renewals, dashboard-initiated changes, dunning, etc.)
//  - /api/stripe/change-plan, called directly right after
//    stripe.subscriptions.update() succeeds, so the UI reflects the new
//    plan immediately instead of waiting on webhook delivery latency
//    (which was previously a few seconds, long enough that refetching the
//    subscription right after a change showed the stale plan).
export async function upsertSubscriptionFromStripe(userId: string, subscription: Stripe.Subscription) {
  const priceId = subscription.items.data[0]?.price.id;
  const planInfo = priceId ? planFromPriceId(priceId) : null;

  const status = subscription.status === 'active' || subscription.status === 'trialing'
    ? 'active'
    : subscription.status === 'past_due'
    ? 'past_due'
    : 'canceled';

  // Stripe moved current_period_end from the subscription object to each
  // line item in newer API versions; fall back to the subscription-level
  // field (older/other API versions, or if the item is ever missing it)
  // rather than passing `undefined * 1000` into `new Date()`, which
  // produces an Invalid Date and throws on .toISOString().
  const periodEndSeconds =
    subscription.items.data[0]?.current_period_end ??
    (subscription as unknown as { current_period_end?: number }).current_period_end;

  const { error } = await supabaseAdmin
    .from('subscriptions')
    .upsert(
      {
        user_id: userId,
        plan: planInfo?.plan || 'free',
        billing_period: planInfo?.billingPeriod || null,
        status,
        stripe_customer_id: subscription.customer as string,
        stripe_subscription_id: subscription.id,
        current_period_end: periodEndSeconds ? new Date(periodEndSeconds * 1000).toISOString() : null,
        // Reset the monthly scan counter whenever a new plan starts or renews.
        scans_used_this_period: 0,
        scan_period_start: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

  // This previously went unchecked: a failed write (constraint violation,
  // schema mismatch, etc.) would leave the DB row stale while every caller
  // — the webhook handler and the change-plan route alike — still reported
  // success to the client. Surface it instead so the plan-change endpoint
  // returns a real error and the webhook handler's retry/logging kicks in.
  if (error) {
    console.error('[subscriptionSync] upsert failed:', error, { userId, subscriptionId: subscription.id });
    throw new Error(`Failed to save subscription: ${error.message}`);
  }
}
