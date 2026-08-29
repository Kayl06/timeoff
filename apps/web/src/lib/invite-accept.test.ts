import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { companyIdFromInvite, inviteIsUsable, invitePreviewPageState } from './invite-accept.ts'

const COMPANY_ID = '11111111-1111-4111-8111-111111111111'
const OTHER_ID = '22222222-2222-4222-8222-222222222222'

function futureIso(ms = 60_000): string {
  return new Date(Date.now() + ms).toISOString()
}

function pastIso(ms = 60_000): string {
  return new Date(Date.now() - ms).toISOString()
}

describe('companyIdFromInvite', () => {
  it('returns invite.company_id', () => {
    assert.equal(companyIdFromInvite({ company_id: COMPANY_ID }), COMPANY_ID)
  })

  it('ignores other id fields', () => {
    const invite = {
      company_id: COMPANY_ID,
      id: OTHER_ID,
      companyId: OTHER_ID,
      company_id_override: OTHER_ID,
    }
    assert.equal(companyIdFromInvite(invite), COMPANY_ID)
  })
})

describe('inviteIsUsable', () => {
  it('is true when status is pending and expires_at is in the future', () => {
    assert.equal(
      inviteIsUsable({ status: 'pending', expires_at: futureIso() }),
      true
    )
  })

  it('is false when status is not pending', () => {
    assert.equal(
      inviteIsUsable({ status: 'accepted', expires_at: futureIso() }),
      false
    )
    assert.equal(
      inviteIsUsable({ status: 'expired', expires_at: futureIso() }),
      false
    )
  })

  it('is false when expires_at is in the past', () => {
    assert.equal(
      inviteIsUsable({ status: 'pending', expires_at: pastIso() }),
      false
    )
  })
})

describe('invitePreviewPageState', () => {
  it('is invalid when the invite is not usable', () => {
    assert.equal(
      invitePreviewPageState({ usable: false, existingUser: false }),
      'invalid'
    )
    assert.equal(
      invitePreviewPageState({ usable: false, existingUser: true }),
      'invalid'
    )
  })

  it('is exists when the invite is usable and the email already has an account', () => {
    assert.equal(
      invitePreviewPageState({ usable: true, existingUser: true }),
      'exists'
    )
  })

  it('is ready when the invite is usable and the email is free', () => {
    assert.equal(
      invitePreviewPageState({ usable: true, existingUser: false }),
      'ready'
    )
  })
})
