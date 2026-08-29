import { createClient } from '@supabase/supabase-js';

// Export the new modular structure
export * from './modules';

// Import the new modular services
import { DatabaseServiceFactory } from './modules/database-service';

// Temporary types until workspace dependencies are properly configured
interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  avatar?: string;
  department: string;
  team: string;
  role: string;
  manager_id?: string;
  hire_date: Date;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

interface LeaveRequest {
  id: string;
  user_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason?: string;
  status: string;
  attachments?: string[];
  approver_id?: string;
  approved_at?: Date;
  rejected_at?: Date;
  rejection_reason?: string;
  approval_comments?: string;
  created_at: Date;
  updated_at: Date;
}

interface LeaveBalance {
  id: string;
  user_id: string;
  leave_type: string;
  total_allowance: number;
  used_days: number;
  remaining_days: number;
  carried_over: number;
  year: number;
  updated_at: Date;
}

interface Department {
  id: string;
  name: string;
  description?: string;
  manager_id?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

interface Team {
  id: string;
  name: string;
  department_id: string;
  description?: string;
  lead_id?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  related_id?: string;
  created_at: Date;
}

interface CalendarEvent {
  id: string;
  title: string;
  start_date: Date;
  end_date: Date;
  type: string;
  user_id?: string;
  department_id?: string;
  is_all_day: boolean;
  description?: string;
  color?: string;
}

interface LeavePolicy {
  id: string;
  name: string;
  leave_type: string;
  default_allowance: number;
  max_carry_over: number;
  accrual_rate: number;
  accrual_frequency: string;
  approval_required: boolean;
  requires_documentation: boolean;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  details: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: Date;
}

// Database schema types
export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Omit<User, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<User, 'id' | 'created_at' | 'updated_at'>>;
      };
      leave_requests: {
        Row: LeaveRequest;
        Insert: Omit<LeaveRequest, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<LeaveRequest, 'id' | 'created_at' | 'updated_at'>>;
      };
      leave_balances: {
        Row: LeaveBalance;
        Insert: Omit<LeaveBalance, 'id' | 'updated_at'>;
        Update: Partial<Omit<LeaveBalance, 'id' | 'updated_at'>>;
      };
      departments: {
        Row: Department;
        Insert: Omit<Department, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Department, 'id' | 'created_at' | 'updated_at'>>;
      };
      teams: {
        Row: Team;
        Insert: Omit<Team, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Team, 'id' | 'created_at' | 'updated_at'>>;
      };
      notifications: {
        Row: Notification;
        Insert: Omit<Notification, 'id' | 'created_at'>;
        Update: Partial<Omit<Notification, 'id' | 'created_at'>>;
      };
      calendar_events: {
        Row: CalendarEvent;
        Insert: Omit<CalendarEvent, 'id'>;
        Update: Partial<Omit<CalendarEvent, 'id'>>;
      };
      leave_policies: {
        Row: LeavePolicy;
        Insert: Omit<LeavePolicy, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<LeavePolicy, 'id' | 'created_at' | 'updated_at'>>;
      };
      audit_logs: {
        Row: AuditLog;
        Insert: Omit<AuditLog, 'id' | 'created_at'>;
        Update: Partial<Omit<AuditLog, 'id' | 'created_at'>>;
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

// Lazy Supabase client creation with environment validation
let _supabase: ReturnType<typeof createClient<Database>> | null = null;

function getSupabaseClient(): ReturnType<typeof createClient<Database>> {
  if (!_supabase) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl) {
      throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable. Please check your .env file.');
    }

    if (!supabaseAnonKey) {
      throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable. Please check your .env file.');
    }

    _supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      },
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    });
  }
  
  return _supabase;
}

