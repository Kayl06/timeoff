import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { sendLeaveDecisionMail, sendMail } from './mail.ts'

const silentLog = {
  warn() {},
  error() {},
}

describe('sendMail', () => {
  it('returns { sent: false } and does not throw when RESEND_API_KEY is unset', async () => {
    let sendCalled = false
    const result = await sendMail(
      {
        to: 'employee@acme.test',
        subject: 'Leave Request approved',
        html: '<p>Your leave request has been approved.</p>',
      },
      {
        env: { EMAIL_FROM: 'Timeoff <mail@acme.test>' },
        send: async () => {
          sendCalled = true
          return { data: { id: 'msg_1' }, error: null }
        },
        log: silentLog,
      }
    )

    assert.deepEqual(result, { sent: false })
    assert.equal(sendCalled, false)
  })

  it('returns { sent: false } and does not throw when EMAIL_FROM is unset', async () => {
    let sendCalled = false
    const result = await sendMail(
      {
        to: 'employee@acme.test',
        subject: 'Leave Request approved',
        html: '<p>Your leave request has been approved.</p>',
      },
      {
        env: { RESEND_API_KEY: 're_test' },
        send: async () => {
          sendCalled = true
          return { data: { id: 'msg_1' }, error: null }
        },
        log: silentLog,
      }
    )

    assert.deepEqual(result, { sent: false })
    assert.equal(sendCalled, false)
  })

  it('returns { sent: false } and does not throw when send resolves an SDK error', async () => {
    const result = await sendMail(
      {
        to: 'employee@acme.test',
        subject: 'Leave Request approved',
        html: '<p>Your leave request has been approved.</p>',
      },
      {
        env: {
          RESEND_API_KEY: 're_test',
          EMAIL_FROM: 'Timeoff <mail@acme.test>',
        },
        send: async () => ({ error: { message: 'rate limited' } }),
        log: silentLog,
      }
    )

    assert.deepEqual(result, { sent: false })
  })

  it('returns { sent: true } when send resolves data and a null error', async () => {
    const result = await sendMail(
      {
        to: 'employee@acme.test',
        subject: 'Leave Request approved',
        html: '<p>Your leave request has been approved.</p>',
      },
      {
        env: {
          RESEND_API_KEY: 're_test',
          EMAIL_FROM: 'Timeoff <mail@acme.test>',
        },
        send: async () => ({ data: { id: 'msg_1' }, error: null }),
        log: silentLog,
      }
    )

    assert.deepEqual(result, { sent: true })
  })
})

describe('sendLeaveDecisionMail', () => {
  it('sends Leave Request approved with leave-request/{id}/approved idempotency key', async () => {
    const calls: Array<{
      payload: {
        from: string
        to: string[]
        subject: string
        html: string
        text?: string
      }
      options?: { idempotencyKey?: string }
    }> = []

    const result = await sendLeaveDecisionMail(
      {
        to: 'employee@acme.test',
        requestId: 'req-42',
        decision: 'approved',
      },
      {
        env: {
          RESEND_API_KEY: 're_test',
          EMAIL_FROM: 'Timeoff <mail@acme.test>',
        },
        send: async (payload, options) => {
          calls.push({ payload, options })
          return { data: { id: 'msg_1' }, error: null }
        },
        log: silentLog,
      }
    )

    assert.deepEqual(result, { sent: true })
    assert.equal(calls.length, 1)
    assert.equal(calls[0].payload.subject, 'Leave Request approved')
    assert.deepEqual(calls[0].payload.to, ['employee@acme.test'])
    assert.equal(calls[0].options?.idempotencyKey, 'leave-request/req-42/approved')
  })
})
