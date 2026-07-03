import Stripe from 'stripe';

// This file must only ever be imported from server-side code (API routes).
// STRIPE_SECRET_KEY is never exposed to the browser.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-06-24.dahlia',
});
