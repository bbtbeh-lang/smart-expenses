import { supabaseAdmin } from '@/lib/supabaseAdmin';

export interface ScanConsumeResult {
  allowed: boolean;
  scansUsed: number;
  scanLimit: number;
  source?: 'paid' | 'trial';
}

/**
 * Atomically checks whether this user has an active plan with scans
 * remaining, and if so, counts one against it — via the consume_scan()
 * database function (row-locked, so two near-simultaneous requests can't
 * both succeed past the limit).
 *
 * If there's no active paid plan, falls back to an active trial-code
 * credit (see /api/code/redeem and consume_trial_scan()) before finally
 * denying. This is the only place that fallback is checked, so any route
 * gated by consumeScan() automatically honors trial credits too.
 */
export async function consumeScan(userId: string): Promise<ScanConsumeResult> {
  const { data, error } = await supabaseAdmin.rpc('consume_scan', { p_user_id: userId });
  if (error) {
    console.error('consume_scan RPC error:', error);
    return { allowed: false, scansUsed: 0, scanLimit: 0 };
  }
  const result = data?.[0];
  if (result?.allowed) {
    return {
      allowed: true,
      scansUsed: result.scans_used ?? 0,
      scanLimit: result.scan_limit ?? 0,
      source: 'paid',
    };
  }

  const { data: trialData, error: trialError } = await supabaseAdmin.rpc('consume_trial_scan', {
    p_user_id: userId,
  });
  if (trialError) {
    console.error('consume_trial_scan RPC error:', trialError);
    return { allowed: false, scansUsed: result?.scans_used ?? 0, scanLimit: result?.scan_limit ?? 0 };
  }
  if (trialData?.ok) {
    return {
      allowed: true,
      scansUsed: trialData.scans_used,
      scanLimit: trialData.scan_limit,
      source: 'trial',
    };
  }

  return { allowed: false, scansUsed: result?.scans_used ?? 0, scanLimit: result?.scan_limit ?? 0 };
}

/**
 * Gives back one scan against the user's quota. Call this if a scan was
 * already consumed via consumeScan() but the OCR call that followed it
 * failed, so the user isn't charged a scan for a request that produced no
 * result. Best-effort: failures here are logged but not thrown, since the
 * OCR error response is already on its way back to the client either way.
 */
export async function refundScan(userId: string, source: 'paid' | 'trial' = 'paid'): Promise<void> {
  const rpcName = source === 'trial' ? 'refund_trial_scan' : 'refund_scan';
  const { error } = await supabaseAdmin.rpc(rpcName, { p_user_id: userId });
  if (error) {
    console.error(`${rpcName} RPC error:`, error);
  }
}
