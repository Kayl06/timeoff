import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { LeaveType, type LeaveBalance } from '@timeoff/types'
import { balancesForLeaveCard } from './leave-balance-display.ts'

function row(leave_type: LeaveType, id: string): LeaveBalance {
  return {
    id,
    user_id: 'user-1',
    leave_type,
    total_allowance: 10,
    used_days: 0,
    remaining_days: 10,
    carried_over: 0,
    year: 2026,
    updated_at: new Date('2026-01-01T00:00:00.000Z'),
  }
}

describe('balancesForLeaveCard', () => {
  it('returns vacation, then sick, then personal regardless of input order', () => {
    const personal = row(LeaveType.PERSONAL, 'p')
    const vacation = row(LeaveType.VACATION, 'v')
    const sick = row(LeaveType.SICK, 's')

    const ordered = balancesForLeaveCard([personal, vacation, sick])

    assert.deepEqual(
      ordered.map((balance) => balance.leave_type),
      [LeaveType.VACATION, LeaveType.SICK, LeaveType.PERSONAL]
    )
    assert.equal(ordered[0], vacation)
    assert.equal(ordered[1], sick)
    assert.equal(ordered[2], personal)
  })

  it('drops maternity and any type that is not vacation, sick, or personal', () => {
    const vacation = row(LeaveType.VACATION, 'v')
    const maternity = row(LeaveType.MATERNITY, 'm')
    const unpaid = row(LeaveType.UNPAID, 'u')
    const sick = row(LeaveType.SICK, 's')

    const filtered = balancesForLeaveCard([maternity, vacation, unpaid, sick])

    assert.deepEqual(
      filtered.map((balance) => balance.leave_type),
      [LeaveType.VACATION, LeaveType.SICK]
    )
    assert.equal(filtered.includes(maternity), false)
    assert.equal(filtered.includes(unpaid), false)
  })

  it('returns a one-element sick array when only sick is present', () => {
    const sick = row(LeaveType.SICK, 's')

    const partial = balancesForLeaveCard([sick])

    assert.equal(partial.length, 1)
    assert.equal(partial[0], sick)
    assert.equal(partial[0].leave_type, LeaveType.SICK)
  })

  it('returns an empty array when there are no rows', () => {
    assert.deepEqual(balancesForLeaveCard([]), [])
  })
})
