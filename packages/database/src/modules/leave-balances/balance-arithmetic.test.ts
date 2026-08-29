import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  applyApprovalDeduct,
  applyApprovalRestore,
  shouldApplyApprovalDeduct,
  shouldApplyApprovalRestore,
} from './balance-arithmetic.ts'

describe('applyApprovalDeduct', () => {
  it('adds totalDays to used_days and subtracts the same from remaining_days', () => {
    const result = applyApprovalDeduct({ used_days: 2, remaining_days: 18 }, 3)

    assert.equal(result.used_days, 5)
    assert.equal(result.remaining_days, 15)
  })

  it('allows remaining_days to go negative when used exceeds remaining', () => {
    const result = applyApprovalDeduct({ used_days: 0, remaining_days: 1 }, 3)

    assert.equal(result.used_days, 3)
    assert.equal(result.remaining_days, -2)
  })

  it('does not read or return total_allowance or carried_over', () => {
    const balance = {
      used_days: 2,
      remaining_days: 18,
      total_allowance: 15,
      carried_over: 5,
    }
    const result = applyApprovalDeduct(balance, 3)

    assert.deepEqual(Object.keys(result).sort(), ['remaining_days', 'used_days'])
    assert.equal(result.used_days, 5)
    assert.equal(result.remaining_days, 15)
    assert.equal(balance.carried_over, 5)
    assert.equal(balance.total_allowance, 15)
  })
})

describe('applyApprovalRestore', () => {
  it('is the inverse of applyApprovalDeduct', () => {
    const original = { used_days: 2, remaining_days: 18 }
    const deducted = applyApprovalDeduct(original, 3)
    const restored = applyApprovalRestore(deducted, 3)

    assert.equal(restored.used_days, original.used_days)
    assert.equal(restored.remaining_days, original.remaining_days)
  })
})

describe('shouldApplyApprovalDeduct', () => {
  it('is true only for pending', () => {
    assert.equal(shouldApplyApprovalDeduct('pending'), true)
    assert.equal(shouldApplyApprovalDeduct('approved'), false)
    assert.equal(shouldApplyApprovalDeduct('rejected'), false)
    assert.equal(shouldApplyApprovalDeduct('cancelled'), false)
  })
})

describe('shouldApplyApprovalRestore', () => {
  it('is true only for approved', () => {
    assert.equal(shouldApplyApprovalRestore('approved'), true)
    assert.equal(shouldApplyApprovalRestore('pending'), false)
    assert.equal(shouldApplyApprovalRestore('rejected'), false)
    assert.equal(shouldApplyApprovalRestore('cancelled'), false)
  })
})
