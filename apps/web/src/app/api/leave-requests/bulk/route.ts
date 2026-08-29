import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { devLog } from '@/lib/env'
import { tenantSessionRejectStatus } from '@/lib/require-tenant-session'
import { createTenantDatabaseService } from '@/lib/tenant-supabase'
import { bindLeaveApprover } from '@/lib/bind-leave-actor'
import {
  leaveRequestBulkBodySchema,
  validateInput,
  formatValidationErrors,
} from '@/lib/validation'

const UNAUTHORIZED = { error: 'Unauthorized' } as const

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

export async function POST(request: NextRequest) {
  try {
    const gate = await requireTenantSession()
    if (!gate.ok) {
      return gate.response
    }

    const { session } = gate
    const body = await request.json()
    const validationResult = validateInput(leaveRequestBulkBodySchema, body)

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
    const now = new Date()
    const updates =
      parsed.action === 'approve'
        ? { status: 'approved' as const, approved_at: now }
        : { status: 'rejected' as const, rejected_at: now }

    const boundUpdates = bindLeaveApprover(updates, session.user.id)
    const databaseService = await createTenantDatabaseService({
      userId: session.user.id,
      companyId: session.user.companyId,
    })
    const result = await databaseService.bulkUpdateLeaveRequests(parsed.ids, {
      status: updates.status,
      approver_id: boundUpdates.approver_id,
      ...(parsed.action === 'approve'
        ? { approved_at: now }
        : { rejected_at: now }),
    })
    return NextResponse.json(result)
  } catch (error) {
    devLog.error('Bulk update leave requests error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
