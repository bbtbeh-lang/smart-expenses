-- The original CHECK constraint on subscriptions.plan only allowed
-- ('free', 'basic', 'pro', 'business'). The 'starter' plan was added
-- later (lib/plans.ts, consume_scan()'s starter branch) but this
-- constraint was never updated to match, so any INSERT/UPDATE setting
-- plan = 'starter' fails with a check-constraint violation. This
-- migration brings the constraint in line with the actual plan set.
alter table subscriptions drop constraint subscriptions_plan_check;

alter table subscriptions add constraint subscriptions_plan_check
  check (plan in ('free', 'starter', 'basic', 'pro', 'business'));
