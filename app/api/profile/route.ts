import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

async function getAuthedUserId(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user.id;
}

export async function GET(req: NextRequest) {
  const userId = await getAuthedUserId(req);
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data } = await supabaseAdmin
    .from('user_profiles')
    .select('birth_date, custom_categories')
    .eq('user_id', userId)
    .maybeSingle();

  return NextResponse.json({
    birthDate: data?.birth_date ?? null,
    customCategories: data?.custom_categories ?? {},
  });
}

export async function PATCH(req: NextRequest) {
  const userId = await getAuthedUserId(req);
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await req.json();
  const hasBirthDate = Object.prototype.hasOwnProperty.call(body, 'birthDate');
  const birthDate = body.birthDate as string | null;
  const incomingCustomCategories = body.customCategories as Record<string, string> | undefined;

  // Basic sanity checks: valid YYYY-MM-DD, not in the future, not
  // implausibly old (guards against fat-finger typos like a 1901 year).
  if (hasBirthDate && birthDate !== null) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    }
    const date = new Date(birthDate + 'T00:00:00');
    const now = new Date();
    const minDate = new Date(now.getFullYear() - 120, now.getMonth(), now.getDate());
    if (isNaN(date.getTime()) || date > now || date < minDate) {
      return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
    }
  }

  const updates: Record<string, unknown> = { user_id: userId, updated_at: new Date().toISOString() };
  if (hasBirthDate) updates.birth_date = birthDate;

  if (incomingCustomCategories) {
    // Merge rather than overwrite: two devices may have minted different
    // custom categories since the last sync, and neither set should be
    // able to erase the other's labels.
    const { data: existing } = await supabaseAdmin
      .from('user_profiles')
      .select('custom_categories')
      .eq('user_id', userId)
      .maybeSingle();
    updates.custom_categories = { ...(existing?.custom_categories ?? {}), ...incomingCustomCategories };
  }

  const { error } = await supabaseAdmin
    .from('user_profiles')
    .upsert(updates, { onConflict: 'user_id' });

  if (error) {
    console.error('profile upsert error:', error);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }

  return NextResponse.json({ success: true, customCategories: updates.custom_categories });
}
