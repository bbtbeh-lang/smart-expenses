-- Updates the plan scan limits inside consume_scan() to match lib/plans.ts:
--   basic:    30 -> 50
--   pro:      200 -> 250
--   business: 500 -> 600
create or replace function consume_scan(p_user_id uuid)
returns table(allowed boolean, scans_used integer, scan_limit integer) as $$
declare
  v_plan text;
  v_status text;
  v_used int;
  v_limit int;
begin
  select plan, status, scans_used_this_period into v_plan, v_status, v_used
  from subscriptions
  where user_id = p_user_id
  for update;

  if v_plan is null or v_status is distinct from 'active' then
    -- No row, or no active paid plan: scanning is not available at all.
    return query select false, 0, 0;
    return;
  end if;

  v_limit := case v_plan
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
