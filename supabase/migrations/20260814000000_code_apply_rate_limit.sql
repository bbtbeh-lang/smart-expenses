-- SECURITY: /api/code/apply was authenticated but had no limit on how many
-- guesses a single user could throw at it per minute — a logged-in user
-- could brute-force the daily code by spraying requests. Successful
-- redemption was already race-safe (redeem_daily_code locks the row), but
-- nothing throttled the *attempts* themselves.
--
-- This tracks attempts in a small fixed-window counter per user: a rolling
-- 60-second window, reset automatically once it expires, capped at
-- MAX_ATTEMPTS. `for update` + upsert keeps concurrent requests from the
-- same user safely serialized, the same pattern used by redeem_daily_code.
create table if not exists code_attempt_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_start timestamptz not null default now(),
  attempt_count int not null default 0
);

alter table code_attempt_limits enable row level security;

-- No client-facing policies: this table is only ever touched by the
-- service role via check_code_rate_limit(), the same as code_usages is
-- only touched via redeem_daily_code(). Nothing for authenticated/anon
-- clients to select, insert, or update directly.

create or replace function check_code_rate_limit(p_user_id uuid)
returns boolean as $$
declare
  v_window_start timestamptz;
  v_count int;
  v_max_attempts constant int := 10;
  v_window_seconds constant int := 60;
begin
  insert into code_attempt_limits (user_id, window_start, attempt_count)
  values (p_user_id, now(), 1)
  on conflict (user_id) do nothing;

  select window_start, attempt_count into v_window_start, v_count
  from code_attempt_limits
  where user_id = p_user_id
  for update;

  if v_window_start < now() - make_interval(secs => v_window_seconds) then
    update code_attempt_limits
    set window_start = now(), attempt_count = 1
    where user_id = p_user_id;
    return true;
  end if;

  if v_count >= v_max_attempts then
    return false;
  end if;

  update code_attempt_limits
  set attempt_count = attempt_count + 1
  where user_id = p_user_id;

  return true;
end;
$$ language plpgsql;
