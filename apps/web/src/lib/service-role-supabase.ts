/**
 * Server-only service_role Supabase client for pre-session identity (AUTHZ-03).
 * Use for credentials authorize, session user re-read, signup RPCs, and invite hash lookup.
 * Never import from a 'use client' module. Never use for tenant leave/user/notification BFF.
 * persistSession is false so a user Auth session cannot clobber the service_role Authorization header.
 */
import { createClient } from '@supabase/supabase-js'
import { env } from './env'

export const identitySupabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
)
