/**
 * Owner gate for company invite APIs (TENANT-02).
 * Maps missing session to 401 and non-owner session to 403.
 * inviteCreateConflict 409s create when the email already has a users row or a pending invite.
 */
import { isCompanyOwner } from './company-owner.ts'

export const ALREADY_IN_COMPANY_ERROR = 'That email is already in this company.'
export const EMAIL_EXISTS_ERROR =
  'An account with this email already exists. Sign in, or ask your admin for an invite.'

export type InviteCreateConflictInput = {
  existingUserCompanyId: string | null | undefined
  ownerCompanyId: string
  pendingInviteInCompany: boolean
}

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

/**
 * 409 copy for invite create, or null when the email is free to invite.
 * Pending in this company and same-company members use ALREADY_IN_COMPANY_ERROR.
 * A users row in another company uses EMAIL_EXISTS_ERROR (never the other company id).
 */
export function inviteCreateConflict(input: InviteCreateConflictInput): string | null {
  if (input.pendingInviteInCompany) {
    return ALREADY_IN_COMPANY_ERROR
  }

  const existingCompanyId = input.existingUserCompanyId
  if (typeof existingCompanyId === 'string' && existingCompanyId.length > 0) {
    if (existingCompanyId === input.ownerCompanyId) {
      return ALREADY_IN_COMPANY_ERROR
    }
    return EMAIL_EXISTS_ERROR
  }

  return null
}
