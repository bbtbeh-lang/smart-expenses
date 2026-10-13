import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { SCAN_PACK, SCAN_PACK_ENABLED } from '@/lib/plans';
import { getSafeOrigin } from '@/lib/safeOrigin';

// Starts a one-time Checkout for an extra-scans pack. The credit itself is
// NOT given here — it's given by the webhook once Stripe confirms the
// payment (checkout.session.completed, mode "payment"), so a user can't
// get scans by just hitting a success URL.
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const user = userData.user;

    if (!SCAN_PACK_ENABLED) {
      return NextResponse.json({ error: 'Scan packs are not available yet' }, { status: 503 });
    }

    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('status, granted_by_admin, stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle();

    // Packs top up a paid plan; scanning needs an active plan in the first
    // place, so there's nothing for a free account to top up.
    if (!sub || sub.status !== 'active') {
      return NextResponse.json({ error: 'Scan packs need an active plan' }, { status: 403 });
    }
    if (sub.granted_by_admin) {
      return NextResponse.json({ error: 'Your account already has unlimited scans' }, { status: 400 });
    }

    let customerId = sub.stripe_customer_id || undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email || undefined,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
    }

    const origin = getSafeOrigin(req);

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer: customerId,
      line_items: [{ price: SCAN_PACK.priceId, quantity: 1 }],
      client_reference_id: user.id,
      metadata: { supabase_user_id: user.id, type: 'scan_pack' },
      success_url: `${origin}/?scan_pack=success`,
      cancel_url: `${origin}/?scan_pack=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('Scan pack checkout error:', err);
    return NextResponse.json({ error: err.message || 'Checkout failed' }, { status: 500 });
  }
}
