/**
 * Pure mapper for the dashboard Leave Balance card (BAL-01, D-12).
 * Returns vacation, then sick, then personal rows that exist; omits all other types.
 * Does not invent placeholder rows for missing types.
 */
import type { LeaveBalance } from '@timeoff/types'

const CARD_TYPES = ['vacation', 'sick', 'personal'] as const

/**
 * Filter and order leave_balances rows for the remaining-days card.
 * @param rows - fetched leave_balances for the signed-in user
 * @returns existing vacation, sick, then personal rows only
 */
export function balancesForLeaveCard(rows: LeaveBalance[]): LeaveBalance[] {
  return CARD_TYPES
    .map((type) => rows.find((row) => row.leave_type === type))
    .filter((row): row is LeaveBalance => row != null)
}
