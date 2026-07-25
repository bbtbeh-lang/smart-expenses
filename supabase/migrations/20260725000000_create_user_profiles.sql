-- Lightweight per-user profile table for personal info that isn't part of
-- billing (subscriptions) or app state (kept client-side in localStorage).
-- Starts with just birth_date for CRM purposes; extend with more columns
-- here rather than creating a new table per field.
create table if not exists user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  birth_date date,
  updated_at timestamptz not null default now()
);

alter table user_profiles enable row level security;

-- Unlike `subscriptions` (server-write-only via webhook), this is
-- self-service: a user can read and edit their own profile info directly.
create policy "read_own_profile" on user_profiles
  for select to authenticated
  using (auth.uid() = user_id);

create policy "upsert_own_profile" on user_profiles
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy "update_own_profile" on user_profiles
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
