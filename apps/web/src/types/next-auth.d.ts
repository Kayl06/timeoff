import { User as NextAuthUser } from 'next-auth'
import { UserRole } from '@timeoff/types'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email?: string | null
      name?: string | null
      image?: string | null
      first_name: string
      last_name: string
      department: string
      team: string
      role: UserRole
      managerId?: string
      companyId: string
      isOwner: boolean
      hireDate: Date
      isActive: boolean
    }
  }

  interface User extends NextAuthUser {
    id: string
    first_name: string
    last_name: string
    department: string
    team: string
    role: UserRole
    managerId?: string
    companyId: string
    isOwner: boolean
    hireDate: Date
    isActive: boolean
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    first_name: string
    last_name: string
    department: string
    team: string
    role: UserRole
    managerId?: string
    companyId: string
    isOwner: boolean
    hireDate: Date
    isActive: boolean
  }
} 