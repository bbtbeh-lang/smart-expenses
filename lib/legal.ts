// Bump LEGAL_VERSION whenever the Terms or Privacy Policy change in a way
// people should re-accept. Consent records store this version.
export const LEGAL_VERSION = '2026-10';

const ACCEPTED_KEY = 'finsnap_terms_accepted_at';
const RECORDED_KEY = 'finsnap_consent_recorded';

/**
 * The sign-in checkbox is remembered on the device. Once the person is
 * signed in, store a server-side record (date + version) as evidence. Only
 * the server can write it, using its own clock, and it is tried again next
 * time if the request fails.
 */
export async function recordConsentIfNeeded(accessToken: string): Promise<void> {
  try {
    if (!localStorage.getItem(ACCEPTED_KEY)) return; // not ticked on this device
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
