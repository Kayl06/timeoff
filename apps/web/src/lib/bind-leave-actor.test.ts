import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { bindLeaveApprover, bindLeaveCreateActor } from './bind-leave-actor.ts'

const sessionUserId = '11111111-1111-4111-8111-111111111111'
const spoofedUserId = '22222222-2222-4222-8222-222222222222'
const spoofedApproverId = '33333333-3333-4333-8333-333333333333'

describe('bindLeaveCreateActor', () => {
  it('returns user_id equal to sessionUserId when body user_id is another uuid', () => {
    const bound = bindLeaveCreateActor(
      {
        user_id: spoofedUserId,
        leave_type: 'vacation',
        reason: 'trip',
      },
      sessionUserId
    )

    assert.equal(bound.user_id, sessionUserId)
    assert.notEqual(bound.user_id, spoofedUserId)
  })

  it('copies non-actor fields from the body unchanged', () => {
    const bound = bindLeaveCreateActor(
      {
        user_id: spoofedUserId,
        leave_type: 'sick',
        reason: 'flu',
        is_half_day: true,
      },
      sessionUserId
    )

    assert.equal(bound.leave_type, 'sick')
    assert.equal(bound.reason, 'flu')
    assert.equal(bound.is_half_day, true)
  })
})

describe('bindLeaveApprover', () => {
  it('returns approver_id equal to sessionUserId when body approver_id is another uuid', () => {
    const bound = bindLeaveApprover(
      {
        approver_id: spoofedApproverId,
        comments: 'looks good',
      },
      sessionUserId
    )

    assert.equal(bound.approver_id, sessionUserId)
    assert.notEqual(bound.approver_id, spoofedApproverId)
  })
})
