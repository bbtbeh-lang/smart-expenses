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
  const userId = userData.user.id;

  const body = await req.json();
  const { receiptHash, merchant, amount, date, image } = body;
  if (!receiptHash) {
    return NextResponse.json({ error: 'Missing receiptHash' }, { status: 400 });
  }

  // Archive the actual receipt photo (not just the extracted data) so
  // business customers have a real supporting document for tax purposes —
  // this is best-effort: if the upload fails, we still record the scan.
  let storagePath: string | null = null;
  if (image) {
    try {
      const path = `${userId}/${receiptHash}.jpg`;
      const buffer = Buffer.from(image, 'base64');
      const { error: uploadError } = await supabaseAdmin.storage
        .from('receipts')
        .upload(path, buffer, { contentType: 'image/jpeg', upsert: true });
      if (!uploadError) storagePath = path;
      else console.error('Receipt image upload failed:', uploadError);
    } catch (err) {
      console.error('Receipt image upload error:', err);
    }
  }

  await supabaseAdmin.from('receipt_scans').insert({
    user_id: userId,
    phash: receiptHash,
    merchant: merchant || null,
    amount: amount || null,
    receipt_date: date || null,
    storage_path: storagePath,
  });

  return NextResponse.json({ ok: true, storagePath });
}

