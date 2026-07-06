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

  const { receiptHash } = await req.json();
  if (!receiptHash) {
    return NextResponse.json({ error: 'Missing receiptHash' }, { status: 400 });
  }

  const { data: scan } = await supabaseAdmin
    .from('receipt_scans')
    .select('storage_path')
    .eq('user_id', userData.user.id)
    .eq('phash', receiptHash)
    .not('storage_path', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!scan?.storage_path) {
    return NextResponse.json({ error: 'No archived image found' }, { status: 404 });
  }

  const { data: signed, error: signError } = await supabaseAdmin.storage
    .from('receipts')
    .createSignedUrl(scan.storage_path, 60 * 5); // valid for 5 minutes

  if (signError || !signed) {
    return NextResponse.json({ error: 'Failed to create link' }, { status: 500 });
  }

  return NextResponse.json({ url: signed.signedUrl });
}
