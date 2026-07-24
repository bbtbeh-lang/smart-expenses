import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { PLANS, PlanId, BillingPeriod } from '@/lib/plans';

// Changes the plan/billing period on a user's EXISTING active Stripe
// subscription (upgrade or downgrade), instead of starting a brand new
// subscription via Checkout. Stripe prorates the difference automatically:
//   - Upgrades are charged immediately (the prorated difference is invoiced
//     and charged to the customer's saved payment method right away).
//   - Downgrades are credited as a balance applied to the next invoice.
// The `subscriptions` table itself is NOT written here — the Stripe webhook
// (customer.subscription.updated) is the single source of truth and updates
// Supabase once Stripe confirms the change.
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

    const isUpgrade =
      PLANS[plan].monthlyPriceCAD * (billingPeriod === 'yearly' ? 1 / 12 : 1) >
      (sub.plan && sub.plan !== 'free'
        ? PLANS[sub.plan as PlanId].monthlyPriceCAD * (sub.billing_period === 'yearly' ? 1 / 12 : 1)
        : 0);

    const updated = await stripe.subscriptions.update(sub.stripe_subscription_id, {
      items: [{ id: itemId, price: newPriceId }],
      // Upgrades: invoice and charge the prorated difference right now.
      // Downgrades: still calculate the proration, but just credit it to
      // the next invoice instead of charging/refunding immediately.
      proration_behavior: isUpgrade ? 'always_invoice' : 'create_prorations',
      payment_behavior: 'error_if_incomplete',
      metadata: {
        supabase_user_id: user.id,
        plan,
        billing_period: billingPeriod,
      },
    });

    return NextResponse.json({ success: true, status: updated.status, isUpgrade });
  } catch (err: any) {
    console.error('Stripe change-plan error:', err);
    // Most common case here: the proration charge was declined by the card.
    return NextResponse.json({ error: err.message || 'Plan change failed' }, { status: 400 });
  }
}
