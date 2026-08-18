import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { upsertSubscriptionFromStripe } from '@/lib/subscriptionSync';
import { planFromPriceId } from '@/lib/plans';
import { sendRenewalReminderEmail } from '@/lib/email';
import Stripe from 'stripe';

// حیاتی برای صحت signature verification: این روت باید حتماً روی
// Node.js runtime اجرا بشه، نه Edge. Edge runtime می‌تونه بدنه‌ی خام
// درخواست رو طوری هندل کنه که با بایت‌هایی که Stripe امضا کرده مطابقت
// نداشته باشه و constructEvent با خطای Invalid signature fail بشه.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
    // Idempotency guard: if Stripe already FULLY processed this exact
    // event.id (a redelivery after a slow/missed 200), skip reprocessing.
    // This is deliberately a read-only check here — the dedupe row is
    // only INSERTed further down, after the switch/case below completes
    // without throwing.
    //
    // BUG FIX: this used to INSERT the dedupe row up front, before doing
    // any real work. That meant a delivery attempt that inserted the row
    // and then failed partway through processing (subscription upsert
    // error, transient DB issue, etc.) had already marked itself
    // "processed" — every one of Stripe's automatic retries for that
    // same event then hit the unique-violation branch below and returned
    // a no-op 200 without ever actually creating/updating the
    // subscription. From Stripe's side the delivery looked successful;
    // from ours, nothing had happened. This is exactly what happened to
    // a real Starter-plan checkout: the first attempt failed, and every
    // retry after that silently deduped instead of retrying the actual
    // work, leaving the customer's subscription row missing entirely.
    const { data: alreadyProcessed } = await supabaseAdmin
      .from('processed_stripe_events')
      .select('event_id')
      .eq('event_id', event.id)
      .maybeSingle();
    if (alreadyProcessed) {
      return NextResponse.json({ received: true, deduped: true });
    }

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

    // Record this event as processed now that every side effect above
    // has completed without throwing. Insert-first-wins via the primary
    // key — if a concurrent delivery of the same event already inserted
    // this id in the meantime, this fails with a unique-violation, which
    // just means the work was already done by that other request; either
    // way it's safe to tell Stripe we're done.
    const { error: dedupeError } = await supabaseAdmin
      .from('processed_stripe_events')
      .insert({ event_id: event.id, event_type: event.type });
    if (dedupeError && dedupeError.code !== '23505') {
      console.error('processed_stripe_events insert error:', dedupeError);
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('Webhook handler error:', err);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
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

const PLAN_DISPLAY_NAME: Record<'starter' | 'basic' | 'pro' | 'business', string> = {
  starter: 'Starter',
  basic: 'Basic',
  pro: 'Pro',
  business: 'Business',
};
