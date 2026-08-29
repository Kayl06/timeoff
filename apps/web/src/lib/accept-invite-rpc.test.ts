import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildAcceptInviteWithEmployeeArgs } from './accept-invite-rpc.ts'

describe('buildAcceptInviteWithEmployeeArgs', () => {
  it('sets p_password to the bcrypt hash when passwordHash is a string', () => {
    const hash = '$2a$12$examplehashvalue'
    const args = buildAcceptInviteWithEmployeeArgs({
      inviteId: '11111111-1111-1111-1111-111111111111',
      email: 'join@acme.test',
      passwordHash: hash,
      firstName: 'Ada',
      lastName: 'Lovelace',
      companyId: '22222222-2222-2222-2222-222222222222',
    })

    assert.equal(args.p_invite_id, '11111111-1111-1111-1111-111111111111')
    assert.equal(args.p_email, 'join@acme.test')
    assert.equal(args.p_password, hash)
    assert.equal(args.p_first_name, 'Ada')
    assert.equal(args.p_last_name, 'Lovelace')
    assert.equal(args.p_company_id, '22222222-2222-2222-2222-222222222222')
    assert.equal(Object.prototype.hasOwnProperty.call(args, 'p_password'), true)
  })

  it('sets p_password to null and keeps the key when passwordHash is null', () => {
    const args = buildAcceptInviteWithEmployeeArgs({
      inviteId: '11111111-1111-1111-1111-111111111111',
      email: 'join@acme.test',
      passwordHash: null,
      firstName: 'Ada',
      lastName: 'Lovelace',
      companyId: '22222222-2222-2222-2222-222222222222',
    })

    assert.equal(args.p_password, null)
    assert.equal(Object.prototype.hasOwnProperty.call(args, 'p_password'), true)
  })

  it('returns args keys p_invite_id, p_email, p_password, p_first_name, p_last_name, p_company_id', () => {
    const args = buildAcceptInviteWithEmployeeArgs({
      inviteId: '11111111-1111-1111-1111-111111111111',
      email: 'join@acme.test',
      passwordHash: null,
      firstName: 'Ada',
      lastName: 'Lovelace',
      companyId: '22222222-2222-2222-2222-222222222222',
    })

    assert.deepEqual(Object.keys(args), [
      'p_invite_id',
      'p_email',
      'p_password',
      'p_first_name',
      'p_last_name',
      'p_company_id',
    ])
  })
})
