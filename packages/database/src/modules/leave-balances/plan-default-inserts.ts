/**
 * Pure insert-only planner for default vacation/sick/personal leave_balances (BAL-02).
 * Copies default_allowance from an active policy at plan time; never returns updates.
 */
import type { CreateLeaveBalanceData } from './types'

const SEED_TYPES = ['vacation', 'sick', 'personal'] as const

export type ExistingBalanceRow = {
  leave_type: string
  used_days?: number
}

export type PolicyAllowanceRow = {
  name: string
  leave_type: string
  default_allowance: number
  is_active?: boolean
}

/**
 * Plan missing default balance inserts for one user and year.
 * @param existing - rows already present (skip by leave_type even when used_days is non-zero)
 * @param policies - catalog rows; missing is_active is treated as inactive
 * @param userId - user_id written on every insert (never another user)
 * @param year - calendar year written on every insert
 * @returns insert payloads only (vacation, then sick, then personal)
 */
export function planDefaultBalanceInserts(
  existing: ExistingBalanceRow[],
  policies: PolicyAllowanceRow[],
  userId: string,
  year: number
): CreateLeaveBalanceData[] {
  const existingTypes = new Set(existing.map((row) => row.leave_type))
  const inserts: CreateLeaveBalanceData[] = []

  for (const leaveType of SEED_TYPES) {
    if (existingTypes.has(leaveType)) {
      continue
    }

    const chosen = policies
      .filter((policy) => policy.leave_type === leaveType && policy.is_active === true)
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))[0]

    if (!chosen) {
      continue
    }

    inserts.push({
      user_id: userId,
      leave_type: leaveType,
      total_allowance: chosen.default_allowance,
      used_days: 0,
      remaining_days: chosen.default_allowance,
      carried_over: 0,
      year,
    })
  }

  return inserts
}
