/**
 * Pure decision table for NextAuth Google signIn (TENANT-05).
 * Unknown Google without a pending company or invite must not insert a users row.
 * Deny is a string redirect, never false (AccessDenied).
 */

export const INVITE_REQUIRED_PATH = '/auth/error?error=InviteRequired'
export const ACCOUNT_EXISTS_PATH = '/auth/error?error=AccountExists'

/**
 * Decide whether Google sign-in may proceed.
 * @param input.existingUser - A users row already exists for this email
 * @param input.pendingCompany - Signup cookie is waiting to create a company
 * @param input.pendingInvite - Accept-invite cookie is waiting to join a company
 * @returns true to allow, or INVITE_REQUIRED_PATH to cancel auth
 */
export function decideGoogleSignIn(input: {
  existingUser: boolean
  pendingCompany: boolean
  pendingInvite: boolean
}): true | typeof INVITE_REQUIRED_PATH {
  if (input.existingUser || input.pendingCompany || input.pendingInvite) {
    return true
  }
  return INVITE_REQUIRED_PATH
}
