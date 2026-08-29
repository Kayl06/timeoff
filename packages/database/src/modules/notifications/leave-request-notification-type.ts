/**
 * CHECK-valid notification type and copy for leave-request approve/reject (NOTIF-01, NOTIF-02).
 * Schema allows request_approved and request_rejected; never success/error/warning/info (D-10, D-11).
 */

export type LeaveRequestDecisionAction = 'approved' | 'rejected'

export type LeaveRequestNotificationType = 'request_approved' | 'request_rejected'

export type LeaveRequestNotificationCopy = {
  title: string
  message: string
}

function assertDecisionAction(action: string): asserts action is LeaveRequestDecisionAction {
  if (action !== 'approved' && action !== 'rejected') {
    throw new Error(`Invalid leave-request notification action: ${action}`)
  }
}

/**
 * Map approved/rejected to notifications.type CHECK values.
 * @throws on any other action string
 */
export function leaveRequestNotificationType(action: string): LeaveRequestNotificationType {
  assertDecisionAction(action)
  return action === 'approved' ? 'request_approved' : 'request_rejected'
}

/**
 * Existing title/message shape: Leave Request ${action} / Your leave request has been ${action}.
 */
export function leaveRequestNotificationCopy(action: string): LeaveRequestNotificationCopy {
  assertDecisionAction(action)
  return {
    title: `Leave Request ${action}`,
    message: `Your leave request has been ${action.toLowerCase()}.`,
  }
}
