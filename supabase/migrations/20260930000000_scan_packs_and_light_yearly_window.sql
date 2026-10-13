-- 1) Purchased scan packs ("extra scans") and 2) Light's yearly scan window.
-- (Already applied to the live database; kept here so the repo matches it.)
--
-- extra_scans: scans bought separately as a one-time pack. They sit on top
-- of the plan's own allowance and are spent only AFTER that allowance is
-- used up. Unlike scans_used_this_period they are never reset — the 30-day
-- / yearly refill below only touches the plan allowance — so a pack isn't
-- lost (or re-granted) when the period rolls over.
alter table public.subscriptions
  add column if not exists extra_scans integer not null default 0
  check (extra_scans >= 0);

-- One row per paid Checkout session, keyed by the Stripe session id. The
-- primary key is what makes crediting idempotent: Stripe can deliver the
-- same webhook more than once, and the second delivery must not credit
-- the pack twice. RLS on with no policies = readable/writable only by
-- the service role (the webhook).
create table if not exists public.scan_pack_purchases (
  stripe_session_id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  scans integer not null check (scans > 0),
  created_at timestamptz not null default now()
);
alter table public.scan_pack_purchases enable row level security;

create or replace function public.add_extra_scans(
  p_user_id uuid, p_amount integer, p_session_id text
) returns boolean
language plpgsql
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_inserted int;
begin
  insert into scan_pack_purchases (stripe_session_id, user_id, scans)
  values (p_session_id, p_user_id, p_amount)
  on conflict (stripe_session_id) do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then
    return false; -- this session was already credited
  end if;

  update subscriptions
  set extra_scans = extra_scans + p_amount, updated_at = now()
  where user_id = p_user_id;
  return true;
end;
$function$;

-- Crediting scans must only ever happen from the webhook (service role).
revoke all on function public.add_extra_scans(uuid, integer, text) from public, anon, authenticated;
grant execute on function public.add_extra_scans(uuid, integer, text) to service_role;

-- consume_scan, now with:
--  * a 365-day refill window for Light ('basic'), whose allowance is 50
--    scans per YEAR. The previous version refilled every plan every 30
--    days, which silently made Light 50 scans/month (600/year).
--  * spending extra_scans once the plan allowance is exhausted.
-- scan_limit returned = plan allowance + remaining extra scans, so the
-- client's "limit - used" is always the total scans left.
create or replace function public.consume_scan(p_user_id uuid)
returns table(allowed boolean, scans_used integer, scan_limit integer)
language plpgsql
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_plan text;
  v_status text;
  v_used int;
  v_limit int;
  v_extra int;
  v_period_start timestamptz;
  v_granted_by_admin boolean;
  v_window interval;
begin
  select plan, status, scans_used_this_period, scan_period_start, granted_by_admin, extra_scans
  into v_plan, v_status, v_used, v_period_start, v_granted_by_admin, v_extra
  from subscriptions
  where user_id = p_user_id
  for update;

  if v_plan is null or v_status is distinct from 'active' then
    return query select false, 0, 0;
    return;
  end if;

  v_window := case when v_plan = 'basic' then interval '365 days' else interval '30 days' end;
  if v_period_start is null or v_period_start < now() - v_window then
    v_used := 0;
    update subscriptions set scans_used_this_period = 0, scan_period_start = now()
    where user_id = p_user_id;
  end if;

  if v_granted_by_admin then
    update subscriptions set scans_used_this_period = v_used + 1, updated_at = now()
    where user_id = p_user_id;
    return query select true, v_used + 1, -1;
    return;
  end if;

  v_limit := case v_plan
    when 'starter' then 0
    when 'basic' then 50
    when 'pro' then 250
    when 'business' then 600
    else 0
  end;
  v_extra := coalesce(v_extra, 0);

  if v_used >= v_limit then
    if v_extra > 0 then
      update subscriptions set extra_scans = extra_scans - 1, updated_at = now()
      where user_id = p_user_id;
      return query select true, v_used, v_limit + v_extra - 1;
      return;
    end if;
    return query select false, v_used, v_limit;
    return;
  end if;

  update subscriptions set scans_used_this_period = v_used + 1, updated_at = now()
  where user_id = p_user_id;

  return query select true, v_used + 1, v_limit + v_extra;
end;
$function$;
