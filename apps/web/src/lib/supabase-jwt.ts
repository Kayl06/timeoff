/**
 * Mint a short-lived Supabase-compatible access token for PostgREST (AUTHZ-02).
 * HS256 via jose SignJWT. Never log jwtSecret or the minted token.
 */
import { SignJWT } from 'jose'

export type MintTenantAccessTokenInput = {
  userId: string
  companyId: string
  jwtSecret: string
}

/**
 * Sign a PostgREST JWT with role authenticated and company_id.
 * @param input.userId - Session user id (JWT sub)
 * @param input.companyId - Session company id (top-level claim, not user_metadata)
 * @param input.jwtSecret - SUPABASE_JWT_SECRET (never NEXTAUTH_SECRET)
 * @returns Compact HS256 JWT string
 */
export async function mintTenantAccessToken(
  input: MintTenantAccessTokenInput
): Promise<string> {
  const secret = new TextEncoder().encode(input.jwtSecret)
  return new SignJWT({
    role: 'authenticated',
    company_id: input.companyId,
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(input.userId)
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(secret)
}
