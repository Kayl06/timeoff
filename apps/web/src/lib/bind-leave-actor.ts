/**
 * Bind leave write actors from the signed-in session (AUTHZ-01).
 * Overwrites user_id and approver_id from sessionUserId; body copies are ignored.
 * Does not read company_id from the body.
 */

import { UserRole } from '@timeoff/types'

export type LeaveCreateBody = { user_id?: string } & Record<string, unknown>
export type LeaveApproverBody = { approver_id?: string } & Record<string, unknown>

const LEAVE_APPROVER_ROLES: ReadonlySet<string> = new Set([
  UserRole.SUPERVISOR,
  UserRole.ADMIN,
  UserRole.HR,
])

const LEAVE_ADMIN_ROLES: ReadonlySet<string> = new Set([
  UserRole.ADMIN,
  UserRole.HR,
])

/**
 * Approve/reject (and bulk) are supervisor, admin, or hr only.
 * @param role - session.user.role
 */
export function canApproveOrRejectLeave(role: string): boolean {
  return LEAVE_APPROVER_ROLES.has(role)
}

/**
 * Cancel/delete requires the session user to own the row, or admin/hr.
 * @param role - session.user.role
 * @param sessionUserId - session user id
 * @param requestUserId - leave_requests.user_id
 */
export function canCancelOrDeleteLeave(
  role: string,
  sessionUserId: string,
  requestUserId: string
): boolean {
  if (sessionUserId === requestUserId) {
    return true
  }
  return LEAVE_ADMIN_ROLES.has(role)
}

/**
 * Map a leave-create body so user_id is always the session user.
 * @param body - Parsed request body; user_id is ignored if present
 * @param sessionUserId - Session user id
 * @returns Body copy with user_id set to sessionUserId
 */
export function bindLeaveCreateActor(
  body: LeaveCreateBody,
  sessionUserId: string
): Omit<LeaveCreateBody, 'user_id'> & { user_id: string } {
  const { user_id: _ignored, ...rest } = body
  return { ...rest, user_id: sessionUserId }
}

/**
 * Map an approve/reject body so approver_id is always the session user.
 * @param body - Parsed request body; approver_id is ignored if present
 * @param sessionUserId - Session user id
 * @returns Body copy with approver_id set to sessionUserId
 */
export function bindLeaveApprover(
  body: LeaveApproverBody,
  sessionUserId: string
): Omit<LeaveApproverBody, 'approver_id'> & { approver_id: string } {
  const { approver_id: _ignored, ...rest } = body
  return { ...rest, approver_id: sessionUserId }
}
