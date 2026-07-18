import { supabaseAdmin } from '@/lib/supabaseAdmin';

export interface ScanConsumeResult {
  allowed: boolean;
  scansUsed: number;
  scanLimit: number;
}

/**
 * Atomically checks whether this user has an active plan with scans
 * remaining, and if so, counts one against it — via the consume_scan()
 * database function (row-locked, so two near-simultaneous requests can't
 * both succeed past the limit). Returns allowed: false for any user
 * without an active paid plan, full stop; there is no free allowance.
 */
export async function consumeScan(userId: string): Promise<ScanConsumeResult> {
  const { data, error } = await supabaseAdmin.rpc('consume_scan', { p_user_id: userId });
  if (error) {
    console.error('consume_scan RPC error:', error);
    return { allowed: false, scansUsed: 0, scanLimit: 0 };
  }
  const result = data?.[0];
  return {
    allowed: !!result?.allowed,
    scansUsed: result?.scans_used ?? 0,
    scanLimit: result?.scan_limit ?? 0,
  };
}
