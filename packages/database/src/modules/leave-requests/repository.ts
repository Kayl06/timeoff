import { DatabaseClient } from '../shared/types';
import { DatabaseUtils } from '../shared/utils';
import { USER_DOMAIN_COLUMNS } from '../users/repository';
import { 
  LeaveRequest, 
  CreateLeaveRequestData, 
  UpdateLeaveRequestData, 
  LeaveRequestFilters,
  LeaveRequestWithUser,
  LeaveRequestStats
} from './types';

const LEAVE_REQUEST_USER_EMBED = `users!leave_requests_user_id_fkey(${USER_DOMAIN_COLUMNS})`;
const LEAVE_REQUEST_WITH_USER_SELECT = `*, ${LEAVE_REQUEST_USER_EMBED}`;

export class LeaveRequestRepository {
  constructor(private db: DatabaseClient) {}

  async findById(id: string): Promise<LeaveRequestWithUser> {
    try {
      const { data, error } = await this.db
        .from('leave_requests')
        .select(LEAVE_REQUEST_WITH_USER_SELECT)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw DatabaseUtils.handleDatabaseError(error, 'findLeaveRequestById');
    }
  }

  async findByUserId(userId: string): Promise<LeaveRequest[]> {
    try {
      const { data, error } = await this.db
        .from('leave_requests')
        .select('*')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      throw DatabaseUtils.handleDatabaseError(error, 'findLeaveRequestsByUserId');
    }
  }

