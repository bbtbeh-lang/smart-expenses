import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { stripe } from '@/lib/stripe';

// Deleting the auth user cascades (via ON DELETE CASCADE foreign keys) to
// every table that references it — subscriptions, code_usages,
// receipt_scans, invoice_scans, and transactions — so this single call is
// sufficient to erase all of a user's data, not just their login.
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

  // BUG FIX: this used to only delete the Supabase user, whose cascade
  // wipes the local `subscriptions` row — but never told Stripe anything.
  // A paying customer deleting their account kept getting billed every
  // period indefinitely, and once the local row was gone (cascaded away),
  // there was no longer even a stored stripe_subscription_id to find and
  // cancel by hand later. Cancel immediately (not at period end) since the
  // account and all its data are being erased right now, not just
  // downgraded — best-effort: a Stripe hiccup here shouldn't block the
  // person from deleting their account, so we log and continue either way.
  try {
    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('stripe_subscription_id')
      .eq('user_id', userData.user.id)
      .maybeSingle();
    if (sub?.stripe_subscription_id) {
      await stripe.subscriptions.cancel(sub.stripe_subscription_id);
    }
  } catch (err) {
    console.error('Stripe subscription cancellation on account deletion failed (continuing anyway):', err);
  }

  // Best-effort cleanup of archived receipt/invoice images — Storage
  // objects don't cascade-delete via foreign keys the way Postgres rows
  // do, so we remove them explicitly before deleting the account.
  for (const bucket of ['receipts', 'invoices']) {
    try {
      const { data: files } = await supabaseAdmin.storage.from(bucket).list(userData.user.id);
      if (files && files.length > 0) {
        const paths = files.map(f => `${userData.user.id}/${f.name}`);
        await supabaseAdmin.storage.from(bucket).remove(paths);
      }
    } catch (err) {
      console.error(`${bucket} cleanup on account deletion failed (continuing anyway):`, err);
    }
  }

  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userData.user.id);
  if (deleteError) {
    console.error('Account deletion error:', deleteError);
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
