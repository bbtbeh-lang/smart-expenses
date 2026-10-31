import type { AccountType } from './types';

// Budgets used to be one list shared by the Personal and Business accounts,
// so a budget set under one showed up (against different spending) under the
// other for every category both accounts have (Transport, Restaurant, ...).
//
// To separate them WITHOUT changing the stored shape or the sync/merge code,
// each key in the five budget maps is namespaced per account:
//   "acct:business:catTransport"  vs  "acct:personal:catTransport"
// The rest of the app keeps working with plain category keys: it only ever
// sees the active account's slice (projectScoped), and saves write that
// slice back (writeScoped). Category keys never contain ':' (see
// getOrCreateCategoryKey), so the prefix can't collide with a real key.

const ACCOUNTS: AccountType[] = ['personal', 'business'];
const prefixOf = (a: AccountType) => `acct:${a}:`;
const isScoped = (k: string) => k.startsWith('acct:');

/** The active account's entries, with the prefix stripped. */
export function projectScoped<T>(map: Record<string, T> | undefined, account: AccountType): Record<string, T> {
  const out: Record<string, T> = {};
  const p = prefixOf(account);
  for (const [k, v] of Object.entries(map ?? {})) {
    if (k.startsWith(p)) out[k.slice(p.length)] = v;
  }
  return out;
}

/** Replaces ONLY the active account's entries; the other account is untouched. */
export function writeScoped<T>(
  full: Record<string, T> | undefined,
  account: AccountType,
  scoped: Record<string, T>
): Record<string, T> {
  const p = prefixOf(account);
  const out: Record<string, T> = {};
  for (const [k, v] of Object.entries(full ?? {})) {
    if (!k.startsWith(p)) out[k] = v;
  }
  for (const [k, v] of Object.entries(scoped)) out[p + k] = v;
  return out;
}

export function hasLegacyKeys(map: Record<string, unknown> | undefined): boolean {
  return Object.keys(map ?? {}).some(k => !isScoped(k));
}

/**
 * One-time upgrade of old, shared (unprefixed) entries: each is copied to BOTH
 * accounts (so nobody loses a budget they could see before) unless that
 * account already has its own value, then the shared entry is removed. After
 * this, the two accounts evolve independently. Safe to run repeatedly.
 */
export function migrateLegacyScope<T>(map: Record<string, T> | undefined): Record<string, T> {
  const out: Record<string, T> = {};
  const legacy: [string, T][] = [];
  for (const [k, v] of Object.entries(map ?? {})) {
    if (isScoped(k)) out[k] = v;
    else legacy.push([k, v]);
  }
  for (const [k, v] of legacy) {
    for (const a of ACCOUNTS) {
      const sk = prefixOf(a) + k;
      if (!(sk in out)) out[sk] = v;
    }
  }
  return out;
}
