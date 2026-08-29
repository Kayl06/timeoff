import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabase, mapUserFromDatabase } from '@/lib/supabase'
import { devLog } from '@/lib/env'
import { inviteAcceptSchema, validateInput, formatValidationErrors } from '@/lib/validation'
import { hashInviteTokenHex } from '@/lib/invite-token'
import { companyIdFromInvite, inviteIsUsable } from '@/lib/invite-accept'

const INVALID_OR_EXPIRED = { error: 'invalid_or_expired' as const }
const EMAIL_EXISTS_ERROR = 'An account with this email already exists. Sign in, or ask your admin for an invite.'

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

    const { data: invite, error: inviteError } = await supabase
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

    const { data: existingUser, error: userLookupError } = await supabase
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

    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        email: inviteRow.email,
        password: hashedPassword,
        first_name: firstName,
        last_name: lastName,
        company_id: companyId,
        role: 'employee',
        department: 'Unassigned',
        team: 'Unassigned',
      })
      .select()
      .single()

    if (createError) {
      if (createError.code === '23505') {
        return NextResponse.json({ error: EMAIL_EXISTS_ERROR }, { status: 409 })
      }
      throw createError
    }

    const { error: acceptError } = await supabase
      .from('company_invites')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
      })
      .eq('id', inviteRow.id)

    if (acceptError) {
      throw acceptError
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
