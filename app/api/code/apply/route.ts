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
  if (!code) {
    return NextResponse.json({ success: false, message: 'missing_code' }, { status: 400 });
  }

  // redeem_daily_code() does the validity/cap/already-used checks and the
  // write in a single atomically-locked database call — see the migration
  // for why this can't safely be split into separate check-then-write steps.
  const { data, error } = await supabaseAdmin.rpc('redeem_daily_code', {
    p_user_id: userData.user.id,
    p_code: code,
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
