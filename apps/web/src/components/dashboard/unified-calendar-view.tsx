'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CalendarIcon, Users, Clock, CheckCircle, XCircle, AlertCircle, User, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { LeaveRequest, LeaveType, RequestStatus, User as UserType } from '@timeoff/types'

async function fetchCalendarLeaveRequests(scope: 'own' | 'team' | 'all'): Promise<LeaveRequest[]> {
  const response = await fetch(`/api/calendar/leave-requests?scope=${scope}`, {
    credentials: 'include',
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload.error || 'Failed to load calendar leave requests')
  }
  return payload as LeaveRequest[]
}
import { format, isSameDay, isWithinInterval, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, startOfWeek, endOfWeek, isSameMonth, isToday } from 'date-fns'
import { CalendarLegend } from '../shared/calendar/calendar-legend'
import { CalendarGrid } from '../shared/calendar/calendar-grid'
import { Skeleton } from '../ui/skeleton'

interface UnifiedCalendarViewProps {
  user: UserType
  className?: string,
  filterOn?: boolean,
  isCalendarOnly?: boolean,
  showLegend?: boolean,
  legendType?: 'horizontal' | 'vertical',
  legendPosition?: 'top' | 'bottom' | 'left' | 'right',
  previewOnDayClick?: boolean,
  eventVariant?: 'default' | 'compact' | 'compact-with-legend' | 'circle'
  calendarVariant?: 'default' | 'compact',
  cardView?: boolean
}

