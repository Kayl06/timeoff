'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'

interface UseLeaveRequestOperationsProps {
  userId: string
  onSuccess?: () => void
}

async function patchLeaveRequest(id: string, body: Record<string, unknown>) {
  const response = await fetch(`/api/leave-requests/${id}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload.error || 'Failed to update leave request')
  }
  return payload
}

async function postLeaveRequestBulk(ids: string[], action: 'approve' | 'reject') {
  const response = await fetch('/api/leave-requests/bulk', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids, action }),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload.error || 'Failed to update leave requests')
  }
  return payload
}

export function useLeaveRequestOperations({ userId, onSuccess }: UseLeaveRequestOperationsProps): {
  deleteLeaveRequest: ReturnType<typeof useMutation>['mutateAsync']
  cancelLeaveRequest: ReturnType<typeof useMutation>['mutateAsync']
  approveLeaveRequest: ReturnType<typeof useMutation>['mutateAsync']
  rejectLeaveRequest: ReturnType<typeof useMutation>['mutateAsync']
  bulkApprove: ReturnType<typeof useMutation>['mutateAsync']
  bulkReject: ReturnType<typeof useMutation>['mutateAsync']
  isDeletingLeaveRequest: boolean
  isCancellingLeaveRequest: boolean
  isApprovingLeaveRequest: boolean
  isRejectingLeaveRequest: boolean
  isBulkApproving: boolean
  isBulkRejecting: boolean
  rowSelection: Record<string, boolean>
  setRowSelection: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
} {
  const queryClient = useQueryClient()
  const [rowSelection, setRowSelection] = useState({})

  // Delete leave request
  const { mutateAsync: deleteLeaveRequest, isPending: isDeletingLeaveRequest } = useMutation({
    mutationFn: (id: string) => patchLeaveRequest(id, { action: 'delete' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recentRequests', userId] })
      queryClient.invalidateQueries({ queryKey: ['leaveBalance', userId] })
      queryClient.invalidateQueries({ queryKey: ['notifications', userId] })
      queryClient.invalidateQueries({ queryKey: ['teamLeaveRequests'] })
      queryClient.invalidateQueries({ queryKey: ['allLeaveRequests'] })
      queryClient.invalidateQueries({ queryKey: ['personalLeaveRequests', userId] })
      
      onSuccess?.()
    },
    onError: (error) => {
      toast.error('Failed to delete leave request')
    }
  })

  // Cancel leave request
  const { mutateAsync: cancelLeaveRequest, isPending: isCancellingLeaveRequest } = useMutation({
    mutationFn: (id: string) => patchLeaveRequest(id, { action: 'cancel' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recentRequests', userId] })
      queryClient.invalidateQueries({ queryKey: ['personalLeaveRequests', userId] })
      onSuccess?.()
    },
    onError: (error) => {
      toast.error('Failed to cancel leave request')
    }
  })

  // Approve leave request
  const { mutateAsync: approveLeaveRequest, isPending: isApprovingLeaveRequest } = useMutation({
    mutationFn: ({ id, comments }: { id: string, comments?: string }) =>
      patchLeaveRequest(id, { action: 'approve', comments }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recentRequests', userId] })
      queryClient.invalidateQueries({ queryKey: ['teamLeaveRequests'] })
      queryClient.invalidateQueries({ queryKey: ['allLeaveRequests'] })
      queryClient.invalidateQueries({ queryKey: ['personalLeaveRequests', userId] })
      toast.success('Leave request approved successfully')
      onSuccess?.()
    },
    onError: (error) => {
      toast.error('Failed to approve leave request')
    }
  })

  // Reject leave request
  const { mutateAsync: rejectLeaveRequest, isPending: isRejectingLeaveRequest } = useMutation({
    mutationFn: ({ id, reason }: { id: string, reason: string }) =>
      patchLeaveRequest(id, { action: 'reject', reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recentRequests', userId] })
      queryClient.invalidateQueries({ queryKey: ['teamLeaveRequests'] })
      queryClient.invalidateQueries({ queryKey: ['allLeaveRequests'] })
      queryClient.invalidateQueries({ queryKey: ['personalLeaveRequests', userId] })
      toast.success('Leave request rejected')
      onSuccess?.()
    },
    onError: (error) => {
      toast.error('Failed to reject leave request')
    }
  })

  // Bulk approve
  const { mutateAsync: bulkApprove, isPending: isBulkApproving } = useMutation({
    mutationFn: (ids: string[]) => postLeaveRequestBulk(ids, 'approve'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recentRequests', userId] })
      queryClient.invalidateQueries({ queryKey: ['teamLeaveRequests'] })
      queryClient.invalidateQueries({ queryKey: ['allLeaveRequests'] })
      queryClient.invalidateQueries({ queryKey: ['personalLeaveRequests', userId] })
      toast.success('Selected requests approved successfully')
      setRowSelection({})
      onSuccess?.()
    },
    onError: (error) => {
      toast.error('Failed to approve selected requests')
    }
  })

  // Bulk reject
  const { mutateAsync: bulkReject, isPending: isBulkRejecting } = useMutation({
    mutationFn: (ids: string[]) => postLeaveRequestBulk(ids, 'reject'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recentRequests', userId] })
      queryClient.invalidateQueries({ queryKey: ['teamLeaveRequests'] })
      queryClient.invalidateQueries({ queryKey: ['allLeaveRequests'] })
      queryClient.invalidateQueries({ queryKey: ['personalLeaveRequests', userId] })
      toast.success('Selected requests rejected')
      setRowSelection({})
      onSuccess?.()
    },
    onError: (error) => {
      toast.error('Failed to reject selected requests')
    }
  })

  return {
    // Individual operations
    deleteLeaveRequest: deleteLeaveRequest as ReturnType<typeof useMutation>['mutateAsync'] ,
    cancelLeaveRequest: cancelLeaveRequest as ReturnType<typeof useMutation>['mutateAsync'],
    approveLeaveRequest: approveLeaveRequest as ReturnType<typeof useMutation>['mutateAsync'],
    rejectLeaveRequest: rejectLeaveRequest as ReturnType<typeof useMutation>['mutateAsync'],
    
    // Bulk operations
    bulkApprove: bulkApprove as ReturnType<typeof useMutation>['mutateAsync'],
    bulkReject: bulkReject as ReturnType<typeof useMutation>['mutateAsync'],
    
    // Loading states
    isDeletingLeaveRequest,
    isCancellingLeaveRequest,
    isApprovingLeaveRequest,
    isRejectingLeaveRequest,
    isBulkApproving,
    isBulkRejecting,
    
    // Row selection state
    rowSelection,
    setRowSelection
  }
}
