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

  // Parsed defensively and type-checked the same way record-income-scan
  // already does — a malformed body previously could reach the insert
  // below with the wrong JS type per column (e.g. amount as a string),
  // which either fails silently against the numeric column or coerces
  // unexpectedly.
  const body = await req.json().catch(() => null);
  const receiptHash: unknown = body?.receiptHash;
  const merchant: unknown = body?.merchant;
  const amount: unknown = body?.amount;
  const date: unknown = body?.date;
  const image: unknown = body?.image;

  if (!receiptHash || typeof receiptHash !== 'string') {
    return NextResponse.json({ error: 'Missing receiptHash' }, { status: 400 });
  }

  // Archive the actual receipt photo (not just the extracted data) so
  // business customers have a real supporting document for tax purposes —
  // this is best-effort: if the upload fails, we still record the scan.
  let storagePath: string | null = null;
  if (image && typeof image === 'string') {
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

  // Best-effort record, same as the image upload above: an OCR scan
  // already happened and the transaction is already saved by this point,
  // so a DB hiccup here shouldn't surface as a failure to the person — it
  // only means duplicate detection loses this one entry.
  try {
    const { error: insertError } = await supabaseAdmin.from('receipt_scans').insert({
      user_id: userId,
      phash: receiptHash,
      merchant: typeof merchant === 'string' ? merchant : null,
      amount: typeof amount === 'number' ? amount : null,
      receipt_date: typeof date === 'string' ? date : null,
      storage_path: storagePath,
    });
    if (insertError) console.error('receipt_scans insert failed:', insertError);
  } catch (err) {
    console.error('receipt_scans insert error:', err);
  }

  return NextResponse.json({ ok: true, storagePath });
}

