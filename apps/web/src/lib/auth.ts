import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { mapUserFromDatabase } from './supabase'
import { identitySupabase } from './service-role-supabase'
import { UserRole } from '@timeoff/types'
import { env, devLog } from './env'
import { decideGoogleSignIn, ACCOUNT_EXISTS_PATH, INVITE_REQUIRED_PATH } from './google-signin-gate'
import { buildCreateCompanyWithOwnerArgs } from './create-company-rpc'
import { buildAcceptInviteWithEmployeeArgs } from './accept-invite-rpc'
import {
  readPendingKind,
  readPendingValue,
  clearPendingAuthCookies,
} from './pending-auth-cookie'
import { isCompanyOwner } from './company-owner'
import { hashInviteTokenHex } from './invite-token'
import { companyIdFromInvite, inviteIsUsable } from './invite-accept'

const ACCEPT_INVITE_MISMATCH_PATH = '/auth/accept-invite?error=mismatch'

type InviteBindRow = {
  id: string
  email: string
  status: string
  expires_at: string
  company_id: string
}

async function resolveIsOwner(userId: string, companyId: string | undefined): Promise<boolean> {
  if (!userId || !companyId) {
    return false
  }
  const { data: company } = await identitySupabase
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
          const { data: user, error } = await identitySupabase
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
        const { data: existingUser } = await identitySupabase
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

        if (pendingInvite) {
          if (!pendingValue) {
            return INVITE_REQUIRED_PATH
          }

          const tokenHash = hashInviteTokenHex(pendingValue)
          const { data: invite, error: inviteError } = await identitySupabase
            .from('company_invites')
            .select('id, email, status, expires_at, company_id')
            .eq('token_hash', tokenHash)
            .maybeSingle()

          if (inviteError) {
            throw inviteError
          }

          const inviteRow = invite as InviteBindRow | null
          if (!inviteRow || !inviteIsUsable(inviteRow)) {
            return INVITE_REQUIRED_PATH
          }

          const googleEmail = email.toLowerCase()
          const inviteEmail = inviteRow.email.toLowerCase()
          if (googleEmail !== inviteEmail) {
            return ACCEPT_INVITE_MISMATCH_PATH
          }

          const companyId = companyIdFromInvite(inviteRow)
          const { data: memberByInviteEmail } = await identitySupabase
            .from('users')
            .select('id, company_id')
            .eq('email', inviteRow.email)
            .maybeSingle()
          const member = memberByInviteEmail || existingUser
          const existingCompanyId = member?.company_id as string | undefined

          if (member) {
            if (existingCompanyId !== companyId) {
              clearPendingAuthCookies()
              return ACCOUNT_EXISTS_PATH
            }

            await identitySupabase
              .from('company_invites')
              .update({
                status: 'accepted',
                accepted_at: new Date().toISOString(),
              })
              .eq('id', inviteRow.id)

            clearPendingAuthCookies()
            return true
          }

          const firstName = user.name?.split(' ')[0] || ''
          const lastName = user.name?.split(' ').slice(1).join(' ') || ''
          const { error: rpcError } = await identitySupabase.rpc(
            'accept_invite_with_employee',
            buildAcceptInviteWithEmployeeArgs({
              inviteId: inviteRow.id,
              email: inviteRow.email,
              passwordHash: null,
              firstName,
              lastName,
              companyId,
            })
          )

          if (rpcError) {
            if (rpcError.code === '23505') {
              clearPendingAuthCookies()
              return ACCOUNT_EXISTS_PATH
            }
            devLog.error('Error joining company via Google invite:', rpcError)
            return INVITE_REQUIRED_PATH
          }

          clearPendingAuthCookies()
          return true
        }

        if (existingUser) {
          clearPendingAuthCookies()
          return true
        }

        if (pendingCompany && pendingValue) {
          const firstName = user.name?.split(' ')[0] || ''
          const lastName = user.name?.split(' ').slice(1).join(' ') || ''
          const { error } = await identitySupabase.rpc(
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
          const { data: user } = await identitySupabase
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