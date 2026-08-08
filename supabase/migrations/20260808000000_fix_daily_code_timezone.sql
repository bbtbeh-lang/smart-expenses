-- BUG: redeem_daily_code() compared valid_date against Postgres's
-- current_date, which reflects the DATABASE session timezone (UTC on
-- Supabase), not the user's local calendar day. Toronto is UTC-4/-5, so
-- the UTC date rolls over ~4-5 hours before Toronto midnight — meaning
-- every evening, a code generated (and still valid) for "today" in
-- Toronto was rejected as invalid_or_expired because the server's
-- current_date had already ticked over to tomorrow's UTC date. This is
-- the exact class of bug already fixed for transaction dates and month
-- labels (see lib/utils.ts todayLocalDate/parseLocalDate) — it was just
-- missed here because this logic lives in a SQL function, not app code.
--
-- Fix: accept the caller's local calendar date explicitly instead of
-- trusting the DB's timezone. p_local_date defaults to current_date so
-- any caller that hasn't been updated yet keeps working exactly as
-- before (old behavior, not a breaking change) — but /api/code/apply and
-- the admin code endpoints now pass the browser's local date.
create or replace function redeem_daily_code(
  p_user_id uuid,
  p_code text,
  p_local_date date default current_date
)
returns table(success boolean, message text) as $$
declare
  v_uses int;
  v_max_uses int;
  v_already_used boolean;
begin
  select uses, max_uses into v_uses, v_max_uses
  from daily_codes
  where code = p_code and valid_date = p_local_date
  for update;

  if v_uses is null then
    return query select false, 'invalid_or_expired';
    return;
  end if;

  if v_uses >= v_max_uses then
    return query select false, 'limit_reached';
    return;
  end if;

  select exists(
    select 1 from code_usages where user_id = p_user_id and code = p_code
  ) into v_already_used;

  if v_already_used then
    return query select false, 'already_used';
    return;
  end if;

  insert into code_usages (user_id, code, used_date) values (p_user_id, p_code, p_local_date);
  update daily_codes set uses = uses + 1 where code = p_code and valid_date = p_local_date;

  return query select true, 'ok';
end;
$$ language plpgsql;
