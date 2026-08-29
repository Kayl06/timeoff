import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { supabase, mapUserFromDatabase } from './supabase'
import { UserRole } from '@timeoff/types'
import { env, devLog } from './env'
import { decideGoogleSignIn, INVITE_REQUIRED_PATH } from './google-signin-gate'
import { buildCreateCompanyWithOwnerArgs } from './create-company-rpc'
import {
  readPendingKind,
  readPendingValue,
  clearPendingAuthCookies,
} from './pending-auth-cookie'
import { isCompanyOwner } from './company-owner'

async function resolveIsOwner(userId: string, companyId: string | undefined): Promise<boolean> {
  if (!userId || !companyId) {
    return false
  }
  const { data: company } = await supabase
    .from('companies')
    .select('owner_id')
    .eq('id', companyId)
    .single()
  return isCompanyOwner(userId, company?.owner_id || '')
}

export const authOptions: NextAuthOptions = {
  providers: [
    // Google OAuth (only if credentials are provided)
    ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET ? [
      GoogleProvider({
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
      })
    ] : []),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Invalid credentials')
        }

        try {
          // Check if user exists in our database
          const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', credentials.email)
            .single()

          if (error || !user) {
            throw new Error('User not found')
          }

          // Verify password
          const isPasswordValid = await bcrypt.compare(credentials.password, user.password || '')
          
          if (!isPasswordValid) {
            throw new Error('Invalid password')
          }

          // Map user data from database format
          const mappedUser = mapUserFromDatabase(user)

          return {
            id: mappedUser.id,
            email: mappedUser.email,
            name: `${mappedUser.firstName} ${mappedUser.lastName}`,
            first_name: mappedUser.firstName,
            last_name: mappedUser.lastName,
            department: mappedUser.department,
            team: mappedUser.team,
            role: mappedUser.role as UserRole,
            managerId: mappedUser.managerId,
            companyId: mappedUser.companyId,
            isOwner: await resolveIsOwner(mappedUser.id, mappedUser.companyId),
            hireDate: mappedUser.hireDate,
            isActive: mappedUser.isActive,
          }
        } catch (error) {
          devLog.error('Error during credentials authorization:', error)
          return null
        }
      }
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== 'google') {
        return true
      }

      try {
        const email = user.email || ''
        const { data: existingUser } = await supabase
          .from('users')
          .select('*')
          .eq('email', email)
          .single()

        const pendingKind = readPendingKind()
        const pendingValue = readPendingValue()
        const pendingCompany = pendingKind === 'company'
        const pendingInvite = pendingKind === 'invite'

        const decision = decideGoogleSignIn({
          existingUser: Boolean(existingUser),
          pendingCompany,
          pendingInvite,
        })

        if (decision !== true) {
          return INVITE_REQUIRED_PATH
        }

        if (existingUser) {
          clearPendingAuthCookies()
          return true
        }

        // Deny-until-01-05: do not insert a global employee for invite kind
        if (pendingInvite && !existingUser) {
          return INVITE_REQUIRED_PATH
        }

        if (pendingCompany && pendingValue) {
          const firstName = user.name?.split(' ')[0] || ''
          const lastName = user.name?.split(' ').slice(1).join(' ') || ''
          const { error } = await supabase.rpc(
            'create_company_with_owner',
            buildCreateCompanyWithOwnerArgs({
              email,
              passwordHash: null,
              firstName,
              lastName,
              companyName: pendingValue,
            })
          )

          if (error) {
            devLog.error('Error creating company via Google:', error)
            return INVITE_REQUIRED_PATH
          }

          clearPendingAuthCookies()
          return true
        }

        return INVITE_REQUIRED_PATH
      } catch (error) {
        devLog.error('Error during Google sign in:', error)
        return INVITE_REQUIRED_PATH
      }
    },
    async session({ session, token }) {
      if (session.user?.email) {
        try {
          // Get user data from our database
          const { data: user } = await supabase
            .from('users')
            .select('*')
            .eq('email', session.user.email)
            .single()

          if (user) {
            const mappedUser = mapUserFromDatabase(user)
            session.user = {
              ...session.user,
              id: mappedUser.id,
              first_name: mappedUser.firstName,
              last_name: mappedUser.lastName,
              department: mappedUser.department,
              team: mappedUser.team,
              role: mappedUser.role,
              managerId: mappedUser.managerId,
              companyId: mappedUser.companyId,
              isOwner: await resolveIsOwner(mappedUser.id, mappedUser.companyId),
              hireDate: mappedUser.hireDate,
              isActive: mappedUser.isActive,
            } as any
          }
        } catch (error) {
          devLog.error('Error fetching user data:', error)
        }
      }
      return session
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.first_name = (user as any).first_name
        token.last_name = (user as any).last_name
        token.department = (user as any).department
        token.team = (user as any).team
        token.role = (user as any).role
        token.managerId = (user as any).managerId
        token.companyId = (user as any).companyId
        token.isOwner = (user as any).isOwner ?? await resolveIsOwner(user.id, (user as any).companyId)
        token.hireDate = (user as any).hireDate
        token.isActive = (user as any).isActive
      }
      return token
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: env.NEXTAUTH_SECRET,
  debug: env.NODE_ENV === 'development',
} 