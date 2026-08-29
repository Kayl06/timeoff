/**
 * Per-request tenant IDatabaseService bound to a minted PostgREST JWT (AUTHZ-01/02).
 * Server-only — do not import from a 'use client' module. Never log the JWT or secret.
 */
import { createClient } from '@supabase/supabase-js'
import { createDatabaseService, type IDatabaseService } from '@timeoff/database'
import { env } from './env'
import { mintTenantAccessToken } from './supabase-jwt'

export type CreateTenantDatabaseServiceInput = {
  userId: string
  companyId: string
}

/**
 * Mint an authenticated JWT and construct a request-scoped IDatabaseService.
 * Uses the anon publishable key as apikey and the minted token as accessToken.
 * Does not use DatabaseServiceFactory.getInstance or the service_role key.
 * @param input.userId - Session user id (JWT sub)
 * @param input.companyId - Session company id (top-level JWT claim)
 * @returns IDatabaseService bound to this request's client
 */
export async function createTenantDatabaseService(
  input: CreateTenantDatabaseServiceInput
): Promise<IDatabaseService> {
  const accessToken = await mintTenantAccessToken({
    userId: input.userId,
    companyId: input.companyId,
    jwtSecret: env.SUPABASE_JWT_SECRET,
  })

  const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    accessToken: async () => accessToken,
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  return createDatabaseService(client)
}
