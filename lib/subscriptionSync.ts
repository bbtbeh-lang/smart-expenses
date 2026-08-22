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
  const currentPeriodEndIso = periodEndSeconds ? new Date(periodEndSeconds * 1000).toISOString() : null;
  const plan = planInfo?.plan || 'free';
  // The Stripe Customer Portal is configured for "cancel at period end"
  // (not immediate) — this is Stripe's own flag for that pending state.
  // While true, `status` still reports 'active' (correctly, since the
  // user paid for and should keep access through the current period);
  // this is what lets the UI show a "your plan ends on [date]" notice
  // instead of access just vanishing with no warning once the period
  // actually ends and Stripe fires customer.subscription.deleted.
  const cancelAtPeriodEnd = subscription.cancel_at_period_end === true;

  // BUG FIX: this used to reset scans_used_this_period unconditionally on
  // every call — including customer.subscription.updated events fired for
  // reasons that have nothing to do with a new billing period (a payment
  // method update, a coupon applied from the Stripe dashboard, a metadata
  // edit, etc). Any of those silently refilled a user's scan quota mid-
  // cycle. Only reset when this call actually represents a new period or
  // plan: no existing row (first-time subscribe), the plan changed
  // (upgrade/downgrade), or Stripe's current_period_end moved forward
  // (a genuine renewal).
  const { data: existing } = await supabaseAdmin
    .from('subscriptions')
    .select('plan, current_period_end')
    .eq('user_id', userId)
    .maybeSingle();

  const isNewPeriod =
    !existing ||
    existing.plan !== plan ||
    existing.current_period_end !== currentPeriodEndIso;

  const { error } = await supabaseAdmin
    .from('subscriptions')
    .upsert(
      {
        user_id: userId,
        plan,
        billing_period: planInfo?.billingPeriod || null,
        status,
        stripe_customer_id: subscription.customer as string,
        stripe_subscription_id: subscription.id,
        current_period_end: currentPeriodEndIso,
        cancel_at_period_end: cancelAtPeriodEnd,
        updated_at: new Date().toISOString(),
        // Only included (and thus only written) when it's a genuine new
        // period/plan — omitting these keys on a no-op update leaves the
        // existing counter untouched instead of overwriting it with 0.
        ...(isNewPeriod
          ? { scans_used_this_period: 0, scan_period_start: new Date().toISOString() }
          : {}),
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