interface CalendarDay {
  date: Date
  personalRequests: LeaveRequest[]
  teamRequests: (LeaveRequest & { user: UserType })[]
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



export function UnifiedCalendarView({ user, className, filterOn = true, isCalendarOnly = false, showLegend = true, legendType = 'vertical', legendPosition = 'right', previewOnDayClick = true, eventVariant = 'default', calendarVariant = 'default', cardView = true }: UnifiedCalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date())
  const [statusFilter, setStatusFilter] = useState<RequestStatus | 'all'>('all')
  const [leaveTypeFilter, setLeaveTypeFilter] = useState<LeaveType | 'all'>('all')
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null)
  const [activeTab, setActiveTab] = useState<'personal' | 'team'>('personal')

  const isManager = user.role === 'supervisor' || user.role === 'admin' || user.role === 'hr'

  // Fetch user's leave requests
  const { data: personalRequests, isLoading: personalLoading } = useQuery({
    queryKey: ['personalLeaveRequests', user.id],
    queryFn: () => fetchCalendarLeaveRequests('own'),
    enabled: !!user?.id
  })

  // Fetch team members (for supervisors/managers)

  // Fetch team leave requests (for supervisors/managers)
  const { data: teamRequests, isLoading: teamRequestsLoading } = useQuery({
    queryKey: ['teamLeaveRequests', user.id],
    queryFn: () => {
      if (user.role === 'admin' || user.role === 'hr') {
        return fetchCalendarLeaveRequests('all')
      }
      return fetchCalendarLeaveRequests('team')
    },
    enabled: isManager && !!user?.id
  })


  // Filter requests based on selected filters
  const filteredPersonalRequests = useMemo(() => {
    if (!personalRequests) return []

    return personalRequests.filter(request => {
      const statusMatch = statusFilter === 'all' || request.status === statusFilter
      const typeMatch = leaveTypeFilter === 'all' || request.leave_type === leaveTypeFilter

      if (request.status === RequestStatus.CANCELLED || request.status === RequestStatus.REJECTED) {
        return false
      }

      return statusMatch && typeMatch
    })
  }, [personalRequests, statusFilter, leaveTypeFilter])



  const filteredTeamRequests = useMemo(() => {
    if (!teamRequests) return []

    return teamRequests.filter(request => {
      const statusMatch = statusFilter === 'all' || request.status === statusFilter
      const typeMatch = leaveTypeFilter === 'all' || request.leave_type === leaveTypeFilter
      return statusMatch && typeMatch
    })
  }, [teamRequests, statusFilter, leaveTypeFilter])

  // Generate calendar weeks
  const calendarWeeks = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth))
    const end = endOfWeek(endOfMonth(currentMonth))
    const days = eachDayOfInterval({ start, end })

    const weeks = []
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7))
    }

    return weeks.map(week =>
      week.map(date => {
        const personalDayRequests = filteredPersonalRequests.filter(request => {
          const requestStart = new Date(request.start_date)
          const requestEnd = new Date(request.end_date)
          return isSameDay(date, requestStart) || isWithinInterval(date, { start: requestStart, end: requestEnd })
        })

        let teamDayRequests = filteredTeamRequests.filter(request => {
          const requestStart = new Date(request.start_date)
          const requestEnd = new Date(request.end_date)
          return isSameDay(date, requestStart) || isWithinInterval(date, { start: requestStart, end: requestEnd })
        })

        // if manager, remove personal requests in teamdayrequests
        if (isManager) {
          teamDayRequests = teamDayRequests.filter(request => request.user_id !== user.id)
        }

        return {
          date,
          personalRequests: personalDayRequests,
          teamRequests: teamDayRequests
        }
      })
    )
  }, [filteredPersonalRequests, filteredTeamRequests, currentMonth])

  // Get requests for selected date
  const selectedDatePersonalRequests = useMemo(() => {
    if (!selectedDate || !filteredPersonalRequests) return []

    return filteredPersonalRequests.filter(request => {
      const requestStart = new Date(request.start_date)
      const requestEnd = new Date(request.end_date)

      return isSameDay(selectedDate, requestStart) || isWithinInterval(selectedDate, { start: requestStart, end: requestEnd })
    })

  }, [selectedDate, filteredPersonalRequests])


  const selectedDateTeamRequests = useMemo(() => {
    if (!selectedDate || !filteredTeamRequests) return []

    let teamRequests = filteredTeamRequests.filter(request => {
      const requestStart = new Date(request.start_date)
      const requestEnd = new Date(request.end_date)

      return isSameDay(selectedDate, requestStart) || isWithinInterval(selectedDate, { start: requestStart, end: requestEnd })
    })

    // if manager, remove personal requests in teamdayrequests
    if (isManager) {
      teamRequests = teamRequests.filter(request => request.user_id !== user.id)
    }

    return teamRequests
  }, [selectedDate, filteredTeamRequests, isManager, user])

  const canViewTeamCalendar = user.role === 'supervisor' || user.role === 'admin' || user.role === 'hr'

  if (personalLoading || teamRequestsLoading) {
    return <div className='flex flex-col gap-2'>
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex items-center flex-col gap-2 w-full">
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>

  }

  return (
    <div className={className}>
      <Card className={`${!cardView ? 'border-none shadow-none p-0' : ''}`}>
        <CardHeader className={`${!cardView ? 'p-1' : ''}`}>
          <div className="flex items-center justify-between">
            {
              cardView && (
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  Leave Calendar
                </CardTitle>
              )
            }
            {
              filterOn && (
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
              )
            }
          </div>
        </CardHeader>
        <CardContent className={`${!cardView ? 'p-1 border-none' : ''}`}>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Calendar */}
            <div className={`${isCalendarOnly ? 'lg:col-span-4' : 'lg:col-span-3'}`}>
              <div className="mb-4 flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-lg font-semibold">
                  {format(currentMonth, 'MMMM yyyy')}
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Calendar Grid */}
              <CalendarGrid
                calendarWeeks={calendarWeeks as any}
                currentMonth={currentMonth}
                selectedDate={selectedDate}
                onDateSelect={setSelectedDate}
                onRequestSelect={setSelectedRequest}
                calendarVariant={calendarVariant}
                eventVariant={eventVariant}
              />
            </div>

            {
              !isCalendarOnly && (
                <div className="space-y-4">
                  {/* Selected Date Details */}
                  {
                    previewOnDayClick && (
                      <div className="">
                        <h3 className="font-semibold text-lg mb-3">
                          {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'Select a date'}
                        </h3>

                        {canViewTeamCalendar ? (
                          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'personal' | 'team')}>
                            <TabsList className="grid w-full grid-cols-2">
                              <TabsTrigger value="personal" className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                Personal
                              </TabsTrigger>
                              <TabsTrigger value="team" className="flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                Team
                              </TabsTrigger>
                            </TabsList>

                            <TabsContent value="personal" className="mt-4">
                              {selectedDatePersonalRequests.length === 0 ? (
                                <p className="text-gray-500 text-sm">No personal leave requests for this date</p>
                              ) : (
                                <div className="space-y-3">
                                  {selectedDatePersonalRequests.map((request) => (
                                    <Dialog key={request.id}>
                                      <DialogTrigger asChild>
                                        <Button
                                          variant="outline"
                                          className="w-full justify-start text-left p-3 h-auto"
                                          onClick={() => setSelectedRequest(request as any)}
                                        >
                                          <div className="flex items-center gap-2 w-full">
                                            <div className={`w-3 h-3 rounded-full ${getLeaveTypeColor(request.leave_type as LeaveType)}`} />
                                            <div className="flex-1">
                                              <div className="font-medium capitalize">
                                                {request.leave_type.replace('_', ' ')}
                                              </div>
                                              <div className="text-sm text-gray-500">
                                                {format(new Date(request.start_date), 'MMM d')} - {format(new Date(request.end_date), 'MMM d, yyyy')}
                                              </div>
                                            </div>
                                            {getStatusIcon(request.status as RequestStatus)}
                                          </div>
                                        </Button>
                                      </DialogTrigger>
                                      <DialogContent className="max-w-md">
                                        <DialogHeader>
                                          <DialogTitle className="flex items-center gap-2">
                                            <div className={`w-3 h-3 rounded-full ${getLeaveTypeColor(request.leave_type as LeaveType)}`} />
                                            Leave Request Details
                                          </DialogTitle>
                                        </DialogHeader>
                                        <div className="space-y-4">
                                          <div>
                                            <h4 className="font-medium capitalize mb-2">
                                              {request.leave_type.replace('_', ' ')}
                                            </h4>
                                            <div className="space-y-2 text-sm">
                                              <div className="flex justify-between">
                                                <span className="text-gray-600">Start Date:</span>
                                                <span>{format(new Date(request.start_date), 'MMM d, yyyy')}</span>
                                              </div>
                                              <div className="flex justify-between">
                                                <span className="text-gray-600">End Date:</span>
                                                <span>{format(new Date(request.end_date), 'MMM d, yyyy')}</span>
                                              </div>
                                              <div className="flex justify-between">
                                                <span className="text-gray-600">Total Days:</span>
                                                <span>{request.total_days}</span>
                                              </div>
                                              <div className="flex justify-between">
                                                <span className="text-gray-600">Status:</span>
                                                <Badge className={getStatusColor(request.status as RequestStatus)}>
                                                  {request.status}
                                                </Badge>
                                              </div>
                                              {request.reason && (
                                                <div>
                                                  <span className="text-gray-600 block mb-1">Reason:</span>
                                                  <p className="text-sm bg-gray-50 p-2 rounded">{request.reason}</p>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      </DialogContent>
                                    </Dialog>
                                  ))}
                                </div>
                              )}
                            </TabsContent>

                            <TabsContent value="team" className="mt-4">
                              {selectedDateTeamRequests.length === 0 ? (
                                <p className="text-gray-500 text-sm">No team leave requests for this date</p>
                              ) : (
                                <div className="space-y-3">
                                  {selectedDateTeamRequests.map((request) => (
                                    <Dialog key={request.id}>
                                      <DialogTrigger asChild>
                                        <Button
                                          variant="outline"
                                          className="w-full justify-start text-left p-3 h-auto"
                                          onClick={() => setSelectedRequest(request as any)}
                                        >
                                          <div className="flex items-center gap-3 w-full">
                                            <Avatar className="h-8 w-8">
                                              <AvatarImage src="" />
                                              <AvatarFallback>
                                                {(request as any)?.users?.first_name?.charAt(0)}{(request as any)?.users?.last_name?.charAt(0)}
                                              </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1">
                                              <div className="font-medium">
                                                {(request as any)?.users?.first_name} {(request as any)?.users?.last_name}
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
                                      </DialogTrigger>
                                      <DialogContent className="max-w-md">
                                        <DialogHeader>
                                          <DialogTitle className="flex items-center gap-2">
                                            <Avatar className="h-6 w-6">
                                              <AvatarImage src="" />
                                              <AvatarFallback>
                                                {(request as any)?.users?.first_name?.charAt(0)}{(request as any)?.users?.last_name?.charAt(0)}
                                              </AvatarFallback>
                                            </Avatar>
                                            Leave Request Details
                                          </DialogTitle>
                                        </DialogHeader>
                                        <div className="space-y-4">
                                          <div>
                                            <h4 className="font-medium mb-2">
                                              {(request as any)?.users?.first_name} {(request as any)?.users?.last_name}
                                            </h4>
                                            <div className="space-y-2 text-sm">
                                              <div className="flex justify-between">
                                                <span className="text-gray-600">Leave Type:</span>
                                                <span className="capitalize">{request.leave_type.replace('_', ' ')}</span>
                                              </div>
                                              <div className="flex justify-between">
                                                <span className="text-gray-600">Start Date:</span>
                                                <span>{format(new Date(request.start_date), 'MMM d, yyyy')}</span>
                                              </div>
                                              <div className="flex justify-between">
                                                <span className="text-gray-600">End Date:</span>
                                                <span>{format(new Date(request.end_date), 'MMM d, yyyy')}</span>
                                              </div>
                                              <div className="flex justify-between">
                                                <span className="text-gray-600">Total Days:</span>
                                                <span>{request.total_days}</span>
                                              </div>
                                              <div className="flex justify-between">
                                                <span className="text-gray-600">Status:</span>
                                                <Badge className={getStatusColor(request.status as RequestStatus)}>
                                                  {request.status}
                                                </Badge>
                                              </div>
                                              {request.reason && (
                                                <div>
                                                  <span className="text-gray-600 block mb-1">Reason:</span>
                                                  <p className="text-sm bg-gray-50 p-2 rounded">{request.reason}</p>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      </DialogContent>
                                    </Dialog>
                                  ))}
                                </div>
                              )}
                            </TabsContent>
                          </Tabs>
                        ) : (
                          // For regular employees, show only personal requests
                          <>
                            {selectedDatePersonalRequests.length === 0 ? (
                              <p className="text-gray-500 text-sm">No leave requests for this date</p>
                            ) : (
                              <div className="space-y-3">
                                {selectedDatePersonalRequests.map((request) => (
                                  <Dialog key={request.id}>
                                    <DialogTrigger asChild>
                                      <Button
                                        variant="outline"
                                        className="w-full justify-start text-left p-3 h-auto"
                                        onClick={() => setSelectedRequest(request as any)}
                                      >
                                        <div className="flex items-center gap-2 w-full">
                                          <div className={`w-3 h-3 rounded-full ${getLeaveTypeColor(request.leave_type as LeaveType)}`} />
                                          <div className="flex-1">
                                            <div className="font-medium capitalize">
                                              {request.leave_type.replace('_', ' ')}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                              {format(new Date(request.start_date), 'MMM d')} - {format(new Date(request.end_date), 'MMM d, yyyy')}
                                            </div>
                                          </div>
                                          {getStatusIcon(request.status as RequestStatus)}
                                        </div>
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-md">
                                      <DialogHeader>
                                        <DialogTitle className="flex items-center gap-2">
                                          <div className={`w-3 h-3 rounded-full ${getLeaveTypeColor(request.leave_type as LeaveType)}`} />
                                          Leave Request Details
                                        </DialogTitle>
                                      </DialogHeader>
                                      <div className="space-y-4">
                                        <div>
                                          <h4 className="font-medium capitalize mb-2">
                                            {request.leave_type.replace('_', ' ')}
                                          </h4>
                                          <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                              <span className="text-gray-600">Start Date:</span>
                                              <span>{format(new Date(request.start_date), 'MMM d, yyyy')}</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-gray-600">End Date:</span>
                                              <span>{format(new Date(request.end_date), 'MMM d, yyyy')}</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-gray-600">Total Days:</span>
                                              <span>{request.total_days}</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-gray-600">Status:</span>
                                              <Badge className={getStatusColor(request.status as RequestStatus)}>
                                                {request.status}
                                              </Badge>
                                            </div>
                                            {request.reason && (
                                              <div>
                                                <span className="text-gray-600 block mb-1">Reason:</span>
                                                <p className="text-sm bg-gray-50 p-2 rounded">{request.reason}</p>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </DialogContent>
                                  </Dialog>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )
                  }

                  {/* Legend */}
                  {
                    showLegend && (
                      <CalendarLegend legendType={legendType} canViewTeamCalendar={canViewTeamCalendar} />
                    )
                  }
                </div>
              )
            }


          </div>
        </CardContent>
      </Card>
    </div>
  )
} 