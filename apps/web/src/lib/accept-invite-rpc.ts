/**
 * PostgREST argument mapper for accept_invite_with_employee.
 * Always includes p_password (string | null) so the key is never omitted.
 */

export interface AcceptInviteWithEmployeeInput {
  inviteId: string
  email: string
  passwordHash: string | null
  firstName: string
  lastName: string
  companyId: string
}

export interface AcceptInviteWithEmployeeArgs {
  p_invite_id: string
  p_email: string
  p_password: string | null
  p_first_name: string
  p_last_name: string
  p_company_id: string
}

/**
 * Build RPC args for accept_invite_with_employee.
 * @param input - Invite id, email from the invite row, bcrypt hash or null for OAuth
 * @returns Named PostgREST arguments including p_password even when null
 */
export function buildAcceptInviteWithEmployeeArgs(
  input: AcceptInviteWithEmployeeInput
): AcceptInviteWithEmployeeArgs {
  return {
    p_invite_id: input.inviteId,
    p_email: input.email,
    p_password: input.passwordHash,
    p_first_name: input.firstName,
    p_last_name: input.lastName,
    p_company_id: input.companyId,
  }
}
