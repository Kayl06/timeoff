import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { devLog } from '@/lib/env'
import { tenantSessionRejectStatus } from '@/lib/require-tenant-session'
import { createTenantDatabaseService } from '@/lib/tenant-supabase'
import { uuidSchema, validateInput, formatValidationErrors } from '@/lib/validation'

const UNAUTHORIZED = { error: 'Unauthorized' } as const
const NOTIFICATION_LIST_LIMIT = 5

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

async function parseMarkReadId(request: NextRequest): Promise<string | null> {
  const fromQuery = request.nextUrl.searchParams.get('id')
  if (fromQuery) {
    return fromQuery
  }

  try {
    const body = await request.json()
    if (body && typeof body === 'object' && 'id' in body && typeof body.id === 'string') {
      return body.id
    }
  } catch {
    return null
  }
  return null
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
    const notifications = await databaseService.getNotificationsByUser(
      session.user.id,
      NOTIFICATION_LIST_LIMIT
    )
    return NextResponse.json(notifications.slice(0, NOTIFICATION_LIST_LIMIT))
  } catch (error) {
    devLog.error('List notifications error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const gate = await requireTenantSession()
    if (!gate.ok) {
      return gate.response
    }

    const { session } = gate
    const rawId = await parseMarkReadId(request)
    const idResult = validateInput(uuidSchema, rawId ?? '')
    if (!idResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: formatValidationErrors(idResult.errors),
        },
        { status: 400 }
      )
    }

    const databaseService = await createTenantDatabaseService({
      userId: session.user.id,
      companyId: session.user.companyId,
    })
    const owned = await databaseService.getNotificationsByUser(session.user.id)
    const match = owned.find((row) => row.id === idResult.data)
    if (!match) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const updated = await databaseService.markNotificationAsRead(idResult.data)
    return NextResponse.json(updated)
  } catch (error) {
    devLog.error('Mark notification read error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
