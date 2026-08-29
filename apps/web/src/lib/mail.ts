/**
 * Server-only Resend adapter for approve/reject employee mail (NOTIF-03, NOTIF-04).
 * Phase 6 password reset reuses sendMail. Never throws when the key or from is unset.
 */
import { Resend } from 'resend'
import { devLog } from './env.ts'

export type LeaveMailDecision = 'approved' | 'rejected'

export type SendMailInput = {
  to: string
  subject: string
  html: string
  text?: string
  idempotencyKey?: string
}

export type SendMailResult = { sent: boolean }

export type SendMailEnv = {
  RESEND_API_KEY?: string
  EMAIL_FROM?: string
}

export type SendMailPayload = {
  from: string
  to: string[]
  subject: string
  html: string
  text?: string
}

export type SendMailOptions = {
  idempotencyKey?: string
}

export type SendMailFn = (
  payload: SendMailPayload,
  options?: SendMailOptions
) => Promise<{ data?: { id?: string } | null; error?: { message?: string } | null }>

export type MailLog = {
  warn: (...args: unknown[]) => void
  error: (...args: unknown[]) => void
}

export type MailDeps = {
  env?: SendMailEnv
  send?: SendMailFn
  log?: MailLog
}

function readMailEnv(env: SendMailEnv | NodeJS.ProcessEnv): {
  key: string
  from: string
} {
  return {
    key: typeof env.RESEND_API_KEY === 'string' ? env.RESEND_API_KEY.trim() : '',
    from: typeof env.EMAIL_FROM === 'string' ? env.EMAIL_FROM.trim() : '',
  }
}

/**
 * Best-effort send. Unset transport or SDK errors return { sent: false } and never throw (D-15).
 */
export async function sendMail(
  input: SendMailInput,
  deps?: MailDeps
): Promise<SendMailResult> {
  const log = deps?.log ?? devLog
  const { key, from } = readMailEnv(deps?.env ?? process.env)

  if (!key || !from) {
    log.warn('Mail skipped: RESEND_API_KEY or EMAIL_FROM is unset')
    return { sent: false }
  }

  const payload: SendMailPayload = {
    from,
    to: [input.to],
    subject: input.subject,
    html: input.html,
  }
  if (input.text !== undefined) {
    payload.text = input.text
  }

  const options: SendMailOptions | undefined = input.idempotencyKey
    ? { idempotencyKey: input.idempotencyKey }
    : undefined

  try {
    const send: SendMailFn =
      deps?.send ??
      ((body, requestOptions) => new Resend(key).emails.send(body, requestOptions))
    const result = await send(payload, options)
    if (result?.error) {
      log.error('Mail send failed')
      return { sent: false }
    }
    return { sent: true }
  } catch {
    log.error('Mail send threw')
    return { sent: false }
  }
}

/**
 * Employee-only approve/reject copy. Idempotency key leave-request/{id}/{decision} (D-14).
 * Do not interpolate manager comments into html.
 */
export async function sendLeaveDecisionMail(
  input: { to: string; requestId: string; decision: LeaveMailDecision },
  deps?: MailDeps
): Promise<SendMailResult> {
  if (input.decision !== 'approved' && input.decision !== 'rejected') {
    return { sent: false }
  }

  const subject = `Leave Request ${input.decision}`
  const text = `Your leave request has been ${input.decision}.`

  return sendMail(
    {
      to: input.to,
      subject,
      html: `<p>${text}</p>`,
      text,
      idempotencyKey: `leave-request/${input.requestId}/${input.decision}`,
    },
    deps
  )
}
