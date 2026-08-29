import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  decideGoogleSignIn,
  INVITE_REQUIRED_PATH,
} from './google-signin-gate.ts'

describe('INVITE_REQUIRED_PATH', () => {
  it('equals /auth/error?error=InviteRequired', () => {
    assert.equal(INVITE_REQUIRED_PATH, '/auth/error?error=InviteRequired')
  })
})

describe('decideGoogleSignIn', () => {
  it('returns true for an existing user regardless of pending flags', () => {
    assert.equal(
      decideGoogleSignIn({
        existingUser: true,
        pendingCompany: false,
        pendingInvite: false,
      }),
      true
    )
    assert.equal(
      decideGoogleSignIn({
        existingUser: true,
        pendingCompany: true,
        pendingInvite: true,
      }),
      true
    )
  })

  it('returns true when existingUser is false and pendingCompany is true', () => {
    assert.equal(
      decideGoogleSignIn({
        existingUser: false,
        pendingCompany: true,
        pendingInvite: false,
      }),
      true
    )
  })

  it('returns true when existingUser is false and pendingInvite is true', () => {
    assert.equal(
      decideGoogleSignIn({
        existingUser: false,
        pendingCompany: false,
        pendingInvite: true,
      }),
      true
    )
  })

  it('returns INVITE_REQUIRED_PATH when existingUser is false and both pending flags are false', () => {
    const result = decideGoogleSignIn({
      existingUser: false,
      pendingCompany: false,
      pendingInvite: false,
    })
    assert.equal(result, INVITE_REQUIRED_PATH)
    assert.notEqual(result, false)
    assert.equal(typeof result, 'string')
  })
})
