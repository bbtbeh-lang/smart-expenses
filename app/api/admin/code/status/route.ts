import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { isAdminEmail } from '@/lib/adminAuth';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: userData } = await supabaseAdmin.auth.getUser(token);
  if (!userData?.user || !isAdminEmail(userData.user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const { data: codeRow } = await supabaseAdmin
    .from('daily_codes')
    .select('code, uses, max_uses, valid_date')
    .eq('valid_date', today)
    .order('uses', { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({
    code: codeRow?.code || null,
    uses: codeRow?.uses ?? 0,
    maxUses: codeRow?.max_uses ?? 500,
    validDate: codeRow?.valid_date ?? today,
  });
}
