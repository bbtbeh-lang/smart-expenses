-- BUG: budgets, budgetDueDates, and budgetReminders were never sent to
-- the server anywhere — unlike transactions and custom category labels
-- (which sync to Supabase), budget data lived purely in the browser's
-- localStorage. Signing out explicitly clears that localStorage snapshot
-- (see handleLogout in app/page.tsx), so every sign-out silently erased
-- all budget data, even on the very same device — the next sign-in had
-- nothing to restore it from. This column stores all three together
-- (they're always read/written as one unit from BudgetModal) so saving
-- and loading is a single round-trip.
alter table user_profiles
  add column if not exists budget_data jsonb not null default '{}'::jsonb;
