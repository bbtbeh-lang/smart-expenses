import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { isAdminEmail } from '@/lib/adminAuth';

// Admin-only: lists every signed-up user alongside their subscription row
// (plan, status, scan usage), so the person running this app doesn't have
// to jump into the Supabase dashboard just to see who's using the product.
//
// Pulls from two places and merges them in memory:
//   - auth.users (via the service-role admin API) for email/created_at
//   - the `subscriptions` table for plan/status/usage
// A user with no subscriptions row yet (brand new signup) still shows up,
// with plan defaulted to 'free'.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: userData } = await supabaseAdmin.auth.getUser(token);
  if (!userData?.user || !isAdminEmail(userData.user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Supabase's admin listUsers is paginated (max 1000/page). Walk pages
  // until exhausted — fine for the scale of a single-app customer list.
  const allUsers: { id: string; email: string | null; created_at: string }[] = [];
  let page = 1;
  const perPage = 200;
  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) {
      return NextResponse.json({ error: 'Failed to list users' }, { status: 500 });
    }
    allUsers.push(...data.users.map(u => ({ id: u.id, email: u.email ?? null, created_at: u.created_at })));
    if (data.users.length < perPage) break;
    page += 1;
    if (page > 25) break; // safety cap (~5000 users) against a runaway loop
  }

  const { data: subs } = await supabaseAdmin
    .from('subscriptions')
    .select('user_id, plan, billing_period, status, scans_used_this_period, current_period_end, cancel_at_period_end, stripe_customer_id, granted_by_admin');

  const { data: profiles } = await supabaseAdmin
    .from('user_profiles')
    .select('user_id, birth_date');

  const subsByUserId = new Map((subs || []).map(s => [s.user_id, s]));
  const profileByUserId = new Map((profiles || []).map(p => [p.user_id, p]));

  const customers = allUsers
    .map(u => {
      const sub = subsByUserId.get(u.id);
      const profile = profileByUserId.get(u.id);
      return {
        userId: u.id,
        email: u.email,
        createdAt: u.created_at,
        birthDate: profile?.birth_date ?? null,
        plan: sub?.plan ?? 'free',
        billingPeriod: sub?.billing_period ?? null,
        status: sub?.status ?? 'inactive',
        scansUsed: sub?.scans_used_this_period ?? 0,
        currentPeriodEnd: sub?.current_period_end ?? null,
        cancelAtPeriodEnd: sub?.cancel_at_period_end === true,
        stripeCustomerId: sub?.stripe_customer_id ?? null,
        grantedByAdmin: sub?.granted_by_admin ?? false,
      };
    })
    // Most recently signed up first.
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json({ customers, total: customers.length });
}
