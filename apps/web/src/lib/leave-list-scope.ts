/**
 * Resolve leave-list read scope from session.user.role (AUTHZ-01 / T-02-11).
 * Client query/body cannot escalate past the session role.
 */
import type { IDatabaseService } from '@timeoff/database'
import { UserRole } from '@timeoff/types'

export type LeaveListScope = 'own' | 'team' | 'all'

const ADMIN_HR_ROLES: ReadonlySet<string> = new Set([UserRole.ADMIN, UserRole.HR])
const MANAGER_ROLES: ReadonlySet<string> = new Set([
  UserRole.SUPERVISOR,
  UserRole.ADMIN,
  UserRole.HR,
])

/**
 * Default list scope for a session role (dashboard/calendar branching).
 * @param role - session.user.role
 */
export function defaultLeaveListScope(role: string): LeaveListScope {
  if (ADMIN_HR_ROLES.has(role)) {
    return 'all'
  }
  if (MANAGER_ROLES.has(role)) {
    return 'team'
  }
  return 'own'
}

function allowedLeaveListScopes(role: string): Set<LeaveListScope> {
  if (ADMIN_HR_ROLES.has(role)) {
    return new Set(['own', 'team', 'all'])
  }
  if (MANAGER_ROLES.has(role)) {
    return new Set(['own', 'team'])
  }
  return new Set(['own'])
}

/**
 * Pick own|team|all from the session role, optionally honoring a requested
 * scope that does not exceed that role. Unknown or escalating values are ignored.
 * @param role - session.user.role
 * @param requested - Client query/body scope, if any
 */
export function resolveLeaveListScope(
  role: string,
  requested?: string | null
): LeaveListScope {
  const allowed = allowedLeaveListScopes(role)
  if (requested === 'own' || requested === 'team' || requested === 'all') {
    if (allowed.has(requested)) {
      return requested
    }
  }
  return defaultLeaveListScope(role)
}

export type FetchLeaveRequestsForScopeInput = {
  userId: string
  department: string
  scope: LeaveListScope
}

/**
 * Load leave requests for a resolved scope. Scope must already be capped by
 * resolveLeaveListScope — this does not re-check role.
 */
export async function fetchLeaveRequestsForScope(
  databaseService: IDatabaseService,
  input: FetchLeaveRequestsForScopeInput
) {
  if (input.scope === 'all') {
    return databaseService.getAllLeaveRequests()
  }
  if (input.scope === 'team') {
    return databaseService.getTeamLeaveRequests(input.userId, input.department)
  }
  return databaseService.getLeaveRequestsByUser(input.userId)
}
