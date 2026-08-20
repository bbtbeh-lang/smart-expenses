// SECURITY: open-redirect fix. The Stripe checkout and billing-portal
// routes build success_url/return_url from the request's `Origin`
// header, which a browser sets correctly but a raw HTTP client (curl,
// Postman, a scripted request) can set to anything — there's no CORS
// enforcement stopping a direct API call. Since that origin ends up in
// a URL Stripe redirects a paying user's browser to after checkout,
// trusting it unchecked is a genuine open-redirect: someone could send
// out what looks like a legitimate FinSnap Stripe Checkout link (the
// checkout page itself IS the real Stripe-hosted page, so it looks and
// behaves exactly like the real flow) that lands the user on an
// attacker's domain right after they've paid, for phishing/credential
// harvesting.
//
// getSafeOrigin only trusts an Origin header if it exactly matches one
// of the app's own known domains; anything else falls back to the
// canonical production URL, same as when the header is missing entirely.
const ALLOWED_ORIGINS = new Set(
  [process.env.NEXT_PUBLIC_APP_URL, 'https://fin.pixflow.one'].filter(
    (v): v is string => !!v
  )
);

export function getSafeOrigin(req: { headers: { get(name: string): string | null } }): string {
  const headerOrigin = req.headers.get('origin');
  if (headerOrigin && ALLOWED_ORIGINS.has(headerOrigin)) {
    return headerOrigin;
  }
  return process.env.NEXT_PUBLIC_APP_URL || 'https://fin.pixflow.one';
}
