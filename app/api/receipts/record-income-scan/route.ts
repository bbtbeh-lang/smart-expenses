import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData?.user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const userId = userData.user.id;

  const body = await req.json().catch(() => null);
  const invoiceHash: unknown = body?.invoiceHash;
  const clientName: unknown = body?.clientName;
  const amount: unknown = body?.amount;
  const date: unknown = body?.date;
  const image: unknown = body?.image;

  if (!invoiceHash || typeof invoiceHash !== 'string') {
    return NextResponse.json({ error: 'Missing invoiceHash' }, { status: 400 });
  }

  let storagePath: string | null = null;
  if (image && typeof image === 'string') {
    try {
      const path = `${userId}/${invoiceHash}.jpg`;
      const buffer = Buffer.from(image, 'base64');
      const { error: uploadError } = await supabaseAdmin.storage
        .from('invoices')
        .upload(path, buffer, { contentType: 'image/jpeg', upsert: true });
      if (!uploadError) storagePath = path;
      else console.error('Invoice image upload failed:', uploadError);
    } catch (err) {
      console.error('Invoice image upload error:', err);
    }
  }

  // Best-effort record: an OCR scan already happened and the transaction is
  // already saved by this point, so a DB hiccup here shouldn't surface as a
  // failure to the person — it only means duplicate detection loses this one
  // entry, not that their income transaction is lost.
  try {
    const { error: insertError } = await supabaseAdmin.from('invoice_scans').insert({
      user_id: userId,
      phash: invoiceHash,
      client_name: typeof clientName === 'string' ? clientName : null,
      amount: typeof amount === 'number' ? amount : null,
      invoice_date: typeof date === 'string' ? date : null,
      storage_path: storagePath,
    });
    if (insertError) console.error('invoice_scans insert failed:', insertError);
  } catch (err) {
    console.error('invoice_scans insert error:', err);
  }

  return NextResponse.json({ ok: true, storagePath });
}
