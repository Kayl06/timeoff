import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabase, mapUserFromDatabase, testSupabaseConnection } from '@/lib/supabase'
import { buildCreateCompanyWithOwnerArgs } from '@/lib/create-company-rpc'
import { devLog } from '@/lib/env'
import { userRegistrationSchema, validateInput, formatValidationErrors } from '@/lib/validation'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input data
    const validationResult = validateInput(userRegistrationSchema, body)
    
    if (!validationResult.success) {
      const errors = formatValidationErrors(validationResult.errors)
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: errors,
          message: 'Please check your input and try again'
        },
        { status: 400 }
      )
    }

    const { companyName, firstName, lastName, email, password } = validationResult.data
    const connectionTest = await testSupabaseConnection()

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      )
    }

    // Hash password
    const saltRounds = 12
    const hashedPassword = await bcrypt.hash(password, saltRounds)

    const { data: newUser, error: createError } = await supabase.rpc(
      'create_company_with_owner',
      buildCreateCompanyWithOwnerArgs({
        email,
        passwordHash: hashedPassword,
        firstName,
        lastName,
        companyName,
      })
    )

    if (createError) {
      if (createError.code === '23505') {
        return NextResponse.json(
          { error: 'User with this email already exists' },
          { status: 409 }
        )
      }
      devLog.error('Error creating company:', createError)
      return NextResponse.json(
        { error: 'Failed to create user', details: createError.message, connectionTest: connectionTest },
        { status: 500 }
      )
    }

    devLog.info('New company owner created:', newUser?.id)

    // Map the user data and remove password from response
    const mappedUser = mapUserFromDatabase(newUser)
    const { password: _, ...userWithoutPassword } = mappedUser

    return NextResponse.json(
      { 
        message: 'User created successfully',
        user: userWithoutPassword
      },
      { status: 201 }
    )

  } catch (error) {
    devLog.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
