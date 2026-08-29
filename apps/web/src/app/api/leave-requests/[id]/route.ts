import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { devLog } from '@/lib/env'
import { tenantSessionRejectStatus } from '@/lib/require-tenant-session'
import { createTenantDatabaseService } from '@/lib/tenant-supabase'
import { bindLeaveApprover, canApproveOrRejectLeave, canCancelOrDeleteLeave } from '@/lib/bind-leave-actor'
import {
  leaveRequestPatchBodySchema,
  uuidSchema,
  validateInput,
  formatValidationErrors,
} from '@/lib/validation'

const UNAUTHORIZED = { error: 'Unauthorized' } as const
const FORBIDDEN = { error: 'Forbidden' } as const

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const gate = await requireTenantSession()
    if (!gate.ok) {
      return gate.response
    }

    const { session } = gate
    const idResult = validateInput(uuidSchema, params.id)
    if (!idResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: formatValidationErrors(idResult.errors),
        },
        { status: 400 }
      )
    }

    const body = await request.json()
    const validationResult = validateInput(leaveRequestPatchBodySchema, body)

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
    const databaseService = await createTenantDatabaseService({
      userId: session.user.id,
      companyId: session.user.companyId,
    })

    switch (parsed.action) {
      case 'approve': {
        if (!canApproveOrRejectLeave(session.user.role)) {
          return NextResponse.json(FORBIDDEN, { status: 403 })
        }
        const bound = bindLeaveApprover(
          { comments: parsed.comments },
          session.user.id
        )
        const updated = await databaseService.approveLeaveRequest(
          idResult.data,
          bound.approver_id,
          parsed.comments
        )
        return NextResponse.json(updated)
      }
      case 'reject': {
        if (!canApproveOrRejectLeave(session.user.role)) {
          return NextResponse.json(FORBIDDEN, { status: 403 })
        }
        const bound = bindLeaveApprover(
          { reason: parsed.reason },
          session.user.id
        )
        const updated = await databaseService.rejectLeaveRequest(
          idResult.data,
          bound.approver_id,
          parsed.reason as string
        )
        return NextResponse.json(updated)
      }
      case 'cancel': {
        const existing = await databaseService.getLeaveRequestById(idResult.data)
        if (
          !existing ||
          !canCancelOrDeleteLeave(
            session.user.role,
            session.user.id,
            existing.user_id
          )
        ) {
          return NextResponse.json(FORBIDDEN, { status: 403 })
        }
        const updated = await databaseService.cancelLeaveRequest(idResult.data)
        return NextResponse.json(updated)
      }
      case 'delete': {
        const existing = await databaseService.getLeaveRequestById(idResult.data)
        if (
          !existing ||
          !canCancelOrDeleteLeave(
            session.user.role,
            session.user.id,
            existing.user_id
          )
        ) {
          return NextResponse.json(FORBIDDEN, { status: 403 })
        }
        const updated = await databaseService.deleteLeaveRequest(idResult.data)
        return NextResponse.json(updated)
      }
      default: {
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
      }
    }
  } catch (error) {
    devLog.error('Patch leave request error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
