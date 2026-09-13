import argon2 from 'argon2';

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
  // Anything that isn't a letter, a digit or whitespace counts as special.
  if (!/[^A-Za-z0-9\s]/.test(password)) {
    return 'La contraseña debe incluir al menos un carácter especial';
  }
  return null;
}
