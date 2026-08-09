-- SECURITY BUG: daily_codes had two RLS policies granting the public
-- `anon` and `authenticated` roles blanket access:
--   - "read_daily_codes": SELECT with `using (true)` — literally anyone
--     holding the public Supabase anon key (which is baked into the
--     deployed site's JS bundle and always extractable) could run
--     `supabase.from('daily_codes').select('*')` and read every code
--     ever generated, past/present/future — completely defeating the
--     point of a promotional access code that's supposed to only be
--     obtainable through the intended channel (e.g. a YouTube video).
--   - "update_daily_codes": UPDATE with `using (true) with check (true)`
--     — anyone could directly reset a code's `uses` counter to 0, or
--     inflate `max_uses`, bypassing redeem_daily_code()'s cap logic
--     entirely — no application code needed, just a raw REST/JS call.
--
-- Neither policy was ever needed: every legitimate read/write to this
-- table goes through supabaseAdmin (the service-role key, which bypasses
-- RLS entirely) in the admin API routes, or through redeem_daily_code(),
-- which is also only ever invoked via the service-role client (see
-- /api/code/apply). Compare to the code_usages table created alongside
-- this one, which correctly has no anon/authenticated write policy at
-- all and a read policy scoped to `auth.uid() = user_id` — daily_codes
-- should follow the same default-deny pattern.
drop policy if exists "read_daily_codes" on daily_codes;
drop policy if exists "update_daily_codes" on daily_codes;

-- No replacement policies are added: with RLS enabled and no policies for
-- anon/authenticated, both roles are denied by default, exactly like
-- code_usages already is for writes. The service role (used by every
-- legitimate code path) always bypasses RLS regardless.
