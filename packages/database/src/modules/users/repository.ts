import { DatabaseClient } from '../shared/types';
import { DatabaseUtils } from '../shared/utils';
import { User, CreateUserData, UpdateUserData, UserFilters, UserStats } from './types';

export const USER_DOMAIN_COLUMNS =
  'id, email, first_name, last_name, avatar, department, team, role, manager_id, company_id, hire_date, is_active, created_at, updated_at';

export class UserRepository {
  constructor(private db: DatabaseClient) {}

  async findById(id: string): Promise<User> {
    try {
      const { data, error } = await this.db
        .from('users')
        .select(USER_DOMAIN_COLUMNS)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw DatabaseUtils.handleDatabaseError(error, 'findUserById');
    }
  }

  async findByEmail(email: string): Promise<User> {
    try {
      const { data, error } = await this.db
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw DatabaseUtils.handleDatabaseError(error, 'findUserByEmail');
    }
  }

  async findAll(filters?: UserFilters): Promise<User[]> {
    try {
      let query = this.db.from('users').select(USER_DOMAIN_COLUMNS);

      if (filters) {
        query = DatabaseUtils.applyFilters(query, filters);
      }

      const { data, error } = await query.order('first_name');
      if (error) throw error;
      return data || [];
    } catch (error) {
      throw DatabaseUtils.handleDatabaseError(error, 'findAllUsers');
    }
  }

  async create(userData: CreateUserData): Promise<User> {
    try {
      DatabaseUtils.validateRequiredFields(userData, [
        'email', 'first_name', 'last_name', 'department', 'team', 'role', 'hire_date'
      ]);

      const sanitizedData = DatabaseUtils.sanitizeData(userData);
      
      const { data, error } = await this.db
        .from('users')
        .insert(sanitizedData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw DatabaseUtils.handleDatabaseError(error, 'createUser');
    }
  }

  async update(id: string, updates: UpdateUserData): Promise<User> {
    try {
      const sanitizedUpdates = DatabaseUtils.sanitizeData(updates);
      
      const { data, error } = await this.db
        .from('users')
        .update(sanitizedUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw DatabaseUtils.handleDatabaseError(error, 'updateUser');
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const { error } = await this.db
        .from('users')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      throw DatabaseUtils.handleDatabaseError(error, 'deleteUser');
    }
  }

  async getTeamMembers(managerId: string): Promise<User[]> {
    try {
      const { data, error } = await this.db
        .from('users')
        .select(USER_DOMAIN_COLUMNS)
        .eq('manager_id', managerId)
        .eq('is_active', true)
        .order('first_name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      throw DatabaseUtils.handleDatabaseError(error, 'getTeamMembers');
    }
  }

  async getStats(): Promise<UserStats> {
    try {
      const { data: users, error } = await this.db
        .from('users')
        .select('department, role, is_active');

      if (error) throw error;

      const stats: UserStats = {
        total_users: users.length,
        active_users: users.filter((u: User) => u.is_active).length,
        users_by_department: {},
        users_by_role: {}
      };

      users.forEach((user: User) => {
        stats.users_by_department[user.department] = 
          (stats.users_by_department[user.department] || 0) + 1;
        stats.users_by_role[user.role] = 
          (stats.users_by_role[user.role] || 0) + 1;
      });

      return stats;
    } catch (error) {
      throw DatabaseUtils.handleDatabaseError(error, 'getUserStats');
    }
  }
}
