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
  // hasScanAccess: ONLY an active paid plan grants this. The daily code
  // must never appear in this check — that's the whole point of keeping
  // OCR exclusive to paying customers.
  const isPlanActive = !!sub && sub.status === 'active';
  const hasScanAccess = isPlanActive;

  // hasManualAccess: a paid plan grants it too, OR the user redeemed
  // today's code (checked via code_usages, written only by the atomic
  // redeem_daily_code() function — never trust a client-side flag here).
  let hasManualAccess = isPlanActive;
  if (!hasManualAccess) {
    const today = new Date().toISOString().slice(0, 10);
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
      scansUsed: 0,
      scanLimit: scanLimitForPlan('free'),
      currentPeriodEnd: null,
      hasManualAccess,
      hasScanAccess,
    });
  }

  return NextResponse.json({
    plan: sub.plan,
    billingPeriod: sub.billing_period,
    status: sub.status,
    scansUsed: sub.scans_used_this_period,
    scanLimit: scanLimitForPlan(sub.plan),
    currentPeriodEnd: sub.current_period_end,
    hasManualAccess,
    hasScanAccess,
  });
}
