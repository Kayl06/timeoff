import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { User, LeaveRequest, LeaveBalance, Notification } from '@timeoff/types'
import { calculateTotalDays } from '@/lib/date-utils'
import { 
  DatabaseLeaveRequest, 
  DatabaseLeaveBalance, 
  DatabaseNotification,
  adaptLeaveRequests,
  adaptLeaveBalances,
  adaptNotifications
} from '@/lib/type-adapters'
import { toast } from 'sonner'

async function fetchSessionJson<T>(url: string, fallbackError: string): Promise<T> {
  const response = await fetch(url, { credentials: 'include' })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload.error || fallbackError)
  }
  return payload as T
}

interface DashboardDataReturn {
  leaveBalance: LeaveBalance[]
  recentRequests: LeaveRequest[]
  teamRequests: LeaveRequest[]
  teamStats: any
  allRequests: LeaveRequest[]
  notifications: Notification[]
  balanceLoading: boolean
  requestsLoading: boolean
  teamRequestsLoading: boolean
  teamStatsLoading: boolean
  allRequestsLoading: boolean
  notificationsLoading: boolean
  isCreatingLeaveRequest: boolean
  stats: {
    totalRequests: number
    pendingRequests: number
    approvedRequests: number
    unreadNotifications: number
    teamMembersCount?: number
    teamPendingRequests?: number
    teamApprovedThisMonth?: number
    allPendingRequests?: number
  }
  getRequestsData: (selectedTab: string) => LeaveRequest[]
  createLeaveRequest: (data: Omit<DatabaseLeaveRequest, 'id' | 'created_at' | 'updated_at'>) => Promise<DatabaseLeaveRequest>
  calculateTotalDays: (startDate: Date, endDate: Date) => number
  isManager: boolean
  isAdminOrHR: boolean
}

export function useDashboardData(user: User): DashboardDataReturn {
  const queryClient = useQueryClient()

  // Role-based flags
  const isManager = user.role === 'supervisor' || user.role === 'admin' || user.role === 'hr'
  const isAdminOrHR = user.role === 'admin' || user.role === 'hr'

  // Fetch user's leave balance
  const { data: leaveBalance, isLoading: balanceLoading, error: leaveBalanceError } = useQuery({
    queryKey: ['leaveBalance', user.id],
    queryFn: () => fetchSessionJson<DatabaseLeaveBalance[]>(
      '/api/leave-balances',
      'Failed to load leave balances'
    ),
    enabled: !!user?.id
  })

  useEffect(() => {
    if (leaveBalanceError) {
      toast.error('Failed to load leave balances')
    }
  }, [leaveBalanceError])

  // Fetch user's recent requests (scope=own so managers still see their own list)
  const { data: recentRequests, isLoading: requestsLoading } = useQuery({
    queryKey: ['recentRequests', user.id],
    queryFn: () => fetchSessionJson<DatabaseLeaveRequest[]>(
      '/api/leave-requests?scope=own',
      'Failed to load leave requests'
    ),
    enabled: !!user?.id
  })

  // Fetch team data for managers
  const { data: teamRequests, isLoading: teamRequestsLoading } = useQuery({
    queryKey: ['teamLeaveRequests', user.id],
    queryFn: () => fetchSessionJson<DatabaseLeaveRequest[]>(
      '/api/leave-requests?scope=team',
      'Failed to load team leave requests'
    ),
    enabled: isManager && !!user?.id
  })

  // Fetch team stats for managers
  const { data: teamStats, isLoading: teamStatsLoading } = useQuery({
    queryKey: ['teamStats', user.id],
    queryFn: () => fetchSessionJson(
      '/api/manager-team-stats',
      'Failed to load team stats'
    ),
    enabled: isManager && !!user?.id
  })

  // Fetch all requests for admins/HR
  const { data: allRequests, isLoading: allRequestsLoading } = useQuery({
    queryKey: ['allLeaveRequests'],
    queryFn: () => fetchSessionJson<DatabaseLeaveRequest[]>(
      '/api/leave-requests?scope=all',
      'Failed to load leave requests'
    ),
    enabled: isAdminOrHR && !!user?.id
  })

  // Fetch notifications
  const { data: notifications, isLoading: notificationsLoading } = useQuery({
    queryKey: ['notifications', user.id],
    queryFn: () => fetchSessionJson<DatabaseNotification[]>(
      '/api/notifications',
      'Failed to load notifications'
    ),
    enabled: !!user?.id
  })

  // Create leave request mutation
  const { mutateAsync: createLeaveRequest, isPending: isCreatingLeaveRequest } = useMutation({
    mutationFn: async (data: Omit<DatabaseLeaveRequest, 'id' | 'created_at' | 'updated_at'>) => {
      const { user_id: _ignored, ...body } = data
      const response = await fetch('/api/leave-requests', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to create leave request')
      }
      return payload as DatabaseLeaveRequest
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaveBalance', user.id] })
      queryClient.invalidateQueries({ queryKey: ['recentRequests', user.id] })
      queryClient.invalidateQueries({ queryKey: ['notifications', user.id] })
      queryClient.invalidateQueries({ queryKey: ['teamLeaveRequests'] })
      queryClient.invalidateQueries({ queryKey: ['allLeaveRequests'] })
      queryClient.invalidateQueries({ queryKey: ['personalLeaveRequests', user.id] })
      toast.success('Leave request submitted successfully')
    }
  })

  // Compute statistics
  const stats = {
    totalRequests: recentRequests?.length || 0,
    pendingRequests: recentRequests?.filter(req => req.status === 'pending').length || 0,
    approvedRequests: recentRequests?.filter(req => req.status === 'approved').length || 0,
    unreadNotifications: notifications?.filter(n => !n.is_read).length || 0,
    teamMembersCount: teamStats?.teamMembersCount || 0,
    teamPendingRequests: teamRequests?.filter(req => req.status === 'pending').length || 0,
    teamApprovedThisMonth: teamStats?.monthlyApprovedCount || 0,
    allPendingRequests: allRequests?.filter(req => req.status === 'pending').length || 0,
  }

  // Determine which data to show in requests table
  const getRequestsData = (selectedTab: string): LeaveRequest[] => {
    if (selectedTab === 'requests') {
      if (isAdminOrHR) {
        return adaptLeaveRequests(allRequests || [])
      } else if (isManager) {
        return adaptLeaveRequests(teamRequests || [])
      }
    }
    return adaptLeaveRequests(recentRequests || [])
  }

  return {
    // Data (converted to types package types)
    leaveBalance: adaptLeaveBalances(leaveBalance || []),
    recentRequests: adaptLeaveRequests(recentRequests || []),
    teamRequests: adaptLeaveRequests(teamRequests || []),
    teamStats,
    allRequests: adaptLeaveRequests(allRequests || []),
    notifications: adaptNotifications(notifications || []),
    
    // Loading states
    balanceLoading,
    requestsLoading,
    teamRequestsLoading,
    teamStatsLoading,
    allRequestsLoading,
    notificationsLoading,
    isCreatingLeaveRequest,
    
    // Computed values
    stats,
    getRequestsData,
    
    // Actions
    createLeaveRequest,
    calculateTotalDays,
    
    // Role flags
    isManager,
    isAdminOrHR
  }
}
