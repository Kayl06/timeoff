import { DatabaseClient } from '../shared/types';
import { DatabaseUtils } from '../shared/utils';
import { LeaveBalance, CreateLeaveBalanceData, UpdateLeaveBalanceData, LeaveBalanceFilters } from './types';

export class LeaveBalanceRepository {
  constructor(private db: DatabaseClient) {}

  async findByUserId(userId: string, year: number): Promise<LeaveBalance[]> {
    try {
      const { data, error } = await this.db
        .from('leave_balances')
        .select('*')
        .eq('user_id', userId)
        .eq('year', year);

      if (error) throw error;
      return data || [];
    } catch (error) {
      throw DatabaseUtils.handleDatabaseError(error, 'findLeaveBalanceByUserId');
    }
  }

  async findAll(filters?: LeaveBalanceFilters): Promise<LeaveBalance[]> {
    try {
      let query = this.db.from('leave_balances').select('*');

      if (filters) {
        query = DatabaseUtils.applyFilters(query, filters);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error) {
      throw DatabaseUtils.handleDatabaseError(error, 'findAllLeaveBalances');
    }
  }

  async create(balanceData: CreateLeaveBalanceData): Promise<LeaveBalance> {
    try {
      DatabaseUtils.validateRequiredFields(balanceData, [
        'user_id', 'leave_type', 'total_allowance', 'year'
      ]);

      const sanitizedData = DatabaseUtils.sanitizeData(balanceData);

      const { data, error } = await this.db
        .from('leave_balances')
        .insert(sanitizedData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw DatabaseUtils.handleDatabaseError(error, 'createLeaveBalance');
    }
  }

  async upsert(balanceData: CreateLeaveBalanceData): Promise<LeaveBalance> {
    try {
      DatabaseUtils.validateRequiredFields(balanceData, [
        'user_id', 'leave_type', 'total_allowance', 'year'
      ]);

      const sanitizedData = DatabaseUtils.sanitizeData(balanceData);
      
      const { data, error } = await this.db
        .from('leave_balances')
        .upsert(sanitizedData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw DatabaseUtils.handleDatabaseError(error, 'upsertLeaveBalance');
    }
  }

  async update(id: string, updates: UpdateLeaveBalanceData): Promise<LeaveBalance> {
    try {
      const sanitizedUpdates = DatabaseUtils.sanitizeData(updates);
      
      const { data, error } = await this.db
        .from('leave_balances')
        .update(sanitizedUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw DatabaseUtils.handleDatabaseError(error, 'updateLeaveBalance');
    }
  }
}
