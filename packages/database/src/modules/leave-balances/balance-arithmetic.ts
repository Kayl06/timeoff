/**
 * Pure delta arithmetic for approve deduct and approved-cancel restore (BAL-03, BAL-04).
 * Mutates used_days and remaining_days by plus-or-minus totalDays; never reads total_allowance.
 */

export type ApprovalBalanceDelta = {
  used_days: number
  remaining_days: number
}

/**
 * Add totalDays to used_days and subtract the same from remaining_days (D-01).
 * remaining_days may go negative (D-04). Does not clamp. Does not return carried_over.
 */
export function applyApprovalDeduct(
  balance: ApprovalBalanceDelta,
  totalDays: number
): ApprovalBalanceDelta {
  return {
    used_days: balance.used_days + totalDays,
    remaining_days: balance.remaining_days - totalDays,
  }
}

/**
 * Inverse of applyApprovalDeduct: subtract totalDays from used_days and add to remaining_days (D-06).
 */
export function applyApprovalRestore(
  balance: ApprovalBalanceDelta,
  totalDays: number
): ApprovalBalanceDelta {
  return {
    used_days: balance.used_days - totalDays,
    remaining_days: balance.remaining_days + totalDays,
  }
}

/**
 * Deduct only when the request is still pending (D-05, D-07).
 */
export function shouldApplyApprovalDeduct(status: string): boolean {
  return status === 'pending'
}

/**
 * Restore only when the request is currently approved (D-06).
 */
export function shouldApplyApprovalRestore(status: string): boolean {
  return status === 'approved'
}
