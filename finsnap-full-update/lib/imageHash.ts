import sharp from 'sharp';

/**
 * Computes a "difference hash" (dHash) of an image: a 64-bit fingerprint
 * that stays nearly identical even if the same physical receipt is
 * re-photographed with a different angle, crop, or lighting — which is
 * exactly the case we need to catch (a user scanning the same paper
 * receipt twice), as opposed to a byte-for-byte file hash that would only
 * catch re-uploading the literal same image file.
 *
 * Algorithm: shrink to 9x8 grayscale, compare each pixel to its right
 * neighbor, and encode "brighter than neighbor" as a bit. Returns a
 * 16-character hex string (64 bits).
 */
export async function computeReceiptHash(imageBuffer: Buffer): Promise<string> {
  const { data } = await sharp(imageBuffer)
    .grayscale()
    .resize(9, 8, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true });

  let bits = '';
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const left = data[row * 9 + col];
      const right = data[row * 9 + col + 1];
      bits += left > right ? '1' : '0';
    }
  }

  // Pack the 64-bit string into a 16-char hex string.
  let hex = '';
  for (let i = 0; i < 64; i += 4) {
    hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
  }
  return hex;
}

/** Number of differing bits between two hex-encoded hashes of the same length. */
export function hammingDistance(hashA: string, hashB: string): number {
  if (hashA.length !== hashB.length) return 64;
  let distance = 0;
  for (let i = 0; i < hashA.length; i++) {
    const xor = parseInt(hashA[i], 16) ^ parseInt(hashB[i], 16);
    distance += xor.toString(2).split('1').length - 1;
  }
  return distance;
}

// Out of 64 bits, allow up to this many differing bits to still count as
// "the same receipt" — tolerant of re-photographing (angle/lighting/crop)
// but strict enough to not confuse two different receipts from the same store.
export const DUPLICATE_THRESHOLD = 10;
