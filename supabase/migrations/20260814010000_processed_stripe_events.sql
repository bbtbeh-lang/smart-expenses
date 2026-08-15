-- SECURITY/CORRECTNESS: Stripe redelivers a webhook event if it doesn't
-- get a 200 back in time (network blip, cold start, etc.) — same event.id,
-- sent again. checkout.session.completed / subscription.updated are
-- naturally idempotent (they upsert), but invoice.upcoming's side effect
-- (sendRenewalReminderEmail) is NOT: a redelivery would email the person
-- a second "your card will be charged" notice for the same invoice.
--
-- Rather than a narrow fix scoped to just invoice.upcoming, this tracks
-- every processed Stripe event.id generically, so any current or future
-- handler with a non-idempotent side effect (emails, notifications, etc.)
-- is covered by the same guard at the top of the webhook route.
create table if not exists processed_stripe_events (
  event_id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);

alter table processed_stripe_events enable row level security;

-- No client-facing policies — only the webhook route (service role,
-- bypasses RLS) ever touches this table, same pattern as code_usages
-- and code_attempt_limits.

-- Old events are harmless to keep (tiny rows, and Stripe's own retry
-- window is short), but this makes cleanup easy if it's ever wanted:
-- delete from processed_stripe_events where processed_at < now() - interval '90 days';
