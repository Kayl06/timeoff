/**
 * Invite accept helpers: bind the invitee to the invite's company only.
 * Company id never comes from the client body or query besides the token.
 */

export interface InviteCompanyRef {
  company_id: string
}

export interface InviteUsabilityRef {
  status: string
  expires_at: string
}

/**
 * Return the company id stored on the invite row.
 * Extra id fields on the object are ignored.
 * @param invite - Invite row (or subset) with company_id
 * @returns invite.company_id
 */
export function companyIdFromInvite(invite: InviteCompanyRef): string {
  return invite.company_id
}

/**
 * Whether the invite can still be accepted.
 * @param invite - Status and expiry from company_invites
 * @returns true only when status is pending and expires_at is in the future
 */
export function inviteIsUsable(invite: InviteUsabilityRef): boolean {
  if (invite.status !== 'pending') {
    return false
  }
  return new Date(invite.expires_at).getTime() > Date.now()
}

export type InvitePreviewPageState = 'invalid' | 'exists' | 'ready'

export interface InvitePreviewPageStateInput {
  usable: boolean
  existingUser: boolean
}

/**
 * Page state after preview usability and existing-email checks.
 * Unusable invites stay invalid even if a users row exists for that email.
 * @param input - usable from inviteIsUsable; existingUser true when users.email has a row
 * @returns invalid, exists, or ready
 */
export function invitePreviewPageState(
  input: InvitePreviewPageStateInput
): InvitePreviewPageState {
  if (!input.usable) {
    return 'invalid'
  }
  if (input.existingUser) {
    return 'exists'
  }
  return 'ready'
}
