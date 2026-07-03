-- Subscriptions table: tracks each user's plan, billing period, and monthly scan usage.
create table if not exists subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'basic', 'pro', 'business')),
  billing_period text check (billing_period in ('monthly', 'yearly')),
  status text not null default 'inactive' check (status in ('inactive', 'active', 'past_due', 'canceled')),
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  scans_used_this_period integer not null default 0,
  scan_period_start timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table subscriptions enable row level security;

-- Users can read only their own subscription row.
create policy "read_own_subscription" on subscriptions
  for select to authenticated
  using (auth.uid() = user_id);

-- No direct insert/update/delete from the client — only the server
-- (using the Supabase service role key inside the Stripe webhook) may write.
-- The service role bypasses RLS entirely, so no additional policy is needed for writes.
