'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Calendar, Clock, TrendingDown } from 'lucide-react'
import type { LeaveBalance } from '@timeoff/types'
import { balancesForLeaveCard } from '@/lib/leave-balance-display'

interface LeaveBalanceCardProps {
  leaveBalance?: LeaveBalance[] | null
  isLoading: boolean
}

export function LeaveBalanceCard({ leaveBalance, isLoading }: LeaveBalanceCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Leave Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                <div className="h-2 bg-gray-200 rounded w-full"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const cardBalances = balancesForLeaveCard(leaveBalance ?? [])

  if (!leaveBalance || leaveBalance.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Leave Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No leave balance information available
          </p>
        </CardContent>
      </Card>
    )
  }

  const getLeaveTypeDisplayName = (type: string) => {
    const displayNames: Record<string, string> = {
      vacation: 'Vacation',
      sick: 'Sick Leave',
      personal: 'Personal',
      maternity: 'Maternity',
      paternity: 'Paternity',
      bereavement: 'Bereavement',
      unpaid: 'Unpaid',
      other: 'Other'
    }
    return displayNames[type] || type
  }

  const getLeaveTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      vacation: 'bg-blue-500',
      sick: 'bg-red-500',
      personal: 'bg-purple-500',
      maternity: 'bg-pink-500',
      paternity: 'bg-indigo-500',
      bereavement: 'bg-gray-500',
      unpaid: 'bg-yellow-500',
      other: 'bg-green-500'
    }
    return colors[type] || 'bg-gray-500'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Leave Balance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {cardBalances.map((balance) => {
            const percentage = balance.total_allowance > 0
              ? ((balance.used_days / balance.total_allowance) * 100)
              : 0

            return (
              <div key={balance.id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${getLeaveTypeColor(balance.leave_type)}`} />
                    <span className="font-medium">
                      {getLeaveTypeDisplayName(balance.leave_type)}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {balance.used_days}/{balance.total_allowance} days
                  </div>
                </div>

                <Progress value={percentage} className="h-2" />

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1 text-green-600">
                    <Clock className="h-4 w-4" />
                    <span>{balance.remaining_days} days remaining</span>
                  </div>

                  {balance.carried_over > 0 && (
                    <div className="flex items-center gap-1 text-blue-600">
                      <TrendingDown className="h-4 w-4" />
                      <span>{balance.carried_over} carried over</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
} 