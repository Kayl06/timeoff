import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { devLog } from '@/lib/env'
import {
  fetchLeaveRequestsForScope,
  resolveLeaveListScope,
} from '@/lib/leave-list-scope'
import { tenantSessionRejectStatus } from '@/lib/require-tenant-session'
import { createTenantDatabaseService } from '@/lib/tenant-supabase'

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

export async function GET(request: NextRequest) {
  try {
    const gate = await requireTenantSession()
    if (!gate.ok) {
      return gate.response
    }

    const { session } = gate
    const scope = resolveLeaveListScope(
      session.user.role,
      request.nextUrl.searchParams.get('scope')
    )
    const databaseService = await createTenantDatabaseService({
      userId: session.user.id,
      companyId: session.user.companyId,
    })
    const requests = await fetchLeaveRequestsForScope(databaseService, {
      userId: session.user.id,
      department: session.user.department,
      scope,
    })
    return NextResponse.json(requests)
  } catch (error) {
    devLog.error('List calendar leave requests error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
