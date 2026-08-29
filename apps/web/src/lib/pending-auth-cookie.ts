/**
 * Short-lived httpOnly cookies that carry company name or invite token
 * across the Google OAuth round trip. Do not put this data in OAuth state.
 */

import { cookies } from 'next/headers'

export const PENDING_KIND_COOKIE = 'timeoff_pending_kind'
export const PENDING_VALUE_COOKIE = 'timeoff_pending_value'
export const PENDING_COOKIE_MAX_AGE = 600

const PENDING_COOKIE_OPTIONS = {
  httpOnly: true,
  maxAge: PENDING_COOKIE_MAX_AGE,
  path: '/',
  sameSite: 'lax' as const,
}

/**
 * Cookie options for pending Google context (httpOnly, 10 min, SameSite lax).
 */
export function getPendingCookieOptions() {
  return PENDING_COOKIE_OPTIONS
}

/**
 * Read pending kind (`company` | `invite`) without awaiting cookies() (Next 14).
 */
export function readPendingKind(): string | undefined {
  return cookies().get(PENDING_KIND_COOKIE)?.value
}

/**
 * Read pending company name or invite token without awaiting cookies() (Next 14).
 */
export function readPendingValue(): string | undefined {
  return cookies().get(PENDING_VALUE_COOKIE)?.value
}

/**
 * Set both pending cookies for the OAuth round trip.
 */
export function setPendingAuthCookies(kind: 'company' | 'invite', value: string): void {
  cookies().set(PENDING_KIND_COOKIE, kind, PENDING_COOKIE_OPTIONS)
  cookies().set(PENDING_VALUE_COOKIE, value, PENDING_COOKIE_OPTIONS)
}

/**
 * Clear both pending cookies after a successful Google create or join.
 */
export function clearPendingAuthCookies(): void {
  const store = cookies()
  store.delete(PENDING_KIND_COOKIE)
  store.delete(PENDING_VALUE_COOKIE)
}
