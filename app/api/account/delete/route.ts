import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Deleting the auth user cascades (via ON DELETE CASCADE foreign keys) to
// every table that references it — subscriptions, code_usages,
// receipt_scans, and transactions — so this single call is sufficient to
// erase all of a user's data, not just their login.
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

  // Best-effort cleanup of archived receipt images — Storage objects don't
  // cascade-delete via foreign keys the way Postgres rows do, so we remove
  // them explicitly before deleting the account.
  try {
    const { data: files } = await supabaseAdmin.storage.from('receipts').list(userData.user.id);
    if (files && files.length > 0) {
      const paths = files.map(f => `${userData.user.id}/${f.name}`);
      await supabaseAdmin.storage.from('receipts').remove(paths);
    }
  } catch (err) {
    console.error('Receipt cleanup on account deletion failed (continuing anyway):', err);
  }

  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userData.user.id);
  if (deleteError) {
    console.error('Account deletion error:', deleteError);
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
