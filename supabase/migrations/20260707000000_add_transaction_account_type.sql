-- Previously "Personal" vs "Business" only existed as a single global
-- setting on the user's profile (used just to pick which category list to
-- show). Transactions themselves were never tagged, so switching that
-- setting never actually separated anyone's data — everything stayed in
-- one pool. This adds the tag to the transaction itself, which is what
-- actually lets personal and business data be filtered apart.
alter table transactions
  add column if not exists account_type text not null default 'personal'
  check (account_type in ('personal', 'business'));

create index if not exists transactions_user_account_type_idx
  on transactions(user_id, account_type);
