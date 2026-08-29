import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { UserRole } from '@timeoff/types'
import { authOptions } from '@/lib/auth'
import { devLog } from '@/lib/env'
import { tenantSessionRejectStatus } from '@/lib/require-tenant-session'
import { createTenantDatabaseService } from '@/lib/tenant-supabase'

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

export async function GET() {
  try {
    const gate = await requireTenantSession()
    if (!gate.ok) {
      return gate.response
    }

    const { session } = gate
    if (session.user.role === UserRole.EMPLOYEE) {
      return NextResponse.json(FORBIDDEN, { status: 403 })
    }

    const databaseService = await createTenantDatabaseService({
      userId: session.user.id,
      companyId: session.user.companyId,
    })
    const stats = await databaseService.getManagerTeamStats(session.user.id)
    return NextResponse.json(stats)
  } catch (error) {
    devLog.error('Get manager team stats error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
