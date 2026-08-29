import { createClient } from '@supabase/supabase-js'
import { env, devLog } from './env'

export const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!, env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! , {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Test connection function
export async function testSupabaseConnection() {
  try {
    // Test with a simple query that doesn't trigger RLS
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .limit(0)
    
    if (error) {
      devLog.error('Supabase connection test failed:', error)
      return false
    }
    
    devLog.info('Supabase connection test successful')
    return true
  } catch (error) {
    devLog.error('Supabase connection test error:', error)
    return false
  }
}

// User type definition
export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  password?: string
  avatar?: string
  department: string
  team: string
  role: string
  managerId?: string
  companyId: string
  hireDate: Date
  isActive: boolean
  acceptMarketing?: boolean
  emailVerified?: boolean
  emailVerifiedAt?: Date
  lastSignInAt?: Date
  signInCount?: number
  createdAt: Date
  updatedAt: Date
}

// Auth response type
export interface AuthResponse {
  user: User | null
  error: string | null
}

// Helper function to map database column names
export const mapUserFromDatabase = (dbUser: any): User => {
  return {
    id: dbUser.id,
    email: dbUser.email,
    firstName: dbUser.first_name || dbUser.firstName,
    lastName: dbUser.last_name || dbUser.lastName,
    password: dbUser.password,
    avatar: dbUser.avatar,
    department: dbUser.department,
    team: dbUser.team,
    role: dbUser.role,
    managerId: dbUser.manager_id || dbUser.managerId,
    companyId: dbUser.company_id || dbUser.companyId || '',
    hireDate: new Date(dbUser.hire_date || dbUser.hireDate),
    isActive: dbUser.is_active || dbUser.isActive,
    acceptMarketing: dbUser.accept_marketing,
    emailVerified: dbUser.email_verified,
    emailVerifiedAt: dbUser.email_verified_at ? new Date(dbUser.email_verified_at) : undefined,
    lastSignInAt: dbUser.last_sign_in_at ? new Date(dbUser.last_sign_in_at) : undefined,
    signInCount: dbUser.sign_in_count,
    createdAt: new Date(dbUser.created_at || dbUser.createdAt),
    updatedAt: new Date(dbUser.updated_at || dbUser.updatedAt),
  }
}

// Helper function to map user data to database format
export const mapUserToDatabase = (user: Partial<User>): any => {
  return {
    email: user.email,
    first_name: user.firstName,
    last_name: user.lastName,
    password: user.password,
    avatar: user.avatar,
    department: user.department,
    team: user.team,
    role: user.role,
    manager_id: user.managerId,
    company_id: user.companyId,
    hire_date: user.hireDate,
    is_active: user.isActive,
    accept_marketing: user.acceptMarketing,
    email_verified: user.emailVerified,
    email_verified_at: user.emailVerifiedAt,
    last_sign_in_at: user.lastSignInAt,
    sign_in_count: user.signInCount,
  }
} 