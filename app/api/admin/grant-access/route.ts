import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { isAdminEmail } from '@/lib/adminAuth';

type GrantPlan = 'basic' | 'pro' | 'business';
const VALID_PLANS: GrantPlan[] = ['basic', 'pro', 'business'];

// Duration presets. 'lifetime' just means "far enough in the future that
// it never practically expires" — current_period_end is only used for
// display/expiry purposes here, since access itself is gated on
// status = 'active', not on this date (unlike Stripe subs, nothing
// automatically flips status when it passes).
function periodEndFor(duration: string): string {
  const now = new Date();
  if (duration === 'lifetime') return new Date('2099-12-31').toISOString();
  const months = duration === '1_month' ? 1 : duration === '3_months' ? 3 : duration === '1_year' ? 12 : 1;
  now.setMonth(now.getMonth() + months);
  return now.toISOString();
}

// Finds a user by email via the admin listUsers API (same pagination
// pattern as /api/admin/customers — Supabase's admin API has no direct
// "get user by email" lookup).
async function findUserByEmail(email: string) {
  const target = email.trim().toLowerCase();
  let page = 1;
  const perPage = 200;
  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error('Failed to list users');
    const match = data.users.find(u => u.email?.toLowerCase() === target);
    if (match) return match;
    if (data.users.length < perPage) return null;
    page += 1;
    if (page > 25) return null;
  }
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: userData } = await supabaseAdmin.auth.getUser(token);
  if (!userData?.user || !isAdminEmail(userData.user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const email: string | undefined = body?.email;
  const plan: string | undefined = body?.plan;
  const duration: string = body?.duration || '1_month';

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }
  if (!plan || !VALID_PLANS.includes(plan as GrantPlan)) {
    return NextResponse.json({ error: 'Plan must be basic, pro, or business' }, { status: 400 });
  }

  let targetUser;
  try {
    targetUser = await findUserByEmail(email);
  } catch {
    return NextResponse.json({ error: 'Failed to look up user' }, { status: 500 });
  }
  if (!targetUser) {
    return NextResponse.json({ error: 'No FinSnap account found with that email — they need to sign up first.' }, { status: 404 });
  }

  const { error } = await supabaseAdmin
    .from('subscriptions')
    .upsert(
      {
        user_id: targetUser.id,
        plan,
        billing_period: null,
        status: 'active',
        // Deliberately NOT touching stripe_customer_id/stripe_subscription_id
        // here — if this person already has (or later gets) a real Stripe
        // subscription, that upsert path owns those columns and will
        // naturally take back over. Leaving them untouched avoids this
        // grant clobbering a real payment record if one already exists.
        current_period_end: periodEndFor(duration),
        scans_used_this_period: 0,
        scan_period_start: new Date().toISOString(),
        granted_by_admin: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

  if (error) {
    console.error('[admin/grant-access] upsert failed:', error);
    return NextResponse.json({ error: 'Failed to grant access' }, { status: 500 });
  }

  return NextResponse.json({ success: true, email: targetUser.email, plan, periodEnd: periodEndFor(duration) });
}

// Revokes a previously admin-granted subscription (sets status to
// 'canceled' — access is gated on status='active' in consume_scan(), so
// this immediately turns off scanning/premium features). Only ever
// touches rows this same endpoint created (granted_by_admin = true), so
// it can't accidentally cancel someone's real Stripe subscription.
export async function DELETE(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: userData } = await supabaseAdmin.auth.getUser(token);
  if (!userData?.user || !isAdminEmail(userData.user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const email: string | undefined = body?.email;
  if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 });

  let targetUser;
  try {
    targetUser = await findUserByEmail(email);
  } catch {
    return NextResponse.json({ error: 'Failed to look up user' }, { status: 500 });
  }
  if (!targetUser) return NextResponse.json({ error: 'No FinSnap account found with that email' }, { status: 404 });

  const { error } = await supabaseAdmin
    .from('subscriptions')
    .update({ status: 'canceled', updated_at: new Date().toISOString() })
    .eq('user_id', targetUser.id)
    .eq('granted_by_admin', true);

  if (error) {
    console.error('[admin/grant-access] revoke failed:', error);
    return NextResponse.json({ error: 'Failed to revoke access' }, { status: 500 });
  }

  return NextResponse.json({ success: true, email: targetUser.email });
}

