import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { mapUserFromDatabase } from '@/lib/supabase'
import { identitySupabase } from '@/lib/service-role-supabase'
import { buildAcceptInviteWithEmployeeArgs } from '@/lib/accept-invite-rpc'
import { EMAIL_EXISTS_ERROR } from '@/lib/invite-auth'
import { devLog } from '@/lib/env'
import { inviteAcceptSchema, validateInput, formatValidationErrors } from '@/lib/validation'
import { hashInviteTokenHex } from '@/lib/invite-token'
import { companyIdFromInvite, inviteIsUsable } from '@/lib/invite-accept'

const INVALID_OR_EXPIRED = { error: 'invalid_or_expired' as const }

type InviteRow = {
  id: string
  email: string
  status: string
  expires_at: string
  company_id: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validationResult = validateInput(inviteAcceptSchema, body)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: formatValidationErrors(validationResult.errors),
          message: 'Please check your input and try again',
        },
        { status: 400 }
      )
    }

    const { token, firstName, lastName, password } = validationResult.data
    const tokenHash = hashInviteTokenHex(token)

    const { data: invite, error: inviteError } = await identitySupabase
      .from('company_invites')
      .select('id, email, status, expires_at, company_id')
      .eq('token_hash', tokenHash)
      .maybeSingle()

    if (inviteError) {
      throw inviteError
    }

    if (!invite || !inviteIsUsable(invite as InviteRow)) {
      return NextResponse.json(INVALID_OR_EXPIRED, { status: 404 })
    }

    const inviteRow = invite as InviteRow
    const companyId = companyIdFromInvite(inviteRow)

    const { data: existingUser, error: userLookupError } = await identitySupabase
      .from('users')
      .select('id')
      .eq('email', inviteRow.email)
      .maybeSingle()

    if (userLookupError) {
      throw userLookupError
    }

    if (existingUser) {
      return NextResponse.json({ error: EMAIL_EXISTS_ERROR }, { status: 409 })
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const { data: newUser, error: rpcError } = await identitySupabase.rpc(
      'accept_invite_with_employee',
      buildAcceptInviteWithEmployeeArgs({
        inviteId: inviteRow.id,
        email: inviteRow.email,
        passwordHash: hashedPassword,
        firstName,
        lastName,
        companyId,
      })
    )

    if (rpcError) {
      if (rpcError.code === '23505' || rpcError.message?.includes('unique_violation')) {
        return NextResponse.json({ error: EMAIL_EXISTS_ERROR }, { status: 409 })
      }
      if (rpcError.message?.includes('invite_not_pending')) {
        return NextResponse.json(INVALID_OR_EXPIRED, { status: 404 })
      }
      throw rpcError
    }

    const mappedUser = mapUserFromDatabase(newUser)
    const { password: _, ...userWithoutPassword } = mappedUser

    return NextResponse.json(
      {
        message: 'Invite accepted',
        user: userWithoutPassword,
      },
      { status: 201 }
    )
  } catch (error) {
    devLog.error('Invite accept error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
