// User and Authentication Types
export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  avatar?: string;
  department: string;
  team: string;
  role: UserRole;
  manager_id?: string;
  company_id: string;
  hire_date: Date;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export enum UserRole {
  EMPLOYEE = 'employee',
  SUPERVISOR = 'supervisor',
  ADMIN = 'admin',
  HR = 'hr'
}

export interface UserProfile extends User {
  leave_balance: LeaveBalance;
  pending_requests: number;
  approved_requests: number;
  rejected_requests: number;
}

// Leave Management Types
export interface LeaveRequest {
  id: string;
  user_id: string;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  total_days: number;
  reason?: string;
  status: RequestStatus;
  attachments?: string[];
  approver_id?: string;
  approved_at?: Date;
  rejected_at?: Date;
  rejection_reason?: string;
  approval_comments?: string;
  created_at: Date;
  updated_at: Date;
}

export enum LeaveType {
  VACATION = 'vacation',
  SICK = 'sick',
  PERSONAL = 'personal',
  MATERNITY = 'maternity',
  PATERNITY = 'paternity',
  BEREAVEMENT = 'bereavement',
  UNPAID = 'unpaid',
  OTHER = 'other'
}

export enum RequestStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled'
}

export interface LeaveBalance {
  id: string;
  user_id: string;
  leave_type: LeaveType;
  total_allowance: number;
  used_days: number;
  remaining_days: number;
  carried_over: number;
  year: number;
  updated_at: Date;
}

// Department and Team Types
export interface Department {
  id: string;
  name: string;
  description?: string;
  manager_id?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Team {
  id: string;
  name: string;
  department_id: string;
  description?: string;
  lead_id?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

// Policy and Configuration Types
export interface LeavePolicy {
  id: string;
  name: string;
  leave_type: LeaveType;
  default_allowance: number;
  max_carry_over: number;
  accrual_rate: number;
  accrual_frequency: AccrualFrequency;
  approval_required: boolean;
  requires_documentation: boolean;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export enum AccrualFrequency {
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly'
}

// Calendar and Schedule Types
export interface CalendarEvent {
  id: string;
  title: string;
  start_date: Date;
  end_date: Date;
  type: CalendarEventType;
  user_id?: string;
  department_id?: string;
  is_all_day: boolean;
  description?: string;
  color?: string;
}

export enum CalendarEventType {
  LEAVE = 'leave',
  HOLIDAY = 'holiday',
  COMPANY_EVENT = 'company_event',
  MEETING = 'meeting'
}

// Notification Types
export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  is_read: boolean;
  related_id?: string;
  created_at: Date;
}

export enum NotificationType {
  REQUEST_APPROVED = 'request_approved',
  REQUEST_REJECTED = 'request_rejected',
  REQUEST_PENDING = 'request_pending',
  LEAVE_BALANCE_UPDATE = 'leave_balance_update',
  POLICY_CHANGE = 'policy_change',
  SYSTEM_ANNOUNCEMENT = 'system_announcement'
}

// Dashboard and Analytics Types
export interface DashboardStats {
  total_requests: number;
  pending_requests: number;
  approved_requests: number;
  rejected_requests: number;
  leave_balance: LeaveBalance[];
  upcoming_leaves: LeaveRequest[];
  team_availability: TeamAvailability[];
}

export interface TeamAvailability {
  user_id: string;
  user_name: string;
  is_available: boolean;
  leave_dates?: Date[];
  current_status: 'available' | 'on_leave' | 'partial';
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

// Form and Validation Types
export interface LeaveRequestForm {
  leave_type: LeaveType;
  start_date: Date;
  end_date: Date;
  reason?: string;
  attachments?: File[];
}

export interface ApprovalForm {
  request_id: string;
  approved: boolean;
  comment?: string;
}

// Filter and Search Types
export interface LeaveRequestFilter {
  status?: RequestStatus[];
  leave_type?: LeaveType[];
  date_range?: {
    start: Date;
    end: Date;
  };
  user_id?: string;
  department_id?: string;
}

export interface UserFilter {
  department_id?: string;
  team_id?: string;
  role?: UserRole[];
  is_active?: boolean;
}

// Audit and Logging Types
export interface AuditLog {
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

// Real-time Types
export interface RealtimeUpdate {
  type: 'leave_request' | 'approval' | 'notification' | 'balance_update';
  data: any;
  timestamp: Date;
}

// Export and Report Types
export interface ReportConfig {
  type: 'leave_summary' | 'team_availability' | 'approval_workflow' | 'compliance';
  date_range: {
    start: Date;
    end: Date;
  };
  filters?: Record<string, any>;
  format: 'pdf' | 'csv' | 'excel';
}

// Settings and Configuration Types
export interface AppSettings {
  company_name: string;
  timezone: string;
  working_days: number[];
  working_hours: {
    start: string;
    end: string;
  };
  allow_overtime: boolean;
  max_consecutive_days: number;
  require_approval_for_same_day: boolean;
  allow_negative_balance: boolean;
}

// Error Types
export interface AppError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: Date;
}

// Session and Auth Types
export interface Session {
  user: User;
  expires: Date;
  access_token: string;
  refresh_token: string;
}

export interface AuthState {
  is_authenticated: boolean;
  user?: User;
  loading: boolean;
  error?: string;
} 