/**
 * Owner gate for company invite APIs (TENANT-02).
 * Maps missing session to 401 and non-owner session to 403.
 */
import { isCompanyOwner } from './company-owner.ts'

/**
 * Status to reject an invite request, or null when the session user is the owner.
 * @param sessionUserId - Session user id, if any
 * @param ownerId - companies.owner_id
 * @returns 401 when session is missing/empty, 403 when not the owner, null when owner
 */
export function inviteOwnerRejectStatus(
  sessionUserId: string | undefined | null,
  ownerId: string
): 401 | 403 | null {
  if (!sessionUserId || sessionUserId.length === 0) {
    return 401
  }
  if (!isCompanyOwner(sessionUserId, ownerId)) {
    return 403
  }
  return null
}
