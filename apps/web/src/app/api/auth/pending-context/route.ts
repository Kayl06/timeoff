import { NextRequest, NextResponse } from 'next/server'
import { devLog } from '@/lib/env'
import { setPendingAuthCookies } from '@/lib/pending-auth-cookie'
import { pendingContextSchema, validateInput, formatValidationErrors } from '@/lib/validation'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validationResult = validateInput(pendingContextSchema, body)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: formatValidationErrors(validationResult.errors),
        },
        { status: 400 }
      )
    }

    const data = validationResult.data
    const value = data.kind === 'company' ? data.companyName : data.token
    setPendingAuthCookies(data.kind, value)

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    devLog.error('Pending context error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
