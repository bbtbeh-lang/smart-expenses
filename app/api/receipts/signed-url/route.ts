import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Expense receipts and income invoices are archived into separate tables/
// buckets (receipt_scans/'receipts' vs invoice_scans/'invoices'), so this
// route accepts either hash and looks up the matching pair — the caller
// (an expense vs income transaction) already knows which one it has.
const SOURCES = {
  receiptHash: { table: 'receipt_scans', bucket: 'receipts' },
  invoiceHash: { table: 'invoice_scans', bucket: 'invoices' },
} as const;

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

  const body = await req.json().catch(() => null);
  const receiptHash: unknown = body?.receiptHash;
  const invoiceHash: unknown = body?.invoiceHash;

  const source = typeof receiptHash === 'string' && receiptHash
    ? { ...SOURCES.receiptHash, hash: receiptHash }
    : typeof invoiceHash === 'string' && invoiceHash
    ? { ...SOURCES.invoiceHash, hash: invoiceHash }
    : null;

  if (!source) {
    return NextResponse.json({ error: 'Missing receiptHash or invoiceHash' }, { status: 400 });
  }

  const { data: scan } = await supabaseAdmin
    .from(source.table)
    .select('storage_path')
    .eq('user_id', userData.user.id)
    .eq('phash', source.hash)
    .not('storage_path', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!scan?.storage_path) {
    return NextResponse.json({ error: 'No archived image found' }, { status: 404 });
  }

  const { data: signed, error: signError } = await supabaseAdmin.storage
    .from(source.bucket)
    .createSignedUrl(scan.storage_path, 60 * 5); // valid for 5 minutes

  if (signError || !signed) {
    return NextResponse.json({ error: 'Failed to create link' }, { status: 500 });
  }

  return NextResponse.json({ url: signed.signedUrl });
}
