create table if not exists transactions (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('income', 'expense')),
  amount numeric not null,
  description text not null,
  category text not null,
  date date not null,
  has_receipt boolean not null default false,
  merchant text,
  tax_amount numeric,
  original_currency text,
  original_amount numeric,
  items jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists transactions_user_id_idx on transactions(user_id);
create index if not exists transactions_user_date_idx on transactions(user_id, date desc);

alter table transactions enable row level security;

create policy "select_own_transactions" on transactions
  for select to authenticated
  using (auth.uid() = user_id);

create policy "insert_own_transactions" on transactions
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy "update_own_transactions" on transactions
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "delete_own_transactions" on transactions
  for delete to authenticated
  using (auth.uid() = user_id);
