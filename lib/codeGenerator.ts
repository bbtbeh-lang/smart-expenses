import crypto from 'crypto';

// Excludes visually ambiguous characters (0/O, 1/I/L) so codes are easy to
// read off a screen or type by hand without transcription errors.
const CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function randomChar(): string {
  const index = crypto.randomInt(0, CHARSET.length);
  return CHARSET[index];
}

/** Generates a code like "X7K2-M9QR-3NPB" — 12 characters across 3 dashed groups. */
export function generateDailyCode(): string {
  const groups = [4, 4, 4].map(len =>
    Array.from({ length: len }, randomChar).join('')
  );
  return groups.join('-');
}