// Export lazy-initialized client
export const supabase = new Proxy({} as ReturnType<typeof createClient<Database>>, {
  get(target, prop) {
    // This creates a proxy object that lazily initializes the Supabase client
    // When any property is accessed on supabase, it:
    // 1. Gets the actual client instance via getSupabaseClient()
    // 2. Retrieves the requested property from the real client
    // 3. If the property is a function, binds it to the client to preserve context
    // 4. Returns the value or bound function
    const client = getSupabaseClient();
    const value = (client as any)[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  }
});

// Database service interface for dependency injection (legacy interface)
export interface IDatabaseService {
  // User management
  getUserById(id: string): Promise<User>
  getUserByEmail(email: string): Promise<User>
  updateUser(id: string, updates: Partial<User>): Promise<User>
  
  // Leave request management
  createLeaveRequest(request: Omit<LeaveRequest, 'id' | 'created_at' | 'updated_at'>): Promise<LeaveRequest>
  getLeaveRequestById(id: string): Promise<any>
  getLeaveRequestsByUser(userId: string): Promise<LeaveRequest[]>
  getAllLeaveRequests(): Promise<LeaveRequest[]>
  getTeamLeaveRequests(managerId: string, managerDepartment: string): Promise<LeaveRequest[]>
  getPendingLeaveRequests(managerId?: string): Promise<LeaveRequest[]>
  updateLeaveRequest(id: string, updates: Partial<LeaveRequest>): Promise<LeaveRequest>
  approveLeaveRequest(id: string, approverId: string, comments?: string): Promise<LeaveRequest>
  rejectLeaveRequest(id: string, approverId: string, reason: string): Promise<LeaveRequest>
  deleteLeaveRequest(id: string): Promise<LeaveRequest>
  softDeleteLeaveRequest(id: string): Promise<LeaveRequest>
  restoreLeaveRequest(id: string): Promise<LeaveRequest>
  getActiveLeaveRequests(userId: string): Promise<LeaveRequest[]>
  cancelLeaveRequest(id: string): Promise<LeaveRequest>
  bulkUpdateLeaveRequests(ids: string[], updates: Partial<LeaveRequest>): Promise<LeaveRequest[]>
  
  // Leave balance management
  getLeaveBalance(userId: string, year: number): Promise<LeaveBalance[]>
  updateLeaveBalance(balance: Omit<LeaveBalance, 'id' | 'updated_at'>): Promise<LeaveBalance>
  
  // Leave policy management
  getLeavePolicies(): Promise<LeavePolicy[]>
  
  // Department and team management
  getDepartments(): Promise<Department[]>
  getTeamsByDepartment(departmentId: string): Promise<Team[]>
  getTeamMembers(managerId: string): Promise<User[]>
  getManagerTeamStats(managerId: string): Promise<any>
  getAllUsers(): Promise<User[]>
  
  // Notification management
  createNotification(notification: Omit<Notification, 'id' | 'created_at'>): Promise<Notification>
  getNotificationsByUser(userId: string, limit?: number): Promise<Notification[]>
  markNotificationAsRead(id: string): Promise<Notification>
  
  // Calendar events
  getCalendarEvents(startDate: Date, endDate: Date, userId?: string, departmentId?: string): Promise<CalendarEvent[]>
  
  // Audit logging
  createAuditLog(log: Omit<AuditLog, 'id' | 'created_at'>): Promise<AuditLog>
  
  // Real-time subscriptions
  subscribeToLeaveRequests(userId: string, callback: (payload: any) => void): any
  subscribeToNotifications(userId: string, callback: (payload: any) => void): any
  subscribeToApprovals(approverId: string, callback: (payload: any) => void): any
}

// Legacy Database service implementation for backward compatibility
export class DatabaseService implements IDatabaseService {
  private serviceFactory: DatabaseServiceFactory;

  constructor(private supabaseClient: typeof supabase) {
    this.serviceFactory = DatabaseServiceFactory.create(supabaseClient);
  }

  // User management
  async getUserById(id: string): Promise<User> {
    return this.serviceFactory.getUserService().getUserById(id);
  }

  async getUserByEmail(email: string): Promise<User> {
    return this.serviceFactory.getUserService().getUserByEmail(email);
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    return this.serviceFactory.getUserService().updateUser(id, updates);
  }

  async getAllUsers(): Promise<User[]> {
    return this.serviceFactory.getUserService().getAllUsers();
  }

  async getTeamMembers(managerId: string): Promise<User[]> {
    return this.serviceFactory.getUserService().getTeamMembers(managerId);
  }

  // Leave request management
  async createLeaveRequest(request: Omit<LeaveRequest, 'id' | 'created_at' | 'updated_at'>): Promise<LeaveRequest> {
    return this.serviceFactory.getLeaveRequestService().createLeaveRequest(request);
  }

  async getLeaveRequestById(id: string) {
    return this.serviceFactory.getLeaveRequestService().getLeaveRequestById(id);
  }

  async getLeaveRequestsByUser(userId: string) {
    return this.serviceFactory.getLeaveRequestService().getLeaveRequestsByUser(userId);
  }

  async getAllLeaveRequests() {
    return this.serviceFactory.getLeaveRequestService().getAllLeaveRequests();
  }

  async getTeamLeaveRequests(managerId: string, managerDepartment: string) {
    return this.serviceFactory.getLeaveRequestService().getTeamLeaveRequests(managerId);
  }

  async getPendingLeaveRequests(managerId?: string) {
    return this.serviceFactory.getLeaveRequestService().getPendingLeaveRequests(managerId);
  }

  async updateLeaveRequest(id: string, updates: Partial<LeaveRequest>) {
    return this.serviceFactory.getLeaveRequestService().updateLeaveRequest(id, updates);
  }

  async approveLeaveRequest(id: string, approverId: string, comments?: string) {
    return this.serviceFactory.getLeaveRequestService().approveLeaveRequest(id, approverId, {
      approver_id: approverId,
      comments
    });
  }

  async rejectLeaveRequest(id: string, approverId: string, reason: string) {
    return this.serviceFactory.getLeaveRequestService().rejectLeaveRequest(id, approverId, {
      approver_id: approverId,
      rejection_reason: reason
    });
  }

  async deleteLeaveRequest(id: string) {
    return this.serviceFactory.getLeaveRequestService().softDeleteLeaveRequest(id);
  }

  async softDeleteLeaveRequest(id: string) {
    return this.serviceFactory.getLeaveRequestService().softDeleteLeaveRequest(id);
  }

  async restoreLeaveRequest(id: string) {
    return this.serviceFactory.getLeaveRequestService().restoreLeaveRequest(id);
  }

  async getActiveLeaveRequests(userId: string) {
    return this.serviceFactory.getLeaveRequestService().getActiveLeaveRequests(userId);
  }

  async cancelLeaveRequest(id: string) {
    return this.serviceFactory.getLeaveRequestService().cancelLeaveRequest(id);
  }

  async bulkUpdateLeaveRequests(ids: string[], updates: Partial<LeaveRequest>) {
    return this.serviceFactory.getLeaveRequestService().bulkUpdateLeaveRequests(ids, updates);
  }

  // Leave balance management
  async getLeaveBalance(userId: string, year: number) {
    return this.serviceFactory.getLeaveBalanceService().getLeaveBalance(userId, year);
  }

  async updateLeaveBalance(balance: Omit<LeaveBalance, 'id' | 'updated_at'>) {
    return this.serviceFactory.getLeaveBalanceService().createLeaveBalance(balance);
  }

  // Leave policy management
  async getLeavePolicies() {
    return this.serviceFactory.getLeavePolicyService().getActivePolicies();
  }

  // Department and team management
  async getDepartments() {
    return this.serviceFactory.getDepartmentService().getAllDepartments({ is_active: true });
  }

  async getTeamsByDepartment(departmentId: string) {
    return this.serviceFactory.getTeamService().getTeamsByDepartment(departmentId);
  }

  async getManagerTeamStats(managerId: string) {
    return this.serviceFactory.getUserService().getManagerTeamStats(managerId);
  }

  // Notification management
  async createNotification(notification: Omit<Notification, 'id' | 'created_at'>) {
    return this.serviceFactory.getNotificationService().createNotification(notification);
  }

  async getNotificationsByUser(userId: string) {
    return this.serviceFactory.getNotificationService().getNotificationsByUser(userId);
  }

  async markNotificationAsRead(id: string) {
    return this.serviceFactory.getNotificationService().markNotificationAsRead(id);
  }

  // Calendar events
  async getCalendarEvents(startDate: Date, endDate: Date, userId?: string, departmentId?: string) {
    return this.serviceFactory.getCalendarEventService().getCalendarEventsByDateRange(startDate, endDate, userId, departmentId);
  }

  // Audit logging
  async createAuditLog(log: Omit<AuditLog, 'id' | 'created_at'>) {
    return this.serviceFactory.getAuditLogService().createAuditLog(log);
  }

  // Real-time subscriptions (legacy implementation)
  subscribeToLeaveRequests(userId: string, callback: (payload: any) => void) {
    return this.supabaseClient
      .channel(`leave_requests_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leave_requests',
          filter: `user_id=eq.${userId}`
        },
        callback
      )
      .subscribe();
  }

  subscribeToNotifications(userId: string, callback: (payload: any) => void) {
    return this.supabaseClient
      .channel(`notifications_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        callback
      )
      .subscribe();
  }

  subscribeToApprovals(approverId: string, callback: (payload: any) => void) {
    return this.supabaseClient
      .channel(`approvals_${approverId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leave_requests',
          filter: `approver_id=eq.${approverId}`
        },
        callback
      )
      .subscribe();
  }
}

// Service factory and default instance
export const createDatabaseService = (supabaseClient: typeof supabase): IDatabaseService => {
  return new DatabaseService(supabaseClient)
}

// Default service instance for backward compatibility
export const databaseService = createDatabaseService(supabase)

// Export default instance for backward compatibility
export default databaseService; 