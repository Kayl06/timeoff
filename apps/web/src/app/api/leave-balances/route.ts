import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { devLog } from '@/lib/env'
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
    const year = new Date().getFullYear()
    const policies = await databaseService.getLeavePolicies()
    await databaseService.ensureDefaultLeaveBalances(session.user.id, year, policies)
    const balances = await databaseService.getLeaveBalance(session.user.id, year)
    return NextResponse.json(balances)
  } catch (error) {
    devLog.error('List leave balances error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
