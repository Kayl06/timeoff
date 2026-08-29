import { BaseEntity } from '../shared/types';

export interface User extends BaseEntity {
  email: string;
  first_name: string;
  last_name: string;
  avatar?: string;
  department: string;
  team: string;
  role: string;
  manager_id?: string;
  company_id: string;
  hire_date: Date;
  is_active: boolean;
}

export interface CreateUserData {
  email: string;
  first_name: string;
  last_name: string;
  avatar?: string;
  department: string;
  team: string;
  role: string;
  manager_id?: string;
  company_id: string;
  hire_date: Date;
  is_active?: boolean;
}

export interface UpdateUserData {
  email?: string;
  first_name?: string;
  last_name?: string;
  avatar?: string;
  department?: string;
  team?: string;
  role?: string;
  manager_id?: string;
  company_id?: string;
  hire_date?: Date;
  is_active?: boolean;
}

export interface UserFilters {
  department?: string;
  team?: string;
  role?: string;
  manager_id?: string;
  is_active?: boolean;
}

export interface UserStats {
  total_users: number;
  active_users: number;
  users_by_department: Record<string, number>;
  users_by_role: Record<string, number>;
}

export interface ManagerTeamStats {
  teamMembersCount: number;
  pendingRequestsCount: number;
  monthlyApprovedCount: number;
}
