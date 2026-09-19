import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) {
    return Response.json({ error: 'not_authenticated' }, { status: 401 });
  }

  const { data: userData, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !userData?.user) {
    return Response.json({ error: 'not_authenticated' }, { status: 401 });
  }
  const userId = userData.user.id;

  const body = await req.json().catch(() => null);
  const code: string | undefined = body?.code;
  if (!code || typeof code !== 'string' || code.trim().length === 0) {
    return Response.json({ error: 'invalid_code' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.rpc('redeem_trial_code', {
    p_user_id: userId,
    p_code: code.trim().toUpperCase(),
  });

  if (error) {
    console.error('redeem_trial_code RPC error:', error);
    return Response.json({ error: 'server_error' }, { status: 500 });
  }

  if (!data?.ok) {
    const status = data?.error === 'invalid_code' ? 404 : 400;
    return Response.json({ error: data?.error ?? 'unknown_error' }, { status });
  }

  return Response.json({
    ok: true,
    expiresAt: data.expires_at,
    scanLimit: data.scan_limit,
  });
}
