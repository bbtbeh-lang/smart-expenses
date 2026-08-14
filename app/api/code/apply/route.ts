import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

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

  const body = await req.json();
  const code = String(body.code || '').trim().toUpperCase();
  // The server's own "today" (Postgres current_date, Vercel process clock)
  // is UTC, not the user's local calendar day — see the migration this
  // pairs with. Fall back to a UTC-derived date only if the client didn't
  // send one (older app build mid-rollout), so this never hard-fails.
  const localDateRaw = typeof body.date === 'string' ? body.date : '';
  const localDate = /^\d{4}-\d{2}-\d{2}$/.test(localDateRaw)
    ? localDateRaw
    : new Date().toISOString().slice(0, 10);
  if (!code) {
    return NextResponse.json({ success: false, message: 'missing_code' }, { status: 400 });
  }

  // Throttle guesses before touching redeem_daily_code() at all — up to
  // 10 attempts per rolling 60s per user. This is separate from the
  // one-redemption-per-user-per-day rule: that limits successes, this
  // limits how fast someone can spray guesses trying to find one.
  const { data: allowed, error: rateLimitError } = await supabaseAdmin.rpc('check_code_rate_limit', {
    p_user_id: userData.user.id,
  });
  if (rateLimitError) {
    console.error('check_code_rate_limit error:', rateLimitError);
    return NextResponse.json({ success: false, message: 'server_error' }, { status: 500 });
  }
  if (!allowed) {
    return NextResponse.json({ success: false, message: 'rate_limited' }, { status: 429 });
  }

  // redeem_daily_code() does the validity/cap/already-used checks and the
  // write in a single atomically-locked database call — see the migration
  // for why this can't safely be split into separate check-then-write steps.
  const { data, error } = await supabaseAdmin.rpc('redeem_daily_code', {
    p_user_id: userData.user.id,
    p_code: code,
    p_local_date: localDate,
  });

  if (error) {
    console.error('redeem_daily_code error:', error);
    return NextResponse.json({ success: false, message: 'server_error' }, { status: 500 });
  }

  const result = data?.[0];
  return NextResponse.json({
    success: !!result?.success,
    message: result?.message || 'server_error',
  });
}
