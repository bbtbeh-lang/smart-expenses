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
    .select('birth_date')
    .eq('user_id', userId)
    .maybeSingle();

  return NextResponse.json({ birthDate: data?.birth_date ?? null });
}

export async function PATCH(req: NextRequest) {
  const userId = await getAuthedUserId(req);
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await req.json();
  const birthDate = body.birthDate as string | null;

  // Basic sanity checks: valid YYYY-MM-DD, not in the future, not
  // implausibly old (guards against fat-finger typos like a 1901 year).
  if (birthDate !== null) {
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

  const { error } = await supabaseAdmin
    .from('user_profiles')
    .upsert({ user_id: userId, birth_date: birthDate, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });

  if (error) {
    console.error('profile upsert error:', error);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
