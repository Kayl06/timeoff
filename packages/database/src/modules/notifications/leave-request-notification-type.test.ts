import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  leaveRequestNotificationCopy,
  leaveRequestNotificationType,
} from './leave-request-notification-type.ts'

describe('leaveRequestNotificationType', () => {
  it('maps approved to request_approved', () => {
    assert.equal(leaveRequestNotificationType('approved'), 'request_approved')
  })

  it('maps rejected to request_rejected', () => {
    assert.equal(leaveRequestNotificationType('rejected'), 'request_rejected')
  })

  it('throws on any other action string', () => {
    assert.throws(() => leaveRequestNotificationType('pending'))
    assert.throws(() => leaveRequestNotificationType('cancelled'))
    assert.throws(() => leaveRequestNotificationType('success'))
    assert.throws(() => leaveRequestNotificationType('error'))
  })
})

describe('leaveRequestNotificationCopy', () => {
  it('uses Leave Request approved title and approved message', () => {
    const copy = leaveRequestNotificationCopy('approved')

    assert.equal(copy.title, 'Leave Request approved')
    assert.equal(copy.message, 'Your leave request has been approved.')
  })

  it('uses Leave Request rejected title and rejected message', () => {
    const copy = leaveRequestNotificationCopy('rejected')

    assert.equal(copy.title, 'Leave Request rejected')
    assert.equal(copy.message, 'Your leave request has been rejected.')
  })

  it('throws on an action that is not approved or rejected', () => {
    assert.throws(() => leaveRequestNotificationCopy('pending'))
  })
})
