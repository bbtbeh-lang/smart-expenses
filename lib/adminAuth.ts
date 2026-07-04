// Comma-separated list of emails allowed to access the admin panel,
// configured as an environment variable (never hardcoded in source).
// Example: ADMIN_EMAILS=behnaz@example.com,partner@example.com
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowlist = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
  return allowlist.includes(email.toLowerCase());
}
