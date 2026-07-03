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
  const { receiptHash, merchant, amount, date } = body;
  if (!receiptHash) {
    return NextResponse.json({ error: 'Missing receiptHash' }, { status: 400 });
  }

  await supabaseAdmin.from('receipt_scans').insert({
    user_id: userData.user.id,
    phash: receiptHash,
    merchant: merchant || null,
    amount: amount || null,
    receipt_date: date || null,
  });

  return NextResponse.json({ ok: true });
}
