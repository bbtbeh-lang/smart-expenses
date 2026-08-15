-- consume_scan() already denies scanning for the 'starter' plan today
-- (it falls into the `else 0` branch), but only implicitly — the same
-- way it would for a typo'd or unrecognized plan name. Adding an
-- explicit branch makes the 0-scan limit a deliberate, visible decision
-- here instead of relying on the fallback, and means a future change to
-- Starter's scan allowance (or any other new plan) can't be missed by
-- assuming the fallback still means "0" for every unlisted case.
create or replace function consume_scan(p_user_id uuid)
returns table(allowed boolean, scans_used integer, scan_limit integer) as $$
declare
  v_plan text;
  v_status text;
  v_used int;
  v_limit int;
  v_period_start timestamptz;
begin
  select plan, status, scans_used_this_period, scan_period_start
  into v_plan, v_status, v_used, v_period_start
  from subscriptions
  where user_id = p_user_id
  for update;

  if v_plan is null or v_status is distinct from 'active' then
    -- No row, or no active paid plan: scanning is not available at all.
    return query select false, 0, 0;
    return;
  end if;

  if v_period_start is null or v_period_start < now() - interval '30 days' then
    v_used := 0;
    update subscriptions set scans_used_this_period = 0, scan_period_start = now()
    where user_id = p_user_id;
  end if;

  v_limit := case v_plan
    when 'starter' then 0
    when 'basic' then 50
    when 'pro' then 250
    when 'business' then 600
    else 0
  end;

  if v_used >= v_limit then
    return query select false, v_used, v_limit;
    return;
  end if;

  update subscriptions set scans_used_this_period = v_used + 1, updated_at = now()
  where user_id = p_user_id;

  return query select true, v_used + 1, v_limit;
end;
$$ language plpgsql;
