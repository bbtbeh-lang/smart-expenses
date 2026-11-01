import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { LEGAL_VERSION } from '@/lib/legal';

// Records that the signed-in person accepted the current Terms + Privacy
// Policy. The time comes from the database clock, never from the client, and
// the table is writable only with the service role, so the person (or a
// script on their behalf) can't edit or back-date it.
export async function POST(req: NextRequest) {
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { error: insertError } = await supabaseAdmin
    .from('user_consents')
    .upsert(
      { user_id: data.user.id, document: 'terms_privacy', version: LEGAL_VERSION },
      { onConflict: 'user_id,document,version', ignoreDuplicates: true }
    );
  if (insertError) {
    console.error('consent record failed:', insertError.message);
    return NextResponse.json({ error: 'Could not record consent' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
