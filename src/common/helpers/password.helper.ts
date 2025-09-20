export async function hashPassword(password: string): Promise<string> {
  if (typeof password !== 'string' || password.length < 8) {
    throw new Error('Password must be a string of at least 8 characters');
  }

  try {
    return Bun.password.hash(password, {
      algorithm: 'argon2id',
    });
  } catch (error) {
    throw new Error(`Hashing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (typeof password !== 'string' || typeof hash !== 'string' || password.length === 0 || hash.length === 0) {
    throw new Error('Invalid input: password and hash must be non-empty strings');
  }

  return Bun.password.verify(password, hash);
}