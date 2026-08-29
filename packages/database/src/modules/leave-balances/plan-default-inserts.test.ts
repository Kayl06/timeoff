import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { planDefaultBalanceInserts } from './plan-default-inserts.ts'

const USER_ID = '11111111-1111-1111-1111-111111111111'
const OTHER_USER_ID = '22222222-2222-2222-2222-222222222222'
const YEAR = 2026

function policy(overrides: {
  leave_type: string
  default_allowance: number
  name: string
  is_active?: boolean
}) {
  return {
    name: overrides.name,
    leave_type: overrides.leave_type,
    default_allowance: overrides.default_allowance,
    is_active: overrides.is_active,
  }
}

const catalog = [
  policy({ leave_type: 'vacation', default_allowance: 20, name: 'Standard Vacation', is_active: true }),
  policy({ leave_type: 'sick', default_allowance: 10, name: 'Sick Leave', is_active: true }),
  policy({ leave_type: 'personal', default_allowance: 5, name: 'Personal Leave', is_active: true }),
]

describe('planDefaultBalanceInserts', () => {
  it('returns three unused-start inserts from active policy allowances', () => {
    const inserts = planDefaultBalanceInserts([], catalog, USER_ID, YEAR)

    assert.equal(inserts.length, 3)
    assert.deepEqual(
      inserts.map((row) => row.leave_type),
      ['vacation', 'sick', 'personal']
    )
    assert.deepEqual(
      inserts.map((row) => row.total_allowance),
      [20, 10, 5]
    )
    for (const row of inserts) {
      assert.equal(row.user_id, USER_ID)
      assert.equal(row.year, YEAR)
      assert.equal(row.used_days, 0)
      assert.equal(row.remaining_days, row.total_allowance)
      assert.equal(row.carried_over, 0)
    }
  })

  it('skips vacation when an existing vacation row has used_days 5', () => {
    const inserts = planDefaultBalanceInserts(
      [{ leave_type: 'vacation', used_days: 5 }],
      catalog,
      USER_ID,
      YEAR
    )

    assert.deepEqual(
      inserts.map((row) => row.leave_type),
      ['sick', 'personal']
    )
    assert.equal(
      inserts.some((row) => row.leave_type === 'vacation'),
      false
    )
  })

  it('omits personal when there is no active personal policy', () => {
    const withoutPersonal = catalog.filter((row) => row.leave_type !== 'personal')
    const inserts = planDefaultBalanceInserts([], withoutPersonal, USER_ID, YEAR)

    assert.deepEqual(
      inserts.map((row) => row.leave_type),
      ['vacation', 'sick']
    )
  })

  it('never includes a type other than vacation, sick, or personal', () => {
    const withMaternity = [
      ...catalog,
      policy({
        leave_type: 'maternity',
        default_allowance: 90,
        name: 'Maternity',
        is_active: true,
      }),
    ]
    const inserts = planDefaultBalanceInserts([], withMaternity, USER_ID, YEAR)

    assert.deepEqual(
      inserts.map((row) => row.leave_type),
      ['vacation', 'sick', 'personal']
    )
    assert.equal(
      inserts.some((row) => row.leave_type === 'maternity'),
      false
    )
  })

  it('uses default_allowance from the name-sorted first policy when two active sick policies exist', () => {
    const twoSick = [
      policy({ leave_type: 'vacation', default_allowance: 20, name: 'Standard Vacation', is_active: true }),
      policy({ leave_type: 'sick', default_allowance: 8, name: 'Zeta Sick', is_active: true }),
      policy({ leave_type: 'sick', default_allowance: 12, name: 'Alpha Sick', is_active: true }),
      policy({ leave_type: 'personal', default_allowance: 5, name: 'Personal Leave', is_active: true }),
    ]
    const inserts = planDefaultBalanceInserts([], twoSick, USER_ID, YEAR)
    const sick = inserts.find((row) => row.leave_type === 'sick')

    assert.ok(sick)
    assert.equal(sick.total_allowance, 12)
    assert.equal(sick.remaining_days, 12)
  })

  it('uses the userId argument for every insert and never a second user id', () => {
    const inserts = planDefaultBalanceInserts([], catalog, USER_ID, YEAR)

    assert.ok(inserts.length > 0)
    for (const row of inserts) {
      assert.equal(row.user_id, USER_ID)
      assert.notEqual(row.user_id, OTHER_USER_ID)
    }
  })

  it('treats a policy with missing is_active as inactive', () => {
    const missingFlag = [
      policy({ leave_type: 'vacation', default_allowance: 20, name: 'Standard Vacation', is_active: true }),
      policy({ leave_type: 'sick', default_allowance: 10, name: 'Sick Leave' }),
      policy({ leave_type: 'personal', default_allowance: 5, name: 'Personal Leave', is_active: true }),
    ]
    const inserts = planDefaultBalanceInserts([], missingFlag, USER_ID, YEAR)

    assert.deepEqual(
      inserts.map((row) => row.leave_type),
      ['vacation', 'personal']
    )
  })
})
