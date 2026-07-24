import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { planFromPriceId } from '@/lib/plans';
import { sendRenewalReminderEmail } from '@/lib/email';
import Stripe from 'stripe';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature') || '';

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id || session.metadata?.supabase_user_id;
        if (userId && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          await upsertSubscriptionFromStripe(userId, subscription);
        }
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.supabase_user_id;
        if (userId) {
          await upsertSubscriptionFromStripe(userId, subscription);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.supabase_user_id;
        if (userId) {
          await supabaseAdmin
            .from('subscriptions')
            .update({ status: 'canceled', updated_at: new Date().toISOString() })
            .eq('user_id', userId);
        }
        break;
      }

      // Stripe fires this a configurable number of days before an invoice
      // is charged (default 7, configurable in Stripe Dashboard ->
      // Billing -> Subscriptions & emails). We use it to send our own
      // branded reminder rather than relying on Stripe's default email.
      case 'invoice.upcoming': {
        await handleUpcomingInvoice(event.data.object as Stripe.Invoice);
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('Webhook handler error:', err);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

async function upsertSubscriptionFromStripe(userId: string, subscription: Stripe.Subscription) {
  const priceId = subscription.items.data[0]?.price.id;
  const planInfo = priceId ? planFromPriceId(priceId) : null;

  const status = subscription.status === 'active' || subscription.status === 'trialing'
    ? 'active'
    : subscription.status === 'past_due'
    ? 'past_due'
    : 'canceled';

  await supabaseAdmin
    .from('subscriptions')
    .upsert(
      {
        user_id: userId,
        plan: planInfo?.plan || 'free',
        billing_period: planInfo?.billingPeriod || null,
        status,
        stripe_customer_id: subscription.customer as string,
        stripe_subscription_id: subscription.id,
        current_period_end: new Date(subscription.items.data[0].current_period_end * 1000).toISOString(),
        // Reset the monthly scan counter whenever a new plan starts or renews.
        scans_used_this_period: 0,
        scan_period_start: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );
}

// Resolves who the invoice belongs to and emails them a renewal reminder.
// Fails soft throughout: a missing user, missing email, or email-send
// failure is logged and swallowed rather than turned into a 500 — Stripe
// retries 5xx webhook responses, and none of these are worth a retry.
async function handleUpcomingInvoice(invoice: Stripe.Invoice) {
  try {
    const subRef = invoice.parent?.subscription_details?.subscription;
    const subscriptionId = typeof subRef === 'string' ? subRef : subRef?.id;
    if (!subscriptionId) return;

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const userId = subscription.metadata?.supabase_user_id;
    if (!userId) return;

    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
    const email = userData?.user?.email;
    if (userError || !email) {
      console.warn('[webhook] invoice.upcoming: could not resolve email for user', userId);
      return;
    }

    const priceId = subscription.items.data[0]?.price.id;
    const planInfo = priceId ? planFromPriceId(priceId) : null;
    const planName = planInfo ? PLAN_DISPLAY_NAME[planInfo.plan] : 'FinSnap';

    const renewalTimestamp = subscription.items.data[0]?.current_period_end;
    const renewalDate = renewalTimestamp
      ? new Date(renewalTimestamp * 1000).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })
      : '';

    const amount = typeof invoice.amount_due === 'number'
      ? `${(invoice.amount_due / 100).toFixed(2)} ${(invoice.currency || 'cad').toUpperCase()}`
      : '';

    // We don't persist a language preference server-side yet, so this
    // defaults to English. If/when a `lang` column is added to
    // `subscriptions` or `auth.users.user_metadata`, pass it through here.
    await sendRenewalReminderEmail({
      to: email,
      planName,
      amount,
      renewalDate,
      lang: 'EN',
    });
  } catch (err) {
    console.error('[webhook] handleUpcomingInvoice failed:', err);
  }
}

const PLAN_DISPLAY_NAME: Record<'basic' | 'pro' | 'business', string> = {
  basic: 'Basic',
  pro: 'Pro',
  business: 'Business',
};
