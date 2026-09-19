import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { isAdminEmail } from '@/lib/adminAuth';

async function requireAdmin(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) return null;
  const { data } = await supabaseAdmin.auth.getUser(token);
  if (!data?.user || !isAdminEmail(data.user.email)) return null;
  return data.user;
}

// GET: list every trial code plus how many times each has been
// activated today, so the admin can see at a glance whether a code is
// approaching its daily_cap without leaving this page.
export async function GET(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data: codes, error } = await supabaseAdmin
    .from('trial_codes')
    .select('id, code, scan_limit, valid_days, daily_cap, active, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Failed to load trial codes' }, { status: 500 });
  }

  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);

  const { data: todayRedemptions } = await supabaseAdmin
    .from('trial_redemptions')
    .select('trial_code_id')
    .gte('redeemed_at', startOfToday.toISOString());

  const todayCounts = new Map<string, number>();
  for (const r of todayRedemptions || []) {
    todayCounts.set(r.trial_code_id, (todayCounts.get(r.trial_code_id) || 0) + 1);
  }

  return NextResponse.json({
    codes: (codes || []).map(c => ({
      id: c.id,
      code: c.code,
      scanLimit: c.scan_limit,
      validDays: c.valid_days,
      dailyCap: c.daily_cap,
      active: c.active,
      createdAt: c.created_at,
      activationsToday: todayCounts.get(c.id) || 0,
    })),
  });
}

// POST: create a new code, or update an existing one by passing its id.
// Every field is admin-settable so Behnaz can tune a campaign (or launch
// a new one) without needing a code change each time.
export async function POST(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json().catch(() => null);
  const id: string | undefined = body?.id;
  const code: string | undefined = body?.code?.trim()?.toUpperCase();
  const scanLimit = Number(body?.scanLimit);
  const validDays = Number(body?.validDays);
  const dailyCapRaw = body?.dailyCap;
  const dailyCap = dailyCapRaw === null || dailyCapRaw === '' || dailyCapRaw === undefined
    ? null
    : Number(dailyCapRaw);
  const active = body?.active !== false;

  if (!code || !Number.isFinite(scanLimit) || scanLimit <= 0 || !Number.isFinite(validDays) || validDays <= 0) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  }
  if (dailyCap !== null && (!Number.isFinite(dailyCap) || dailyCap <= 0)) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  }

  const row = { code, scan_limit: scanLimit, valid_days: validDays, daily_cap: dailyCap, active };

  const { data, error } = id
    ? await supabaseAdmin.from('trial_codes').update(row).eq('id', id).select().single()
    : await supabaseAdmin.from('trial_codes').insert(row).select().single();

  if (error) {
    const message = error.code === '23505' ? 'code_already_exists' : 'save_failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, code: data });
}
