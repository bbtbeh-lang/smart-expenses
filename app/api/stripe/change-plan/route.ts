import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { upsertSubscriptionFromStripe } from '@/lib/subscriptionSync';
import { PLANS, PlanId, BillingPeriod } from '@/lib/plans';

// Changes the plan/billing period on a user's EXISTING active Stripe
// subscription (upgrade or downgrade), instead of starting a brand new
// subscription via Checkout. Stripe prorates the difference automatically:
//   - Upgrades are charged immediately (the prorated difference is invoiced
//     and charged to the customer's saved payment method right away).
//   - Downgrades are credited as a balance applied to the next invoice.
// The `subscriptions` table is written here too (not just via the
// customer.subscription.updated webhook): webhook delivery has enough
// latency that a client refetching its plan right after this call would
// often still see the pre-change plan. Writing synchronously here makes
// the UI update instantly; the webhook remains the source of truth for
// changes that don't originate from this endpoint (renewals, dashboard-
// initiated changes, dunning, etc.) and simply upserts the same row again.
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const user = userData.user;

    const body = await req.json();
    const plan = body.plan as PlanId;
    const billingPeriod = body.billingPeriod as BillingPeriod;

    if (!PLANS[plan] || (billingPeriod !== 'monthly' && billingPeriod !== 'yearly')) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('stripe_subscription_id, status, plan, billing_period')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!sub?.stripe_subscription_id || sub.status !== 'active') {
      return NextResponse.json(
        { error: 'No active subscription to change. Use checkout to start one instead.' },
        { status: 400 }
      );
    }

    if (sub.plan === plan && sub.billing_period === billingPeriod) {
      return NextResponse.json({ error: 'You are already on this plan.' }, { status: 400 });
    }

    const newPriceId = billingPeriod === 'yearly' ? PLANS[plan].yearlyPriceId : PLANS[plan].monthlyPriceId;

    const stripeSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
    const itemId = stripeSub.items.data[0]?.id;
    if (!itemId) {
      return NextResponse.json({ error: 'Subscription item not found' }, { status: 500 });
    }

    // Monthly-equivalent price for each side, so a yearly plan compares
    // fairly against a monthly one. This previously divided monthlyPriceCAD
    // by 12 for a yearly plan instead of annualizing yearlyPriceCAD — e.g.
    // Business yearly ($399/yr, ~$33.25/mo-equivalent) was computed as
    // $39.99/12 = $3.33, which made almost any other plan look like an
    // "upgrade" even when it was strictly cheaper.
    const monthlyEquivalent = (p: PlanId, period: BillingPeriod) =>
      period === 'yearly' ? PLANS[p].yearlyPriceCAD / 12 : PLANS[p].monthlyPriceCAD;

    const isUpgrade =
      monthlyEquivalent(plan, billingPeriod) >
      (sub.plan && sub.plan !== 'free'
        ? monthlyEquivalent(sub.plan as PlanId, (sub.billing_period as BillingPeriod) || 'monthly')
        : 0);

    const updated = await stripe.subscriptions.update(sub.stripe_subscription_id, {
      items: [{ id: itemId, price: newPriceId }],
      // Upgrades: invoice and charge the prorated difference right now.
      // Downgrades: still calculate the proration, but just credit it to
      // the next invoice instead of charging/refunding immediately.
      proration_behavior: isUpgrade ? 'always_invoice' : 'create_prorations',
      payment_behavior: 'error_if_incomplete',
      // BUG FIX: without this, a subscription that was previously set to
      // cancel at period end (see the Customer Portal's "cancel at period
      // end" setting, tracked via subscriptions.cancel_at_period_end)
      // stays flagged to cancel even after the user picks a new plan here
      // — Stripe does not clear cancel_at_period_end just because the
      // price/items changed. Someone landing on this endpoint has, by
      // definition, chosen to keep paying (there's no path here except
      // "select a plan"), so any pending cancellation must be explicitly
      // undone or they'd still lose access at the old period end despite
      // believing they'd just resubscribed/changed plans.
      cancel_at_period_end: false,
      metadata: {
        supabase_user_id: user.id,
        plan,
        billing_period: billingPeriod,
      },
    });

    await upsertSubscriptionFromStripe(user.id, updated);

    return NextResponse.json({ success: true, status: updated.status, isUpgrade });
  } catch (err: any) {
    console.error('Stripe change-plan error:', err);
    // Most common case here: the proration charge was declined by the card.
    return NextResponse.json({ error: err.message || 'Plan change failed' }, { status: 400 });
  }
}
