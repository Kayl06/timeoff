import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { env, devLog } from '@/lib/env'
import { inviteEmailSchema, validateInput, formatValidationErrors } from '@/lib/validation'
import { generateInviteToken, hashInviteTokenHex } from '@/lib/invite-token'
import { inviteOwnerRejectStatus } from '@/lib/invite-auth'

const OWNER_INVITE_ERROR = 'Only the company owner can invite teammates.'
const ALREADY_IN_COMPANY_ERROR = 'That email is already in this company.'
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000

type CompanyRow = { id: string; name: string; owner_id: string }

function ownerRejectResponse(status: 401 | 403) {
  return NextResponse.json({ error: OWNER_INVITE_ERROR }, { status })
}

async function requireInviteOwner(): Promise<
  | { ok: true; company: CompanyRow }
  | { ok: false; response: NextResponse }
> {
  const session = await getServerSession(authOptions)
  const sessionUserId = session?.user?.id

  if (!sessionUserId) {
    const status = inviteOwnerRejectStatus(sessionUserId, '') ?? 401
    return { ok: false, response: ownerRejectResponse(status) }
  }

  let company: CompanyRow | null = null

  const byOwner = await supabase
    .from('companies')
    .select('id, name, owner_id')
    .eq('owner_id', sessionUserId)
    .maybeSingle()

  if (byOwner.data) {
    company = byOwner.data as CompanyRow
  } else if (session.user.companyId) {
    const byId = await supabase
      .from('companies')
      .select('id, name, owner_id')
      .eq('id', session.user.companyId)
      .maybeSingle()
    if (byId.data) {
      company = byId.data as CompanyRow
    }
  }

  const reject = inviteOwnerRejectStatus(sessionUserId, company?.owner_id || '')
  if (reject) {
    return { ok: false, response: ownerRejectResponse(reject) }
  }

  if (!company) {
    return { ok: false, response: ownerRejectResponse(403) }
  }

  return { ok: true, company }
}

function acceptUrlForToken(request: NextRequest, rawToken: string): string {
  const base = (env.NEXTAUTH_URL || request.nextUrl.origin).replace(/\/$/, '')
  return `${base}/auth/accept-invite?token=${encodeURIComponent(rawToken)}`
}

export async function GET() {
  try {
    const gate = await requireInviteOwner()
    if (!gate.ok) {
      return gate.response
    }

    const { company } = gate

    const { data: inviteRows, error: inviteError } = await supabase
      .from('company_invites')
      .select('email, created_at, expires_at')
      .eq('company_id', company.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (inviteError) {
      throw inviteError
    }

    const { count: teammateCount, error: countError } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', company.id)
      .neq('id', company.owner_id)

    if (countError) {
      throw countError
    }

    const invites = (inviteRows || []).map((row) => ({
      email: row.email as string,
      createdAt: row.created_at as string,
      expiresAt: row.expires_at as string,
    }))

    return NextResponse.json({
      invites,
      teammateCount: teammateCount ?? 0,
      companyName: company.name,
    })
  } catch (error) {
    devLog.error('List invites error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const gate = await requireInviteOwner()
    if (!gate.ok) {
      return gate.response
    }

    const { company } = gate
    const body = await request.json()
    const validationResult = validateInput(inviteEmailSchema, body)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: formatValidationErrors(validationResult.errors),
        },
        { status: 400 }
      )
    }

    const { email } = validationResult.data

    const { data: existingUser, error: userLookupError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .eq('company_id', company.id)
      .maybeSingle()

    if (userLookupError) {
      throw userLookupError
    }

    const { data: existingInvite, error: inviteLookupError } = await supabase
      .from('company_invites')
      .select('id')
      .eq('email', email)
      .eq('company_id', company.id)
      .eq('status', 'pending')
      .maybeSingle()

    if (inviteLookupError) {
      throw inviteLookupError
    }

    if (existingUser || existingInvite) {
      return NextResponse.json({ error: ALREADY_IN_COMPANY_ERROR }, { status: 409 })
    }

    const rawToken = generateInviteToken()
    const tokenHash = hashInviteTokenHex(rawToken)
    const expiresAt = new Date(Date.now() + INVITE_TTL_MS)

    const { data: invite, error: insertError } = await supabase
      .from('company_invites')
      .insert({
        company_id: company.id,
        email,
        token_hash: tokenHash,
        expires_at: expiresAt.toISOString(),
        status: 'pending',
      })
      .select('id, email, expires_at')
      .single()

    if (insertError || !invite) {
      throw insertError || new Error('Invite insert returned no row')
    }

    devLog.info('Invite created:', invite.id)

    return NextResponse.json(
      {
        email: invite.email,
        acceptUrl: acceptUrlForToken(request, rawToken),
        expiresAt: invite.expires_at,
      },
      { status: 201 }
    )
  } catch (error) {
    devLog.error('Create invite error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
