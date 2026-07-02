import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { scanLimitForPlan } from '@/lib/plans';

export async function POST(req: NextRequest) {
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

  const plan = sub && sub.status === 'active' ? sub.plan : 'free';
  const limit = scanLimitForPlan(plan);
  const used = sub?.scans_used_this_period || 0;

  if (used >= limit) {
    return NextResponse.json({ allowed: false, scansUsed: used, scanLimit: limit }, { status: 200 });
  }

  if (sub) {
    await supabaseAdmin
      .from('subscriptions')
      .update({ scans_used_this_period: used + 1, updated_at: new Date().toISOString() })
      .eq('user_id', userId);
  } else {
    // No row yet (free tier, never subscribed) — create one to track usage.
    await supabaseAdmin.from('subscriptions').insert({
      user_id: userId,
      plan: 'free',
      status: 'inactive',
      scans_used_this_period: 1,
    });
  }

  return NextResponse.json({ allowed: true, scansUsed: used + 1, scanLimit: limit });
}
