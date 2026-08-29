import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { pendingContextSchema } from './validation.ts'

describe('pendingContextSchema', () => {
  it('accepts kind company with companyName Acme', () => {
    const result = pendingContextSchema.safeParse({
      kind: 'company',
      companyName: 'Acme',
    })
    assert.equal(result.success, true)
    if (result.success) {
      assert.equal(result.data.kind, 'company')
      assert.equal(result.data.companyName, 'Acme')
    }
  })

  it('accepts kind invite with a token', () => {
    const result = pendingContextSchema.safeParse({
      kind: 'invite',
      token: 'abc',
    })
    assert.equal(result.success, true)
    if (result.success) {
      assert.equal(result.data.kind, 'invite')
      assert.equal(result.data.token, 'abc')
    }
  })

  it('rejects missing kind', () => {
    const result = pendingContextSchema.safeParse({
      companyName: 'Acme',
    })
    assert.equal(result.success, false)
  })

  it('rejects kind company with empty companyName', () => {
    const result = pendingContextSchema.safeParse({
      kind: 'company',
      companyName: '',
    })
    assert.equal(result.success, false)
  })

  it('rejects kind invite with empty token', () => {
    const result = pendingContextSchema.safeParse({
      kind: 'invite',
      token: '',
    })
    assert.equal(result.success, false)
  })
})
