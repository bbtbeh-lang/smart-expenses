-- The Pricing & Profit Calculator's "Saved Items" list (PricingTab.tsx)
-- was localStorage-only, same class of gap as custom_categories and
-- budget_data before their own migrations: doesn't sync across devices,
-- and sign-out (which explicitly clears localStorage) or clearing
-- browser data wipes every saved product with no way to recover it.
-- Same fix pattern: one jsonb column on user_profiles, read/written as a
-- whole array in one round-trip, same as budget_data.
alter table user_profiles
  add column if not exists saved_pricing_products jsonb not null default '[]'::jsonb;
