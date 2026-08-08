-- customIncomeCategories has the exact same bug custom_categories had
-- before the 20260726000000 migration: it only ever lived in
-- localStorage, so `localStorage.removeItem(STORAGE_KEY)` on sign-out
-- wiped the key->label mapping while transactions referencing those keys
-- stayed in Supabase. Mirrors that fix for income categories.
alter table user_profiles
  add column if not exists custom_income_categories jsonb not null default '{}'::jsonb;
