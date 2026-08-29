import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildCreateCompanyWithOwnerArgs } from './create-company-rpc.ts'

describe('buildCreateCompanyWithOwnerArgs', () => {
  it('sets p_password to the bcrypt hash when passwordHash is a string', () => {
    const hash = '$2a$12$examplehashvalue'
    const args = buildCreateCompanyWithOwnerArgs({
      email: 'owner@acme.test',
      passwordHash: hash,
      firstName: 'Ada',
      lastName: 'Lovelace',
      companyName: 'Acme Inc.',
    })

    assert.equal(args.p_email, 'owner@acme.test')
    assert.equal(args.p_password, hash)
    assert.equal(args.p_first_name, 'Ada')
    assert.equal(args.p_last_name, 'Lovelace')
    assert.equal(args.p_company_name, 'Acme Inc.')
    assert.equal(Object.prototype.hasOwnProperty.call(args, 'p_password'), true)
  })

  it('sets p_password to null and keeps the key when passwordHash is null', () => {
    const args = buildCreateCompanyWithOwnerArgs({
      email: 'owner@acme.test',
      passwordHash: null,
      firstName: 'Ada',
      lastName: 'Lovelace',
      companyName: 'Acme Inc.',
    })

    assert.equal(args.p_password, null)
    assert.equal(Object.prototype.hasOwnProperty.call(args, 'p_password'), true)
  })
})
