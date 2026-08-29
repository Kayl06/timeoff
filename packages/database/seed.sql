-- Seed data for Timeoff Management System
-- This file will be executed after migrations during supabase db reset

-- Insert sample departments
INSERT INTO departments (id, name, description, is_active) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'Engineering', 'Software development and technical teams', true),
  ('550e8400-e29b-41d4-a716-446655440002', 'Marketing', 'Marketing and communications team', true),
  ('550e8400-e29b-41d4-a716-446655440003', 'Human Resources', 'HR and people operations', true),
  ('550e8400-e29b-41d4-a716-446655440004', 'Sales', 'Sales and business development', true),
  ('550e8400-e29b-41d4-a716-446655440005', 'Finance', 'Finance and accounting team', true);

-- Insert sample teams
INSERT INTO teams (id, name, department_id, description, is_active) VALUES
  ('660e8400-e29b-41d4-a716-446655440001', 'Frontend Team', '550e8400-e29b-41d4-a716-446655440001', 'Frontend development team', true),
  ('660e8400-e29b-41d4-a716-446655440002', 'Backend Team', '550e8400-e29b-41d4-a716-446655440001', 'Backend development team', true),
  ('660e8400-e29b-41d4-a716-446655440003', 'DevOps Team', '550e8400-e29b-41d4-a716-446655440001', 'DevOps and infrastructure team', true),
  ('660e8400-e29b-41d4-a716-446655440004', 'Digital Marketing', '550e8400-e29b-41d4-a716-446655440002', 'Digital marketing team', true),
  ('660e8400-e29b-41d4-a716-446655440005', 'Content Marketing', '550e8400-e29b-41d4-a716-446655440002', 'Content creation team', true);

-- Demo company (owner_id set after users exist because of the circular FK)
INSERT INTO companies (id, name, owner_id) VALUES
  ('110e8400-e29b-41d4-a716-446655440001', 'Timeoff Demo', NULL);

-- Insert sample users (all bound to the demo company; owner is admin@company.com)
INSERT INTO users (id, email, first_name, last_name, department, team, role, hire_date, is_active, company_id) VALUES
  ('770e8400-e29b-41d4-a716-446655440001', 'john.doe@company.com', 'John', 'Doe', 'Engineering', 'Frontend Team', 'supervisor', '2023-01-15', true, '110e8400-e29b-41d4-a716-446655440001'),
  ('770e8400-e29b-41d4-a716-446655440002', 'jane.smith@company.com', 'Jane', 'Smith', 'Engineering', 'Backend Team', 'employee', '2023-03-20', true, '110e8400-e29b-41d4-a716-446655440001'),
  ('770e8400-e29b-41d4-a716-446655440003', 'mike.johnson@company.com', 'Mike', 'Johnson', 'Marketing', 'Digital Marketing', 'supervisor', '2023-02-10', true, '110e8400-e29b-41d4-a716-446655440001'),
  ('770e8400-e29b-41d4-a716-446655440004', 'sarah.wilson@company.com', 'Sarah', 'Wilson', 'Human Resources', 'Unassigned', 'hr', '2023-01-05', true, '110e8400-e29b-41d4-a716-446655440001'),
  ('770e8400-e29b-41d4-a716-446655440005', 'admin@company.com', 'Admin', 'User', 'Engineering', 'Unassigned', 'admin', '2023-01-01', true, '110e8400-e29b-41d4-a716-446655440001');

UPDATE companies
SET owner_id = '770e8400-e29b-41d4-a716-446655440005'
WHERE id = '110e8400-e29b-41d4-a716-446655440001';

-- Update manager relationships
UPDATE users SET manager_id = '770e8400-e29b-41d4-a716-446655440001' WHERE id = '770e8400-e29b-41d4-a716-446655440002';
UPDATE users SET manager_id = '770e8400-e29b-41d4-a716-446655440003' WHERE id = '770e8400-e29b-41d4-a716-446655440004';

-- Insert sample leave policies
INSERT INTO leave_policies (id, name, leave_type, default_allowance, max_carry_over, accrual_rate, accrual_frequency, approval_required, requires_documentation, is_active) VALUES
  ('880e8400-e29b-41d4-a716-446655440001', 'Annual Vacation', 'vacation', 20, 5, 1.67, 'monthly', true, false, true),
  ('880e8400-e29b-41d4-a716-446655440002', 'Sick Leave', 'sick', 10, 0, 0.83, 'monthly', false, true, true),
  ('880e8400-e29b-41d4-a716-446655440003', 'Personal Leave', 'personal', 5, 0, 0.42, 'monthly', true, false, true),
  ('880e8400-e29b-41d4-a716-446655440004', 'Maternity Leave', 'maternity', 12, 0, 0, 'yearly', false, true, true),
  ('880e8400-e29b-41d4-a716-446655440005', 'Paternity Leave', 'paternity', 2, 0, 0, 'yearly', false, true, true);

