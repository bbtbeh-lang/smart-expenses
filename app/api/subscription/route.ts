import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { scanLimitForPlan } from '@/lib/plans';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData?.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const userId = userData.user.id;

  const { data: sub } = await supabaseAdmin
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  // --- checkAccess: the two access rules are deliberately independent ---
  // hasScanAccess: an active paid plan grants this, OR an active,
  // unexpired trial-code redemption (see trial_redemptions /
  // consume_trial_scan — a deliberate, intentional exception carved out
  // for the FINSNAP7-style trial campaign; the daily_codes/code_usages
  // system below is untouched and still never grants scan access).
  const isPlanActive = !!sub && sub.status === 'active';

  const { data: trial } = await supabaseAdmin
    .from('trial_redemptions')
    .select('scans_used, scan_limit, expires_at')
    .eq('user_id', userId)
    .gt('expires_at', new Date().toISOString())
    .order('expires_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const hasScanAccess = isPlanActive || !!trial;

  // hasManualAccess: a paid plan grants it too, OR the user redeemed
  // today's code (checked via code_usages, written only by the atomic
  // redeem_daily_code() function — never trust a client-side flag here).
  // BUG FIX (regression from the daily-code timezone fix): code_usages.used_date
  // is now written as the user's local calendar date (see redeem_daily_code
  // and the migration it pairs with), but this was still comparing against
  // the server's UTC "today" — meaning right after a user redeemed a code
  // in the Toronto evening, this check could look for the wrong date and
  // report hasManualAccess: false even though the redemption succeeded.
  let hasManualAccess = isPlanActive;
  if (!hasManualAccess) {
    const { searchParams } = new URL(req.url);
    const localDateRaw = searchParams.get('date') || '';
    const today = /^\d{4}-\d{2}-\d{2}$/.test(localDateRaw)
      ? localDateRaw
      : new Date().toISOString().slice(0, 10);
    const { data: usageToday } = await supabaseAdmin
      .from('code_usages')
      .select('id')
      .eq('user_id', userId)
      .eq('used_date', today)
      .limit(1)
      .maybeSingle();
    hasManualAccess = !!usageToday;
  }

  if (!sub || sub.status !== 'active') {
    return NextResponse.json({
      plan: 'free',
      billingPeriod: null,
      status: 'inactive',
      scansUsed: trial ? trial.scans_used : 0,
      scanLimit: trial ? trial.scan_limit : scanLimitForPlan('free'),
      unlimitedScans: false,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      hasManualAccess,
      hasScanAccess,
      hasStripeSubscription: false,
      trialExpiresAt: trial?.expires_at ?? null,
    });
  }

  // Distinguishes a real Stripe-billed subscription from an active plan
  // row with no Stripe subscription behind it (admin-granted access via
  // /api/admin/grant-access, which deliberately leaves stripe_subscription_id
  // null). The client needs this to decide whether "Change plan" should hit
  // /api/stripe/change-plan (which requires an existing Stripe subscription
  // to modify) or /api/stripe/checkout (which starts a new one) — and
  // whether the Stripe customer portal is even reachable. Plan !== 'free'
  // alone isn't enough: an admin-granted 'starter' plan is active but has
  // nothing in Stripe to change or manage.
  return NextResponse.json({
    plan: sub.plan,
    billingPeriod: sub.billing_period,
    status: sub.status,
    scansUsed: sub.scans_used_this_period,
    scanLimit: scanLimitForPlan(sub.plan),
    // Admin-granted (comp) subscriptions get unlimited OCR scanning —
    // see the granted_by_admin bypass in consume_scan() — so the UI
    // shouldn't show a numeric cap that doesn't actually apply.
    unlimitedScans: sub.granted_by_admin === true,
    currentPeriodEnd: sub.current_period_end,
    cancelAtPeriodEnd: sub.cancel_at_period_end === true,
    hasManualAccess,
    hasScanAccess,
    hasStripeSubscription: !!sub.stripe_subscription_id,
    trialExpiresAt: null,
  });
}
