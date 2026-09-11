import argon2 from 'argon2';
import crypto from 'node:crypto';

const MIN_LENGTH = 10;

export async function hashPassword(password) {
  return argon2.hash(password, { type: argon2.argon2id });
}

export async function verifyPassword(hash, password) {
  return argon2.verify(hash, password);
}

// Baseline strength check. Not a full policy engine — just enough to block
// the weakest passwords before we bother hashing them.
export function checkPasswordStrength(password) {
  if (typeof password !== 'string' || password.length < MIN_LENGTH) {
    return `La contraseña debe tener al menos ${MIN_LENGTH} caracteres`;
  }
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    return 'La contraseña debe incluir mayúsculas, minúsculas y números';
  }
  return null;
}

// Checks the password against the HaveIBeenPwned breach corpus using the
// k-anonymity range API: only the first 5 chars of the SHA-1 hash are sent,
// so the full password (and its full hash) never leaves the server.
export async function isPasswordBreached(password, fetchImpl = fetch) {
  const sha1 = crypto.createHash('sha1').update(password).digest('hex').toUpperCase();
  const prefix = sha1.slice(0, 5);
  const suffix = sha1.slice(5);

  const response = await fetchImpl(`https://api.pwnedpasswords.com/range/${prefix}`, {
    headers: { 'Add-Padding': 'true' },
  });

  if (!response.ok) {
    // If the breach-check service is unreachable, fail open rather than
    // blocking signup entirely — strength rules above still apply.
    return false;
  }

  const body = await response.text();
  return body.split('\r\n').some((line) => line.startsWith(suffix));
}
