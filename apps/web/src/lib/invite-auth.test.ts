import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  ALREADY_IN_COMPANY_ERROR,
  EMAIL_EXISTS_ERROR,
  inviteCreateConflict,
  inviteOwnerRejectStatus,
} from './invite-auth.ts'

const ownerId = 'owner-user-id'
const ownerCompanyId = 'company-owner-id'
const otherCompanyId = 'company-other-id'

describe('inviteOwnerRejectStatus', () => {
  it('returns 401 when sessionUserId is undefined', () => {
    assert.equal(inviteOwnerRejectStatus(undefined, ownerId), 401)
  })

  it('returns 401 when sessionUserId is empty', () => {
    assert.equal(inviteOwnerRejectStatus('', ownerId), 401)
  })

  it('returns 403 when sessionUserId is not the owner', () => {
    assert.equal(inviteOwnerRejectStatus('other', ownerId), 403)
  })

  it('returns null when sessionUserId is the owner', () => {
    assert.equal(inviteOwnerRejectStatus(ownerId, ownerId), null)
  })
})

describe('inviteCreateConflict', () => {
  it('returns ALREADY_IN_COMPANY_ERROR when the user is already in this company', () => {
    assert.equal(
      inviteCreateConflict({
        existingUserCompanyId: ownerCompanyId,
        ownerCompanyId,
        pendingInviteInCompany: false,
      }),
      ALREADY_IN_COMPANY_ERROR
    )
  })

  it('returns EMAIL_EXISTS_ERROR when the user belongs to another company', () => {
    assert.equal(
      inviteCreateConflict({
        existingUserCompanyId: otherCompanyId,
        ownerCompanyId,
        pendingInviteInCompany: false,
      }),
      EMAIL_EXISTS_ERROR
    )
  })

  it('returns ALREADY_IN_COMPANY_ERROR when a pending invite exists in this company', () => {
    assert.equal(
      inviteCreateConflict({
        existingUserCompanyId: null,
        ownerCompanyId,
        pendingInviteInCompany: true,
      }),
      ALREADY_IN_COMPANY_ERROR
    )
  })

  it('returns null when there is no existing user and no pending invite', () => {
    assert.equal(
      inviteCreateConflict({
        existingUserCompanyId: null,
        ownerCompanyId,
        pendingInviteInCompany: false,
      }),
      null
    )
  })

  it('returns a 409 string when other-company user also has a pending invite in this company', () => {
    const result = inviteCreateConflict({
      existingUserCompanyId: otherCompanyId,
      ownerCompanyId,
      pendingInviteInCompany: true,
    })
    assert.notEqual(result, null)
    assert.ok(result === ALREADY_IN_COMPANY_ERROR || result === EMAIL_EXISTS_ERROR)
  })
})
