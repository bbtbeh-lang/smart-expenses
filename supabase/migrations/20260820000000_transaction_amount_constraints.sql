-- SECURITY/DATA INTEGRITY: transactions.amount had no DB-level guard
-- against zero or negative values. TransactionModal.tsx validates
-- `parsedAmount > 0` client-side (see the BUG FIX comment there), but
-- transactions are written directly from the browser via the Supabase
-- client SDK (lib/transactionSync.ts) — there is no Next.js API route
-- in between to re-check the value server-side. RLS only confirms row
-- ownership, not that the numbers in it make sense. Since the sign of
-- a transaction's effect comes from `type` (income/expense), not from
-- `amount` itself, a zero or negative amount inserted by any client
-- other than this app's UI (a replayed/modified request, a bug, a
-- future integration) would silently corrupt every downstream sum:
-- Dashboard totals, Reports, budgets, and the CRA tax CSV export.
-- A CHECK constraint closes that gap regardless of which client wrote
-- the row.
-- Before running this file, check for existing rows that would violate
-- it (this table already holds real production data):
--   select id, user_id, amount, tax_amount, original_amount, date
--   from transactions
--   where amount <= 0
--      or (tax_amount is not null and tax_amount < 0)
--      or (original_amount is not null and original_amount <= 0);
-- If that returns any rows, fix or remove them first — otherwise the
-- ALTER TABLE below fails outright and none of these constraints apply.

alter table transactions
  add constraint transactions_amount_positive check (amount > 0);

-- tax_amount and original_amount are nullable (most transactions have
-- neither), but when present they should never be negative — a
-- negative tax or negative foreign-currency amount has no valid
-- meaning here and would also throw off the tax report and any
-- original-currency display.
alter table transactions
  add constraint transactions_tax_amount_nonnegative check (tax_amount is null or tax_amount >= 0);

alter table transactions
  add constraint transactions_original_amount_positive check (original_amount is null or original_amount > 0);
