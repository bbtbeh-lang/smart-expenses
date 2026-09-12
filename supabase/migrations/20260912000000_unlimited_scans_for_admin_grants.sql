-- Admin-granted ("comp") subscriptions — testing accounts, partners,
-- free-access grants from the admin panel — should get unlimited OCR
-- scanning, not the same per-plan cap (starter=0/basic=50/pro=250/
-- business=600) a real paying subscriber on that plan gets. Previously
-- consume_scan() only looked at `plan`, so a comped "pro" account was
-- still capped at 250 scans/period just like a paying Pro subscriber.
-- This adds a granted_by_admin bypass: when true, scanning is always
-- allowed and scans_used_this_period is still incremented (for
-- visibility in the admin Customers table), but never blocks.
create or replace function consume_scan(p_user_id uuid)
returns table(allowed boolean, scans_used integer, scan_limit integer) as $$
declare
  v_plan text;
  v_status text;
  v_used int;
  v_limit int;
  v_period_start timestamptz;
  v_granted_by_admin boolean;
begin
  select plan, status, scans_used_this_period, scan_period_start, granted_by_admin
  into v_plan, v_status, v_used, v_period_start, v_granted_by_admin
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

  if v_granted_by_admin then
    -- Comp accounts: unlimited scanning. Still track usage (the admin
    -- Customers table shows "Scans Used") but never deny.
    update subscriptions set scans_used_this_period = v_used + 1, updated_at = now()
    where user_id = p_user_id;
    return query select true, v_used + 1, -1; -- -1 signals "no limit" to callers
    return;
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
