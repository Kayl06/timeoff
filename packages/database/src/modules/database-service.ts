import { DatabaseClient } from './shared/types';
import { UserRepository, UserService } from './users';
import { LeaveRequestRepository, LeaveRequestService } from './leave-requests';
import { LeaveBalanceRepository, LeaveBalanceService } from './leave-balances';
import { DepartmentRepository, DepartmentService } from './departments';
import { TeamRepository, TeamService } from './teams';
import { NotificationRepository, NotificationService } from './notifications';
import { CalendarEventRepository, CalendarEventService } from './calendar-events';
import { LeavePolicyRepository, LeavePolicyService } from './leave-policies';
import { AuditLogRepository, AuditLogService } from './audit-logs';

export class DatabaseServiceFactory {
  private static instance: DatabaseServiceFactory;
  private services: Map<string, any> = new Map();

  private constructor(private db: DatabaseClient) {
    this.initializeServices();
  }

  static getInstance(db: DatabaseClient): DatabaseServiceFactory {
    if (!DatabaseServiceFactory.instance) {
      DatabaseServiceFactory.instance = new DatabaseServiceFactory(db);
    }
    return DatabaseServiceFactory.instance;
  }

  /** Always construct a new factory bound to this client. Use for per-request tenant BFF. */
  static create(db: DatabaseClient): DatabaseServiceFactory {
    return new DatabaseServiceFactory(db);
  }

  private initializeServices(): void {
    // Initialize repositories
    const userRepository = new UserRepository(this.db);
    const leaveRequestRepository = new LeaveRequestRepository(this.db);
    const leaveBalanceRepository = new LeaveBalanceRepository(this.db);
    const departmentRepository = new DepartmentRepository(this.db);
    const teamRepository = new TeamRepository(this.db);
    const notificationRepository = new NotificationRepository(this.db);
    const calendarEventRepository = new CalendarEventRepository(this.db);
    const leavePolicyRepository = new LeavePolicyRepository(this.db);
    const auditLogRepository = new AuditLogRepository(this.db);

    // Initialize services with dependencies
    const auditLogService = new AuditLogService(auditLogRepository);
    const notificationService = new NotificationService(notificationRepository);
    const leaveBalanceService = new LeaveBalanceService(leaveBalanceRepository);

    const userService = new UserService(userRepository, auditLogService, null as any); // Temporary null

    const leaveRequestService = new LeaveRequestService(
      leaveRequestRepository,
      auditLogService,
      notificationService,
      leaveBalanceService,
      userService
    );

    // Update userService with the correct leaveRequestService reference
    (userService as any).leaveRequestService = leaveRequestService;

    const departmentService = new DepartmentService(departmentRepository, auditLogService);
    const teamService = new TeamService(teamRepository, auditLogService);
    const calendarEventService = new CalendarEventService(calendarEventRepository, auditLogService);
    const leavePolicyService = new LeavePolicyService(leavePolicyRepository, auditLogService);

    // Store services
    this.services.set('user', userService);
    this.services.set('leaveRequest', leaveRequestService);
    this.services.set('leaveBalance', leaveBalanceService);
    this.services.set('department', departmentService);
    this.services.set('team', teamService);
    this.services.set('notification', notificationService);
    this.services.set('calendarEvent', calendarEventService);
    this.services.set('leavePolicy', leavePolicyService);
    this.services.set('auditLog', auditLogService);
  }

  getUserService(): UserService {
    return this.services.get('user');
  }

  getLeaveRequestService(): LeaveRequestService {
    return this.services.get('leaveRequest');
  }

  getLeaveBalanceService(): LeaveBalanceService {
    return this.services.get('leaveBalance');
  }

  getDepartmentService(): DepartmentService {
    return this.services.get('department');
  }

  getTeamService(): TeamService {
    return this.services.get('team');
  }

  getNotificationService(): NotificationService {
    return this.services.get('notification');
  }

  getCalendarEventService(): CalendarEventService {
    return this.services.get('calendarEvent');
  }

  getLeavePolicyService(): LeavePolicyService {
    return this.services.get('leavePolicy');
  }

  getAuditLogService(): AuditLogService {
    return this.services.get('auditLog');
  }

  // Convenience method to get all services
  getAllServices() {
    return {
      user: this.getUserService(),
      leaveRequest: this.getLeaveRequestService(),
      leaveBalance: this.getLeaveBalanceService(),
      department: this.getDepartmentService(),
      team: this.getTeamService(),
      notification: this.getNotificationService(),
      calendarEvent: this.getCalendarEventService(),
      leavePolicy: this.getLeavePolicyService(),
      auditLog: this.getAuditLogService(),
    };
  }
}
