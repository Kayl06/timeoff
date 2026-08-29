import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { devLog } from '@/lib/env'
import { hashInviteTokenHex } from '@/lib/invite-token'
import { inviteIsUsable } from '@/lib/invite-accept'

const INVALID_OR_EXPIRED = { error: 'invalid_or_expired' as const }

type InvitePreviewRow = {
  email: string
  status: string
  expires_at: string
  companies: { name: string } | { name: string }[] | null
}

function companyNameFromJoin(companies: InvitePreviewRow['companies']): string | null {
  if (!companies) {
    return null
  }
  if (Array.isArray(companies)) {
    return companies[0]?.name ?? null
  }
  return companies.name ?? null
}

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token')?.trim() || ''
    if (!token) {
      return NextResponse.json(INVALID_OR_EXPIRED, { status: 404 })
    }

    const tokenHash = hashInviteTokenHex(token)
    const { data: invite, error } = await supabase
      .from('company_invites')
      .select('email, status, expires_at, companies(name)')
      .eq('token_hash', tokenHash)
      .maybeSingle()

    if (error) {
      throw error
    }

    if (!invite || !inviteIsUsable(invite as InvitePreviewRow)) {
      return NextResponse.json(INVALID_OR_EXPIRED, { status: 404 })
    }

    const companyName = companyNameFromJoin((invite as InvitePreviewRow).companies)
    if (!companyName) {
      return NextResponse.json(INVALID_OR_EXPIRED, { status: 404 })
    }

    return NextResponse.json({
      companyName,
      email: (invite as InvitePreviewRow).email,
    })
  } catch (error) {
    devLog.error('Invite preview error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
