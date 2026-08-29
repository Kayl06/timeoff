/**
 * Session gate for tenant BFF routes (AUTHZ-01).
 * Maps missing or empty userId/companyId to 401. Does not check owner_id
 * and does not return 403 — company isolation, not owner-only.
 */

/**
 * Status to reject a tenant request, or null when the session has both ids.
 * @param userId - Session user id, if any
 * @param companyId - Session company id, if any
 * @returns 401 when either id is missing or empty, otherwise null
 */
export function tenantSessionRejectStatus(
  userId: string | undefined | null,
  companyId: string | undefined | null
): 401 | null {
  if (!userId || userId.length === 0) {
    return 401
  }
  if (!companyId || companyId.length === 0) {
    return 401
  }
  return null
}