-- Insert sample leave balances for current year
INSERT INTO leave_balances (id, user_id, leave_type, total_allowance, used_days, remaining_days, carried_over, year) VALUES
  ('990e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440001', 'vacation', 20, 5, 15, 2, 2024),
  ('990e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440001', 'sick', 10, 2, 8, 0, 2024),
  ('990e8400-e29b-41d4-a716-446655440003', '770e8400-e29b-41d4-a716-446655440002', 'vacation', 20, 8, 12, 1, 2024),
  ('990e8400-e29b-41d4-a716-446655440004', '770e8400-e29b-41d4-a716-446655440002', 'sick', 10, 1, 9, 0, 2024),
  ('990e8400-e29b-41d4-a716-446655440005', '770e8400-e29b-41d4-a716-446655440003', 'vacation', 20, 12, 8, 0, 2024);

-- Insert sample leave requests
INSERT INTO leave_requests (id, user_id, leave_type, start_date, end_date, total_days, reason, status, approver_id, approved_at, is_half_day) VALUES
  ('aa0e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440001', 'vacation', '2024-06-15', '2024-06-20', 5, 'Summer vacation with family', 'approved', '770e8400-e29b-41d4-a716-446655440005', '2024-05-20 10:30:00+00', false),
  ('aa0e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440002', 'sick', '2024-05-10', '2024-05-10', 1, 'Not feeling well', 'approved', '770e8400-e29b-41d4-a716-446655440001', '2024-05-09 14:15:00+00', false),
  ('aa0e8400-e29b-41d4-a716-446655440003', '770e8400-e29b-41d4-a716-446655440003', 'personal', '2024-07-05', '2024-07-05', 1, 'Doctor appointment', 'pending', NULL, NULL, true),
  ('aa0e8400-e29b-41d4-a716-446655440004', '770e8400-e29b-41d4-a716-446655440002', 'vacation', '2024-08-12', '2024-08-16', 4, 'Weekend getaway', 'draft', NULL, NULL, false),
  ('aa0e8400-e29b-41d4-a716-446655440005', '770e8400-e29b-41d4-a716-446655440001', 'personal', '2024-06-03', '2024-06-03', 0.5, 'Dentist appointment', 'approved', '770e8400-e29b-41d4-a716-446655440005', '2024-05-28 09:00:00+00', true);

-- Insert sample notifications
INSERT INTO notifications (id, user_id, title, message, type, is_read, created_at) VALUES
  ('bb0e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440001', 'Leave Request Approved', 'Your vacation request for June 15-20 has been approved.', 'request_approved', false, '2024-05-20 10:30:00+00'),
  ('bb0e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440002', 'Leave Request Approved', 'Your sick leave request for May 10 has been approved.', 'request_approved', false, '2024-05-09 14:15:00+00'),
  ('bb0e8400-e29b-41d4-a716-446655440003', '770e8400-e29b-41d4-a716-446655440003', 'Leave Request Pending', 'Your personal leave request for July 5 is pending approval.', 'request_pending', false, '2024-06-01 11:00:00+00'),
  ('bb0e8400-e29b-41d4-a716-446655440004', '770e8400-e29b-41d4-a716-446655440001', 'New Leave Request', 'Jane Smith has submitted a leave request that requires your approval.', 'request_pending', false, '2024-06-01 11:00:00+00');

-- Insert sample calendar events
INSERT INTO calendar_events (id, title, description, start_date, end_date, user_id, department_id, is_all_day, created_at) VALUES
  ('cc0e8400-e29b-41d4-a716-446655440001', 'Team Building Event', 'Annual team building event for Engineering department', '2024-07-15', '2024-07-15', '770e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', true, '2024-06-01 09:00:00+00'),
  ('cc0e8400-e29b-41d4-a716-446655440002', 'Marketing Workshop', 'Digital marketing workshop for Marketing team', '2024-06-25', '2024-06-25', '770e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440002', true, '2024-06-01 09:00:00+00'),
  ('cc0e8400-e29b-41d4-a716-446655440003', 'Company Holiday', 'Independence Day - Office Closed', '2024-07-04', '2024-07-04', NULL, NULL, true, '2024-06-01 09:00:00+00');

-- Insert sample audit logs
INSERT INTO audit_logs (id, user_id, action, table_name, record_id, old_values, new_values, ip_address, user_agent, created_at) VALUES
  ('dd0e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440001', 'CREATE', 'leave_requests', 'aa0e8400-e29b-41d4-a716-446655440001', NULL, '{"leave_type": "vacation", "start_date": "2024-06-15"}', '192.168.1.100', 'Mozilla/5.0', '2024-05-15 14:30:00+00'),
  ('dd0e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440005', 'UPDATE', 'leave_requests', 'aa0e8400-e29b-41d4-a716-446655440001', '{"status": "pending"}', '{"status": "approved"}', '192.168.1.101', 'Mozilla/5.0', '2024-05-20 10:30:00+00'),
  ('dd0e8400-e29b-41d4-a716-446655440003', '770e8400-e29b-41d4-a716-446655440002', 'CREATE', 'leave_requests', 'aa0e8400-e29b-41d4-a716-446655440002', NULL, '{"leave_type": "sick", "start_date": "2024-05-10"}', '192.168.1.102', 'Mozilla/5.0', '2024-05-09 13:45:00+00'); 