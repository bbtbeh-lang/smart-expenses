
create table if not exists daily_codes (
  code text primary key,
  valid_date date not null,
  uses integer default 0,
  max_uses integer default 100
);

alter table daily_codes enable row level security;

-- Allow anyone to read (needed for anon code check)
create policy "read_daily_codes" on daily_codes
  for select to anon, authenticated using (true);

-- Allow anyone to increment uses via update
create policy "update_daily_codes" on daily_codes
  for update to anon, authenticated
  using (true)
  with check (true);
