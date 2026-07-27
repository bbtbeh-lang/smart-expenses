-- Custom category labels (key -> user-typed name) were only ever kept in
-- localStorage, so `localStorage.removeItem(STORAGE_KEY)` on sign-out wiped
-- the mapping while the transactions referencing those keys stayed in
-- Supabase — after sign-in, transactions showed the raw internal key
-- (e.g. "custom_suger_1784775632372") instead of the label the user typed.
-- Storing the mapping here makes it survive sign-out and follow the user
-- across devices, same as birth_date already does on this table.
alter table user_profiles
  add column if not exists custom_categories jsonb not null default '{}'::jsonb;
