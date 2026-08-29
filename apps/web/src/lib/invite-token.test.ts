import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { describe, it } from 'node:test'
import {
  generateInviteToken,
  hashInviteToken,
  hashInviteTokenHex,
  inviteTokenMatches,
} from './invite-token.ts'

describe('generateInviteToken', () => {
  it('returns a 64-character hex string', () => {
    const token = generateInviteToken()
    assert.equal(token.length, 64)
    assert.match(token, /^[0-9a-f]{64}$/)
  })
})

describe('hashInviteToken', () => {
  it('is deterministic for the same input and 32 bytes long', () => {
    const token = 'a'.repeat(64)
    const first = hashInviteToken(token)
    const second = hashInviteToken(token)
    assert.equal(first.length, 32)
    assert.deepEqual(first, second)
    assert.deepEqual(first, createHash('sha256').update(token, 'utf8').digest())
  })
})

describe('hashInviteTokenHex', () => {
  it('is deterministic, length 64, and equals hashInviteToken(token).toString("hex")', () => {
    const token = 'b'.repeat(64)
    const hex = hashInviteTokenHex(token)
    assert.equal(hex.length, 64)
    assert.match(hex, /^[0-9a-f]{64}$/)
    assert.equal(hex, hashInviteToken(token).toString('hex'))
    assert.equal(hex, hashInviteTokenHex(token))
  })
})

describe('inviteTokenMatches', () => {
  it('is true for the generating token and false for a different 64-hex token', () => {
    const token = generateInviteToken()
    const storedHash = hashInviteToken(token)
    assert.equal(inviteTokenMatches(token, storedHash), true)

    const other = generateInviteToken()
    assert.notEqual(other, token)
    assert.equal(inviteTokenMatches(other, storedHash), false)
  })
})
