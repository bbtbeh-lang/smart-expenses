-- The Stripe Customer Portal is configured for "cancel at end of billing
-- period" (confirmed in Stripe Dashboard -> Settings -> Billing ->
-- Customer portal), not immediate cancellation. Until now, nothing in
-- this app tracked that a subscription was set to cancel — a user who
-- canceled via the portal kept full premium access (status stays
-- 'active' in Stripe right up until the period actually ends) with zero
-- indication in the app that it was about to end. This column lets the
-- webhook record that state so the UI can show "your plan ends on
-- [date]" instead of the access just disappearing with no warning.
alter table subscriptions
  add column if not exists cancel_at_period_end boolean not null default false;
