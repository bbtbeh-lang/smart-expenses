import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { isAdminEmail } from '@/lib/adminAuth';
import { generateDailyCode } from '@/lib/codeGenerator';

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: userData } = await supabaseAdmin.auth.getUser(token);
  if (!userData?.user || !isAdminEmail(userData.user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const code = generateDailyCode();

  const { error } = await supabaseAdmin.from('daily_codes').insert({
    code,
    valid_date: today,
    uses: 0,
    max_uses: 500,
  });

  if (error) {
    console.error('Code generation error:', error);
    return NextResponse.json({ error: 'Failed to generate code' }, { status: 500 });
  }

  return NextResponse.json({ code, validDate: today, maxUses: 500 });
}
