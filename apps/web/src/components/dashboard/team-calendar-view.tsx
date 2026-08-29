'use client'

import { useState, useMemo } from 'react'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { CalendarIcon, Users, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { LeaveRequest, LeaveType, RequestStatus, User } from '@timeoff/types'
import { format, isSameDay, isWithinInterval, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns'
import { ViewLeaveRequestDialog } from './view-leave-request-dialog'

interface TeamCalendarViewProps {
  user: User
  className?: string
}

interface CalendarDay {
  date: Date
  leaveRequests: (LeaveRequest & { user: User })[]
}

const getStatusColor = (status: RequestStatus) => {
  switch (status) {
    case RequestStatus.APPROVED:
      return 'bg-green-100 text-green-800 border-green-200'
    case RequestStatus.PENDING:
      return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case RequestStatus.REJECTED:
      return 'bg-red-100 text-red-800 border-red-200'
    case RequestStatus.CANCELLED:
      return 'bg-gray-100 text-gray-800 border-gray-200'
    default:
      return 'bg-blue-100 text-blue-800 border-blue-200'
  }
}

const getLeaveTypeColor = (leaveType: LeaveType) => {
  switch (leaveType) {
    case LeaveType.VACATION:
      return 'bg-blue-500'
    case LeaveType.SICK:
      return 'bg-red-500'
    case LeaveType.PERSONAL:
      return 'bg-purple-500'
    case LeaveType.MATERNITY:
      return 'bg-pink-500'
    case LeaveType.PATERNITY:
      return 'bg-indigo-500'
    case LeaveType.BEREAVEMENT:
      return 'bg-gray-500'
    case LeaveType.UNPAID:
      return 'bg-orange-500'
    default:
      return 'bg-gray-500'
  }
}

const getStatusIcon = (status: RequestStatus) => {
  switch (status) {
    case RequestStatus.APPROVED:
      return <CheckCircle className="h-4 w-4 text-green-600" />
    case RequestStatus.PENDING:
      return <Clock className="h-4 w-4 text-yellow-600" />
    case RequestStatus.REJECTED:
      return <XCircle className="h-4 w-4 text-red-600" />
    case RequestStatus.CANCELLED:
      return <AlertCircle className="h-4 w-4 text-gray-600" />
    default:
      return <Clock className="h-4 w-4 text-blue-600" />
  }
}

export function TeamCalendarView({ user, className }: TeamCalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date())
  const [statusFilter, setStatusFilter] = useState<RequestStatus | 'all'>('all')
  const [leaveTypeFilter, setLeaveTypeFilter] = useState<LeaveType | 'all'>('all')
  const [selectedRequest, setSelectedRequest] = useState<(LeaveRequest & { user: User }) | null>(null)

  // Fetch team members (this would need to be implemented in DatabaseService)
  const { data: teamMembers, isLoading: teamLoading } = useQuery({
    queryKey: ['teamMembers', user.id],
    queryFn: async () => {
      // For now, we'll simulate team members - in a real app, you'd fetch from the database
      return [
        { id: '1', first_name: 'John', last_name: 'Doe', email: 'john@example.com', department: 'Engineering', team: 'Frontend', role: 'employee' },
        { id: '2', first_name: 'Jane', last_name: 'Smith', email: 'jane@example.com', department: 'Engineering', team: 'Backend', role: 'employee' },
        { id: '3', first_name: 'Bob', last_name: 'Johnson', email: 'bob@example.com', department: 'Engineering', team: 'DevOps', role: 'employee' },
      ] as User[]
    },
    enabled: user.role === 'supervisor' || user.role === 'admin' || user.role === 'hr'
  })

  // Fetch all leave requests for team members
  const { data: teamLeaveRequests, isLoading: requestsLoading } = useQuery({
    queryKey: ['teamLeaveRequests', teamMembers?.map(m => m.id)],
    queryFn: async () => {
      if (!teamMembers) return []

      // In a real app, you'd fetch all leave requests for team members
      // For now, we'll simulate some data
      const mockRequests = [
        {
          id: '1',
          user_id: '1',
          leave_type: LeaveType.VACATION,
          start_date: new Date('2024-01-15'),
          end_date: new Date('2024-01-19'),
          total_days: 5,
          reason: 'Family vacation',
          status: RequestStatus.APPROVED,
          created_at: new Date('2024-01-01'),
          updated_at: new Date('2024-01-01'),
          user: teamMembers[0]
        },
        {
          id: '2',
          user_id: '2',
          leave_type: LeaveType.SICK,
          start_date: new Date('2024-01-20'),
          end_date: new Date('2024-01-22'),
          total_days: 3,
          reason: 'Not feeling well',
          status: RequestStatus.PENDING,
          created_at: new Date('2024-01-15'),
          updated_at: new Date('2024-01-15'),
          user: teamMembers[1]
        },
        {
          id: '3',
          user_id: '3',
          leave_type: LeaveType.PERSONAL,
          start_date: new Date('2024-01-25'),
          end_date: new Date('2024-01-26'),
          total_days: 2,
          reason: 'Personal appointment',
          status: RequestStatus.APPROVED,
          created_at: new Date('2024-01-10'),
          updated_at: new Date('2024-01-10'),
          user: teamMembers[2]
        }
      ] as unknown as (LeaveRequest & { user: User })[]

      return mockRequests
    },
    enabled: !!teamMembers && (user.role === 'supervisor' || user.role === 'admin' || user.role === 'hr')
  })

  // Filter requests based on selected filters
  const filteredRequests = useMemo(() => {
    if (!teamLeaveRequests) return []

    return teamLeaveRequests.filter(request => {
      const statusMatch = statusFilter === 'all' || request.status === statusFilter
      const typeMatch = leaveTypeFilter === 'all' || request.leave_type === leaveTypeFilter
      return statusMatch && typeMatch
    })
  }, [teamLeaveRequests, statusFilter, leaveTypeFilter])

  // Generate calendar days with leave requests
  const calendarDays = useMemo(() => {
    if (!filteredRequests) return []

    const start = startOfMonth(selectedMonth)
    const end = endOfMonth(selectedMonth)
    const days = eachDayOfInterval({ start, end })

    return days.map(date => {
      const dayRequests = filteredRequests.filter(request => {
        const requestStart = new Date(request.start_date)
        const requestEnd = new Date(request.end_date)
        return isWithinInterval(date, { start: requestStart, end: requestEnd })
      })

      return {
        date,
        leaveRequests: dayRequests
      }
    })
  }, [filteredRequests, selectedMonth])

  // Get requests for selected date
  const selectedDateRequests = useMemo(() => {
    if (!selectedDate || !filteredRequests) return []

    return filteredRequests.filter(request => {
      const requestStart = new Date(request.start_date)
      const requestEnd = new Date(request.end_date)
      return isWithinInterval(selectedDate, { start: requestStart, end: requestEnd })
    })
  }, [selectedDate, filteredRequests])

  const renderCalendarDay = (date: Date) => {
    const dayData = calendarDays.find(day => isSameDay(day.date, date))
    const hasRequests = dayData && dayData.leaveRequests.length > 0

    return (
      <div className="relative h-full w-full p-1">
        <div className="text-sm">{format(date, 'd')}</div>
        {hasRequests && (
          <div className="absolute bottom-1 left-1 right-1">
            <div className="flex flex-wrap gap-1">
              {dayData.leaveRequests.slice(0, 3).map((request, index) => (
                <div
                  key={`${request.id}-${index}`}
                  className={`w-2 h-2 rounded-full ${getLeaveTypeColor(request.leave_type as LeaveType)}`}
                  title={`${request.user.first_name} - ${request.leave_type} - ${request.status}`}
                />
              ))}
              {dayData.leaveRequests.length > 3 && (
                <div className="w-2 h-2 rounded-full bg-gray-400 text-xs flex items-center justify-center">
                  +
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  if (user.role !== 'supervisor' && user.role !== 'admin' && user.role !== 'hr') {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>Team calendar is only available for supervisors and managers.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Calendar
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as RequestStatus | 'all')}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value={RequestStatus.PENDING}>Pending</SelectItem>
                  <SelectItem value={RequestStatus.APPROVED}>Approved</SelectItem>
                  <SelectItem value={RequestStatus.REJECTED}>Rejected</SelectItem>
                  <SelectItem value={RequestStatus.CANCELLED}>Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={leaveTypeFilter} onValueChange={(value) => setLeaveTypeFilter(value as LeaveType | 'all')}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value={LeaveType.VACATION}>Vacation</SelectItem>
                  <SelectItem value={LeaveType.SICK}>Sick</SelectItem>
                  <SelectItem value={LeaveType.PERSONAL}>Personal</SelectItem>
                  <SelectItem value={LeaveType.MATERNITY}>Maternity</SelectItem>
                  <SelectItem value={LeaveType.PATERNITY}>Paternity</SelectItem>
                  <SelectItem value={LeaveType.BEREAVEMENT}>Bereavement</SelectItem>
                  <SelectItem value={LeaveType.UNPAID}>Unpaid</SelectItem>
                  <SelectItem value={LeaveType.OTHER}>Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar */}
            <div className="lg:col-span-2">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                month={selectedMonth}
                onMonthChange={setSelectedMonth}
                className="rounded-md border"
                components={{
                  Day: ({ day }) => renderCalendarDay(day.date)
                }}
              />
            </div>

            {/* Selected Date Details */}
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg mb-3">
                  {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'Select a date'}
                </h3>

                {selectedDateRequests.length === 0 ? (
                  <p className="text-gray-500 text-sm">No team leave requests for this date</p>
                ) : (
                  <div className="space-y-3">
                    {selectedDateRequests.map((request) => (
                      <ViewLeaveRequestDialog
                        trigger={
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left p-3 h-auto"
                            onClick={() => setSelectedRequest(request)}
                          >
                            <div className="flex items-center gap-3 w-full">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src="" />
                                <AvatarFallback>
                                  {request.user.first_name.charAt(0)}{request.user.last_name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="font-medium">
                                  {request.user.first_name} {request.user.last_name}
                                </div>
                                <div className="text-sm text-gray-500 capitalize">
                                  {request.leave_type.replace('_', ' ')}
                                </div>
                                <div className="text-xs text-gray-400">
                                  {format(new Date(request.start_date), 'MMM d')} - {format(new Date(request.end_date), 'MMM d, yyyy')}
                                </div>
                              </div>
                              {getStatusIcon(request.status as RequestStatus)}
                            </div>
                          </Button>
                        }
                        request={request}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Legend */}
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Legend</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <span>Vacation</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span>Sick</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-purple-500" />
                    <span>Personal</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-pink-500" />
                    <span>Maternity</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-indigo-500" />
                    <span>Paternity</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-orange-500" />
                    <span>Unpaid</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 