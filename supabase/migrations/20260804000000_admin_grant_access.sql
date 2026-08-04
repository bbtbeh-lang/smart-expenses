-- Supports admin-granted free access (Settings/Admin panel "Grant Free
-- Access"): a subscription row created directly by an admin, without a
-- Stripe customer/subscription behind it. `granted_by_admin` marks these
-- clearly so the admin panel can badge them and distinguish them from real
-- paying customers in any reporting/MRR math.
alter table subscriptions
  add column if not exists granted_by_admin boolean not null default false;

-- consume_scan() previously relied entirely on Stripe webhooks
-- (upsertSubscriptionFromStripe) to reset scans_used_this_period every
-- billing cycle. Admin-granted rows have no Stripe subscription driving
-- that reset, so their scan count would otherwise just accumulate forever
-- once granted. Self-heal instead: if scan_period_start is more than 30
-- days old, treat this as a new period before checking/consuming — a
-- harmless no-op for normal Stripe-driven rows (their webhook already
-- reset it far more recently than 30 days), and the actual reset
-- mechanism for admin-granted ones.
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
