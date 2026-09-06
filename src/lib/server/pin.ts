import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const KEYLEN = 32;

/**
 * Hashes an admin PIN with a random salt using scrypt.
 * Format: "scrypt$<salt-hex>$<hash-hex>"
 */
export function hashPin(pin: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(pin, salt, KEYLEN).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

export function isHashedPin(stored: string): boolean {
  return typeof stored === "string" && stored.startsWith("scrypt$");
}

/**
 * Verifies a PIN against a stored hash (timing-safe) or legacy plaintext.
 */
export function verifyPin(pin: string, stored: string): boolean {
  if (!pin || !stored) return false;

  if (isHashedPin(stored)) {
    const [, salt, hash] = stored.split("$");
    if (!salt || !hash) return false;
    const derived = scryptSync(pin, salt, KEYLEN);
    const expected = Buffer.from(hash, "hex");
    return derived.length === expected.length && timingSafeEqual(derived, expected);
  }

  // Legacy plaintext migration path (upgraded to a hash on first successful auth)
  return pin === stored;
}
