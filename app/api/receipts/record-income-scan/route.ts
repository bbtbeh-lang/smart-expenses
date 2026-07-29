import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData?.user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const userId = userData.user.id;

  const body = await req.json();
  const { invoiceHash, clientName, amount, date, image } = body;
  if (!invoiceHash) return NextResponse.json({ error: 'Missing invoiceHash' }, { status: 400 });

  let storagePath: string | null = null;
  if (image) {
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

  await supabaseAdmin.from('invoice_scans').insert({
    user_id: userId,
    phash: invoiceHash,
    client_name: clientName || null,
    amount: amount || null,
    invoice_date: date || null,
    storage_path: storagePath,
  });

  return NextResponse.json({ ok: true, storagePath });
}
