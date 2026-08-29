import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { tenantSessionRejectStatus } from './require-tenant-session.ts'

const userId = 'user-session-id'
const companyId = 'company-session-id'

describe('tenantSessionRejectStatus', () => {
  it('returns 401 when userId is undefined', () => {
    assert.equal(tenantSessionRejectStatus(undefined, companyId), 401)
  })

  it('returns 401 when userId is empty string', () => {
    assert.equal(tenantSessionRejectStatus('', companyId), 401)
  })

  it('returns 401 when companyId is undefined', () => {
    assert.equal(tenantSessionRejectStatus(userId, undefined), 401)
  })

  it('returns 401 when companyId is empty string', () => {
    assert.equal(tenantSessionRejectStatus(userId, ''), 401)
  })

  it('returns 401 when userId is null', () => {
    assert.equal(tenantSessionRejectStatus(null, companyId), 401)
  })

  it('returns 401 when companyId is null', () => {
    assert.equal(tenantSessionRejectStatus(userId, null), 401)
  })

  it('returns null when both userId and companyId are non-empty', () => {
    assert.equal(tenantSessionRejectStatus(userId, companyId), null)
  })
})
