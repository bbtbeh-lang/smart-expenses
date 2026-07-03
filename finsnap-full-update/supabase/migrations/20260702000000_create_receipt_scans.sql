-- Stores a perceptual hash ("fingerprint") of every saved receipt image per
-- user, so we can warn them if they scan the same physical receipt twice.
create table if not exists receipt_scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  phash text not null,
  merchant text,
  amount numeric,
  receipt_date date,
  created_at timestamptz not null default now()
);

create index if not exists receipt_scans_user_id_idx on receipt_scans(user_id);
create index if not exists receipt_scans_user_created_idx on receipt_scans(user_id, created_at desc);

alter table receipt_scans enable row level security;

-- Users can read only their own scan history.
create policy "read_own_receipt_scans" on receipt_scans
  for select to authenticated
  using (auth.uid() = user_id);

-- Writes happen only from the server (service role key), same pattern as
-- the subscriptions table, so no insert/update policy is needed here.
