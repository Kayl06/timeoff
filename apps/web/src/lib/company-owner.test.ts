import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { isCompanyOwner } from './company-owner.ts'

describe('isCompanyOwner', () => {
  it("returns true when userId and ownerId are the same non-empty string", () => {
    assert.equal(isCompanyOwner('a', 'a'), true)
  })

  it("returns false when userId and ownerId differ", () => {
    assert.equal(isCompanyOwner('a', 'b'), false)
  })

  it("returns false when both ids are empty", () => {
    assert.equal(isCompanyOwner('', ''), false)
  })

  it("returns false when ownerId is empty", () => {
    assert.equal(isCompanyOwner('a', ''), false)
  })
})
