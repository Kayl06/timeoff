import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { format } from 'date-fns'
import { authOptions } from '@/lib/auth'
import { devLog } from '@/lib/env'
import { tenantSessionRejectStatus } from '@/lib/require-tenant-session'
import { createTenantDatabaseService } from '@/lib/tenant-supabase'
import { bindLeaveCreateActor } from '@/lib/bind-leave-actor'
import {
  leaveRequestCreateBodySchema,
  validateInput,
  formatValidationErrors,
} from '@/lib/validation'
import { calculateTotalDays } from '@/lib/date-utils'

const UNAUTHORIZED = { error: 'Unauthorized' } as const
const AUTO_APPROVE_COMMENT = 'Auto-approved (Manager self-leave)'
const MANAGER_SELF_LEAVE_ROLES = new Set(['supervisor', 'admin', 'hr'])

async function requireTenantSession() {
  const session = await getServerSession(authOptions)
  const reject = tenantSessionRejectStatus(session?.user?.id, session?.user?.companyId)
  if (reject || !session?.user?.id || !session.user.companyId) {
    return {
      ok: false as const,
      response: NextResponse.json(UNAUTHORIZED, { status: 401 }),
    }
  }
  return { ok: true as const, session }
}

export async function GET() {
  try {
    const gate = await requireTenantSession()
    if (!gate.ok) {
      return gate.response
    }

    const { session } = gate
    const databaseService = await createTenantDatabaseService({
      userId: session.user.id,
      companyId: session.user.companyId,
    })
    const requests = await databaseService.getLeaveRequestsByUser(session.user.id)
    return NextResponse.json(requests)
  } catch (error) {
    devLog.error('List leave requests error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const gate = await requireTenantSession()
    if (!gate.ok) {
      return gate.response
    }

    const { session } = gate
    const body = await request.json()
    const validationResult = validateInput(leaveRequestCreateBodySchema, body)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: formatValidationErrors(validationResult.errors),
        },
        { status: 400 }
      )
    }

    const parsed = validationResult.data
    let totalDays = calculateTotalDays(parsed.start_date, parsed.end_date)
    if (parsed.is_half_day) {
      totalDays = totalDays / 2
    }

    const bound = bindLeaveCreateActor(
      {
        leave_type: parsed.leave_type,
        start_date: format(parsed.start_date, 'yyyy-MM-dd'),
        end_date: format(parsed.end_date, 'yyyy-MM-dd'),
        is_half_day: parsed.is_half_day,
        half_day_type: parsed.half_day_type,
        reason: parsed.reason,
        attachments: parsed.attachments,
        status: 'pending',
        total_days: totalDays,
      },
      session.user.id
    )

    const databaseService = await createTenantDatabaseService({
      userId: session.user.id,
      companyId: session.user.companyId,
    })

    const createPayload = {
      user_id: bound.user_id,
      leave_type: String(bound.leave_type),
      start_date: String(bound.start_date),
      end_date: String(bound.end_date),
      total_days: Number(bound.total_days),
      reason: bound.reason as string | undefined,
      status: 'pending' as const,
      attachments: bound.attachments as string[] | undefined,
      is_half_day: parsed.is_half_day,
      half_day_type: parsed.is_half_day ? parsed.half_day_type : undefined,
    }

    let created = await databaseService.createLeaveRequest(createPayload)

    if (
      MANAGER_SELF_LEAVE_ROLES.has(session.user.role) &&
      created.status === 'pending'
    ) {
      created = await databaseService.approveLeaveRequest(
        created.id,
        session.user.id,
        AUTO_APPROVE_COMMENT
      )
    }

    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    devLog.error('Create leave request error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
