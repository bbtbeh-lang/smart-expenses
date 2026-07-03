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

  const { data: sub } = await supabaseAdmin
    .from('subscriptions')
    .select('*')
    .eq('user_id', userData.user.id)
    .maybeSingle();

  if (!sub || sub.status !== 'active') {
    return NextResponse.json({
      plan: 'free',
      billingPeriod: null,
      status: 'inactive',
      scansUsed: 0,
      scanLimit: scanLimitForPlan('free'),
      currentPeriodEnd: null,
    });
  }

  return NextResponse.json({
    plan: sub.plan,
    billingPeriod: sub.billing_period,
    status: sub.status,
    scansUsed: sub.scans_used_this_period,
    scanLimit: scanLimitForPlan(sub.plan),
    currentPeriodEnd: sub.current_period_end,
  });
}
