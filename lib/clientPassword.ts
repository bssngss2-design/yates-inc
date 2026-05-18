import * as bcrypt from 'bcryptjs';

export function hashClientPassword(password: string): string {
  const salt = bcrypt.genSaltSync(10);
  return bcrypt.hashSync(password, salt);
}

export function verifyClientPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export function isBcryptHash(hash: string): boolean {
  return hash.startsWith('$2a$') || hash.startsWith('$2b$') || hash.startsWith('$2x$') || hash.startsWith('$2y$');
}
