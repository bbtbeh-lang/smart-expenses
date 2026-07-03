import { createClient } from '@supabase/supabase-js';

// This file must only ever be imported from server-side code (API routes).
// The service role key bypasses Row Level Security, so it must never reach the browser.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
