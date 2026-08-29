/**
 * Invite token primitives for company_invites.token_hash.
 * Raw tokens stay in the URL; only SHA-256 digests are stored. Never log the raw token.
 */
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

/**
 * Generate a 32-byte CSPRNG invite token as 64 lowercase hex characters.
 * @returns A 64-character hex string
 */
export function generateInviteToken(): string {
  return randomBytes(32).toString('hex')
}

/**
 * SHA-256 digest of the raw invite token (utf8).
 * @param token - The raw invite token
 * @returns 32-byte SHA-256 digest
 */
export function hashInviteToken(token: string): Buffer {
  return createHash('sha256').update(token, 'utf8').digest()
}

/**
 * Persistence/lookup form for company_invites.token_hash (VARCHAR(64)).
 * @param token - The raw invite token
 * @returns 64-character lowercase hex SHA-256 digest
 */
export function hashInviteTokenHex(token: string): string {
  return hashInviteToken(token).toString('hex')
}

/**
 * Constant-time compare of a raw token against a stored SHA-256 digest.
 * @param token - The raw invite token from the URL
 * @param storedHash - The SHA-256 digest stored at rest
 * @returns true when the token hashes to storedHash
 */
export function inviteTokenMatches(token: string, storedHash: Buffer): boolean {
  const digest = hashInviteToken(token)
  if (digest.length !== storedHash.length) {
    return false
  }
  return timingSafeEqual(digest, storedHash)
}
