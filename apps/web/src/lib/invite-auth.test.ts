import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { inviteOwnerRejectStatus } from './invite-auth.ts'

const ownerId = 'owner-user-id'

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
