'use client'

import { useParams } from 'next/navigation'
import { DashboardHeader } from './dashboard-header'
import { DashboardTabs } from './dashboard-tabs'
import { useDashboardData } from '@/hooks/use-dashboard-data'
import { LeaveRequest, User, UserRole } from '@timeoff/types'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

const EMPTY_HEADING = 'No teammates yet'
const EMPTY_BODY = 'Invite people by email so they can join this company. Open your profile menu and choose Invite teammates.'

export function DashboardView({ slug }: { slug: string }) {
  const [selectedTab, setSelectedTab] = useState<string>(slug || 'overview')
  const [teammateCount, setTeammateCount] = useState<number | null>(null)

  useEffect(() => {
    setSelectedTab(slug)
  }, [slug])


  const { data: session, status } = useSession()

  useEffect(() => {
    if (status !== 'authenticated' || !session?.user?.isOwner) {
      return
    }

    let cancelled = false

    async function loadTeammateCount() {
      try {
        const response = await fetch('/api/auth/invites', { credentials: 'include' })
        const payload = await response.json().catch(() => ({}))
        if (cancelled) {
          return
        }
        if (!response.ok) {
          toast.error(payload.error || 'Failed to load teammates')
          return
        }
        setTeammateCount(typeof payload.teammateCount === 'number' ? payload.teammateCount : 0)
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load teammates:', error)
          toast.error('Failed to load teammates')
        }
      }
    }

    loadTeammateCount()
    return () => {
      cancelled = true
    }
  }, [status, session?.user?.isOwner])

  // Map NextAuth session user to User type
  const user: User = {
      id: session?.user.id || '',
      email: session?.user.email || '',
      first_name: session?.user.first_name || '',
      last_name: session?.user.last_name || '',
      avatar: session?.user.image || undefined,
      department: session?.user.department || '',
      team: session?.user.team || '',
      role: session?.user.role as UserRole || '',
      manager_id: session?.user.managerId || '',
      hire_date: session?.user.hireDate || new Date(),
      is_active: session?.user.isActive || true,
      created_at: new Date(), // Mock value for now
      updated_at: new Date(), // Mock value for now
  }
  
  const {
    leaveBalance,
    recentRequests,
    stats,
    getRequestsData,
    balanceLoading,
    requestsLoading,
    teamRequestsLoading,
    allRequestsLoading,
    isCreatingLeaveRequest,
    createLeaveRequest,
    calculateTotalDays
  } = useDashboardData(user)

  const requestsData = getRequestsData(selectedTab)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <DashboardHeader
          user={user}
          onSubmit={createLeaveRequest}
          isLoading={isCreatingLeaveRequest}
          calculateTotalDays={calculateTotalDays}
        />

        {session?.user?.isOwner && teammateCount === 0 && (
          <div className="mb-8">
            <p className="font-bold">{EMPTY_HEADING}</p>
            <p className="mt-1 whitespace-normal break-words text-gray-600">
              {EMPTY_BODY}
            </p>
          </div>
        )}

        {/* Tabs */}
        <DashboardTabs
          selectedTab={selectedTab}
          user={user}
          stats={stats}
          leaveBalance={leaveBalance}
          recentRequests={recentRequests}
          requestsData={requestsData as LeaveRequest[]}
          balanceLoading={balanceLoading}
          requestsLoading={requestsLoading}
          teamRequestsLoading={teamRequestsLoading}
          allRequestsLoading={allRequestsLoading}
        />
      </div>
    </div>
  )
} 