  async findAll(filters?: LeaveRequestFilters): Promise<LeaveRequestWithUser[]> {
    try {
      let query = this.db
        .from('leave_requests')
        .select(LEAVE_REQUEST_WITH_USER_SELECT)
        .is('deleted_at', null);

      if (filters) {
        query = this.applyLeaveRequestFilters(query, filters);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (error) {
      throw DatabaseUtils.handleDatabaseError(error, 'findAllLeaveRequests');
    }
  }

  async findPendingRequests(managerId?: string): Promise<LeaveRequestWithUser[]> {
    try {
      let query = this.db
        .from('leave_requests')
        .select(LEAVE_REQUEST_WITH_USER_SELECT)
        .eq('status', 'pending');

      if (managerId) {
        query = query.eq('users.manager_id', managerId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (error) {
      throw DatabaseUtils.handleDatabaseError(error, 'findPendingLeaveRequests');
    }
  }

  async findTeamRequests(managerId: string): Promise<LeaveRequestWithUser[]> {
    try {
      const { data, error } = await this.db
        .from('leave_requests')
        .select(LEAVE_REQUEST_WITH_USER_SELECT)
        .eq('users.manager_id', managerId)
        .is('deleted_at', null)
        .eq('users.is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      throw DatabaseUtils.handleDatabaseError(error, 'findTeamLeaveRequests');
    }
  }

  async create(requestData: CreateLeaveRequestData): Promise<LeaveRequest> {
    try {
      DatabaseUtils.validateRequiredFields(requestData, [
        'user_id', 'leave_type', 'start_date', 'end_date', 'total_days'
      ]);

      const sanitizedData = DatabaseUtils.sanitizeData(requestData);
      
      const { data, error } = await this.db
        .from('leave_requests')
        .insert(sanitizedData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw DatabaseUtils.handleDatabaseError(error, 'createLeaveRequest');
    }
  }

  async update(id: string, updates: UpdateLeaveRequestData): Promise<LeaveRequest> {
    try {
      const sanitizedUpdates = DatabaseUtils.sanitizeData(updates);
      
      const { data, error } = await this.db
        .from('leave_requests')
        .update(sanitizedUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw DatabaseUtils.handleDatabaseError(error, 'updateLeaveRequest');
    }
  }

  async approve(id: string, approverId: string, comments?: string): Promise<LeaveRequest> {
    try {
      const updates = {
        status: 'approved',
        approver_id: approverId,
        approved_at: new Date().toISOString(),
        approval_comments: comments
      };

      const { data, error } = await this.db
        .from('leave_requests')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw DatabaseUtils.handleDatabaseError(error, 'approveLeaveRequest');
    }
  }

  async reject(id: string, approverId: string, reason: string): Promise<LeaveRequest> {
    try {
      const updates = {
        status: 'rejected',
        approver_id: approverId,
        rejected_at: new Date().toISOString(),
        rejection_reason: reason
      };

      const { data, error } = await this.db
        .from('leave_requests')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw DatabaseUtils.handleDatabaseError(error, 'rejectLeaveRequest');
    }
  }

  async cancel(id: string): Promise<LeaveRequest> {
    try {
      const { data, error } = await this.db
        .from('leave_requests')
        .update({ status: 'cancelled' })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw DatabaseUtils.handleDatabaseError(error, 'cancelLeaveRequest');
    }
  }

  async softDelete(id: string): Promise<LeaveRequest> {
    try {
      const { data, error } = await this.db
        .from('leave_requests')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw DatabaseUtils.handleDatabaseError(error, 'softDeleteLeaveRequest');
    }
  }

  async restore(id: string): Promise<LeaveRequest> {
    try {
      const { data, error } = await this.db
        .from('leave_requests')
        .update({ deleted_at: null })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw DatabaseUtils.handleDatabaseError(error, 'restoreLeaveRequest');
    }
  }

  async bulkUpdate(ids: string[], updates: UpdateLeaveRequestData): Promise<LeaveRequest[]> {
    try {
      const sanitizedUpdates = DatabaseUtils.sanitizeData(updates);
      
      const { data, error } = await this.db
        .from('leave_requests')
        .update(sanitizedUpdates)
        .in('id', ids)
        .select();

      if (error) throw error;
      return data || [];
    } catch (error) {
      throw DatabaseUtils.handleDatabaseError(error, 'bulkUpdateLeaveRequests');
    }
  }

  async getActiveRequests(userId: string): Promise<LeaveRequest[]> {
    try {
      const { data, error } = await this.db
        .from('active_leave_requests')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      throw DatabaseUtils.handleDatabaseError(error, 'getActiveLeaveRequests');
    }
  }

  async getMonthlyApprovedRequestsForManager(managerId: string, startDate: Date, endDate: Date): Promise<LeaveRequest[]> {
    try {
      const { data, error } = await this.db
        .from('leave_requests')
        .select(LEAVE_REQUEST_WITH_USER_SELECT)
        .eq('status', 'approved')
        .eq('users.manager_id', managerId)
        .gte('approved_at', startDate.toISOString())
        .lte('approved_at', endDate.toISOString())
        .is('deleted_at', null);

      if (error) throw error;
      return data || [];
    } catch (error) {
      throw DatabaseUtils.handleDatabaseError(error, 'getMonthlyApprovedRequestsForManager');
    }
  }

  async getStats(): Promise<LeaveRequestStats> {
    try {
      const { data: requests, error } = await this.db
        .from('leave_requests')
        .select('leave_type, status');

      if (error) throw error;

      const stats: LeaveRequestStats = {
        total_requests: requests.length,
        pending_requests: requests.filter((r: LeaveRequest) => r.status === 'pending').length,
        approved_requests: requests.filter((r: LeaveRequest) => r.status === 'approved').length,
        rejected_requests: requests.filter((r: LeaveRequest) => r.status === 'rejected').length,
        cancelled_requests: requests.filter((r: LeaveRequest) => r.status === 'cancelled').length,
        requests_by_type: {},
        requests_by_status: {}
      };

      requests.forEach((request: LeaveRequest) => {
        stats.requests_by_type[request.leave_type] = 
          (stats.requests_by_type[request.leave_type] || 0) + 1;
        stats.requests_by_status[request.status] = 
          (stats.requests_by_status[request.status] || 0) + 1;
      });

      return stats;
    } catch (error) {
      throw DatabaseUtils.handleDatabaseError(error, 'getLeaveRequestStats');
    }
  }

  private applyLeaveRequestFilters(query: any, filters: LeaveRequestFilters): any {
    if (filters.user_id) {
      query = query.eq('user_id', filters.user_id);
    }
    
    if (filters.leave_type) {
      query = query.eq('leave_type', filters.leave_type);
    }
    
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    
    if (filters.approver_id) {
      query = query.eq('approver_id', filters.approver_id);
    }
    
    if (filters.date_range) {
      query = query
        .gte('start_date', filters.date_range.start.toISOString())
        .lte('end_date', filters.date_range.end.toISOString());
    }
    
    if (filters.is_half_day !== undefined) {
      query = query.eq('is_half_day', filters.is_half_day);
    }
    
    return query;
  }
}
