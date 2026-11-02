// Bump LEGAL_VERSION whenever the Terms or Privacy Policy change in a way
// people should re-accept. Acceptance is remembered per version, so a bump
// means the sign-in checkbox must be ticked again, and consent records
// always say which version the person actually saw.
export const LEGAL_VERSION = '2026-11';

const ACCEPTED_AT_KEY = 'finsnap_terms_accepted_at';
const ACCEPTED_VERSION_KEY = 'finsnap_terms_accepted_version';
const RECORDED_KEY = 'finsnap_consent_recorded';

/** True only if this device's tick was made for the CURRENT version. */
export function termsAcceptedForCurrentVersion(): boolean {
  try {
    return !!localStorage.getItem(ACCEPTED_AT_KEY) && localStorage.getItem(ACCEPTED_VERSION_KEY) === LEGAL_VERSION;
  } catch {
    return false;
  }
}

/** Remember (on this device) that the box was ticked for the current version. */
export function markTermsAccepted(): void {
  try {
    if (localStorage.getItem(ACCEPTED_VERSION_KEY) !== LEGAL_VERSION) {
      localStorage.setItem(ACCEPTED_AT_KEY, new Date().toISOString());
      localStorage.setItem(ACCEPTED_VERSION_KEY, LEGAL_VERSION);
    }
  } catch {
    /* storage unavailable: nothing to remember */
  }
}

/**
 * Once the person is signed in, store a server-side record (date + version)
 * as evidence. Only the server can write it, using its own clock, and it is
 * tried again next time if the request fails.
 */
export async function recordConsentIfNeeded(accessToken: string): Promise<void> {
  try {
    if (!termsAcceptedForCurrentVersion()) return; // not ticked for this version on this device
    if (localStorage.getItem(RECORDED_KEY) === LEGAL_VERSION) return;
    const res = await fetch('/api/consent', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.ok) localStorage.setItem(RECORDED_KEY, LEGAL_VERSION);
  } catch {
    /* storage or network unavailable: will retry on the next sign-in */
  }
}
