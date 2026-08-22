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
    .select('birth_date, custom_categories, custom_income_categories, budget_data, saved_pricing_products')
    .eq('user_id', userId)
    .maybeSingle();

  return NextResponse.json({
    birthDate: data?.birth_date ?? null,
    customCategories: data?.custom_categories ?? {},
    customIncomeCategories: data?.custom_income_categories ?? {},
    budgetData: data?.budget_data ?? {},
    savedPricingProducts: data?.saved_pricing_products ?? [],
  });
}

export async function PATCH(req: NextRequest) {
  const userId = await getAuthedUserId(req);
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  const hasBirthDate = Object.prototype.hasOwnProperty.call(body, 'birthDate');
  const birthDate = body.birthDate as string | null;
  const incomingCustomCategories = body.customCategories as Record<string, string> | undefined;
  const incomingCustomIncomeCategories = body.customIncomeCategories as Record<string, string> | undefined;
  const incomingBudgetData = body.budgetData as Record<string, unknown> | undefined;
  const incomingSavedPricingProducts = body.savedPricingProducts as unknown[] | undefined;

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

  // Authoritative replace, not merge: the client already reconciled its
  // local map against the server's on the last sign-in sync (see
  // syncUserCustomCategoryMap in app/page.tsx), so what it sends here is
  // the full, current source of truth — including deletions. Merging here
  // used to make deleted categories immortal: a removed key would survive
  // server-side and get pulled back into local state on the next sign-in.
  if (incomingCustomCategories) {
    updates.custom_categories = incomingCustomCategories;
  }
  if (incomingCustomIncomeCategories) {
    updates.custom_income_categories = incomingCustomIncomeCategories;
  }
  // Same authoritative-replace reasoning as the two fields above — the
  // client always sends its full, already-reconciled budget snapshot.
  if (incomingBudgetData) {
    updates.budget_data = incomingBudgetData;
  }
  // Same authoritative-replace reasoning again — PricingTab always sends
  // its full, current Saved Items list (it's a single localStorage array
  // being mirrored, not a partial delta).
  if (incomingSavedPricingProducts) {
    updates.saved_pricing_products = incomingSavedPricingProducts;
  }

  const { error } = await supabaseAdmin
    .from('user_profiles')
    .upsert(updates, { onConflict: 'user_id' });

  if (error) {
    console.error('profile upsert error:', error);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    customCategories: updates.custom_categories,
    customIncomeCategories: updates.custom_income_categories,
    budgetData: updates.budget_data,
    savedPricingProducts: updates.saved_pricing_products,
  });
}
