-- Seed data for Timeoff Management System
-- This file will be executed after migrations during supabase db reset

-- Insert sample departments (skip if already exist)
-- Note: The initial schema already inserts some departments, so we'll use different names
INSERT INTO departments (id, name, description, is_active) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'Engineering Team', 'Software development and technical teams', true),
  ('550e8400-e29b-41d4-a716-446655440002', 'Marketing Team', 'Marketing and communications team', true),
  ('550e8400-e29b-41d4-a716-446655440003', 'HR Team', 'HR and people operations', true),
  ('550e8400-e29b-41d4-a716-446655440004', 'Sales Team', 'Sales and business development', true),
  ('550e8400-e29b-41d4-a716-446655440005', 'Finance Team', 'Finance and accounting team', true)
ON CONFLICT (name) DO NOTHING;

-- Insert sample teams (skip if already exist)
-- Use the department IDs from the seed data, not the initial schema
INSERT INTO teams (id, name, department_id, description, is_active) VALUES
  ('660e8400-e29b-41d4-a716-446655440001', 'Frontend Team', '550e8400-e29b-41d4-a716-446655440001', 'Frontend development team', true),
  ('660e8400-e29b-41d4-a716-446655440002', 'Backend Team', '550e8400-e29b-41d4-a716-446655440001', 'Backend development team', true),
  ('660e8400-e29b-41d4-a716-446655440003', 'DevOps Team', '550e8400-e29b-41d4-a716-446655440001', 'DevOps and infrastructure team', true),
  ('660e8400-e29b-41d4-a716-446655440004', 'Digital Marketing', '550e8400-e29b-41d4-a716-446655440002', 'Digital marketing team', true),
  ('660e8400-e29b-41d4-a716-446655440005', 'Content Marketing', '550e8400-e29b-41d4-a716-446655440002', 'Content creation team', true)
ON CONFLICT (name, department_id) DO NOTHING;

-- Demo company (owner_id set after users exist because of the circular FK)
INSERT INTO companies (id, name, owner_id) VALUES
  ('110e8400-e29b-41d4-a716-446655440001', 'Timeoff Demo', NULL)
ON CONFLICT (id) DO NOTHING;

-- Insert sample users (all bound to the demo company; owner is admin@company.com)
INSERT INTO users (id, email, first_name, last_name, department, team, role, hire_date, is_active, password, company_id) VALUES
  ('770e8400-e29b-41d4-a716-446655440001', 'john.doe@company.com', 'John', 'Doe', 'Engineering', 'Frontend Team', 'supervisor', '2023-01-15', true, '$2b$12$GgxecQts.8szrZtg.moNTOQ/EXnVGM.67rsX6eE5NNmoQPv3upbk6', '110e8400-e29b-41d4-a716-446655440001'),
  ('770e8400-e29b-41d4-a716-446655440002', 'jane.smith@company.com', 'Jane', 'Smith', 'Engineering', 'Backend Team', 'employee', '2023-03-20', true, '$2b$12$GgxecQts.8szrZtg.moNTOQ/EXnVGM.67rsX6eE5NNmoQPv3upbk6', '110e8400-e29b-41d4-a716-446655440001'),
  ('770e8400-e29b-41d4-a716-446655440003', 'mike.johnson@company.com', 'Mike', 'Johnson', 'Marketing', 'Digital Marketing', 'supervisor', '2023-02-10', true, '$2b$12$GgxecQts.8szrZtg.moNTOQ/EXnVGM.67rsX6eE5NNmoQPv3upbk6', '110e8400-e29b-41d4-a716-446655440001'),
  ('770e8400-e29b-41d4-a716-446655440004', 'sarah.wilson@company.com', 'Sarah', 'Wilson', 'Human Resources', 'Unassigned', 'hr', '2023-01-05', true, '$2b$12$GgxecQts.8szrZtg.moNTOQ/EXnVGM.67rsX6eE5NNmoQPv3upbk6', '110e8400-e29b-41d4-a716-446655440001'),
  ('770e8400-e29b-41d4-a716-446655440005', 'admin@company.com', 'Admin', 'User', 'Engineering', 'Unassigned', 'admin', '2023-01-01', true, '$2b$12$GgxecQts.8szrZtg.moNTOQ/EXnVGM.67rsX6eE5NNmoQPv3upbk6', '110e8400-e29b-41d4-a716-446655440001')
ON CONFLICT (email) DO NOTHING;

UPDATE companies
SET owner_id = '770e8400-e29b-41d4-a716-446655440005'
WHERE id = '110e8400-e29b-41d4-a716-446655440001';

-- Update manager relationships
UPDATE users SET manager_id = '770e8400-e29b-41d4-a716-446655440001' WHERE id = '770e8400-e29b-41d4-a716-446655440002';
UPDATE users SET manager_id = '770e8400-e29b-41d4-a716-446655440003' WHERE id = '770e8400-e29b-41d4-a716-446655440004';

-- Insert sample leave policies (these are already in the schema, so we'll skip duplicates)
-- The initial schema already inserts default policies

-- Insert sample leave balances for current year (skip if already exist)
INSERT INTO leave_balances (id, user_id, leave_type, total_allowance, used_days, remaining_days, carried_over, year) VALUES
  ('990e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440001', 'vacation', 20, 5, 15, 2, 2025),
  ('990e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440001', 'sick', 10, 2, 8, 0, 2025),
  ('990e8400-e29b-41d4-a716-446655440003', '770e8400-e29b-41d4-a716-446655440002', 'vacation', 20, 8, 12, 1, 2025),
  ('990e8400-e29b-41d4-a716-446655440004', '770e8400-e29b-41d4-a716-446655440002', 'sick', 10, 1, 9, 0, 2025),
  ('990e8400-e29b-41d4-a716-446655440005', '770e8400-e29b-41d4-a716-446655440003', 'vacation', 20, 12, 8, 0, 2025)
ON CONFLICT (user_id, leave_type, year) DO NOTHING;

-- Insert sample leave requests (skip if already exist)
INSERT INTO leave_requests (id, user_id, leave_type, start_date, end_date, total_days, reason, status, approver_id, approved_at, is_half_day, half_day_type) VALUES
  ('aa0e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440001', 'vacation', '2025-06-15', '2025-06-20', 5, 'Summer vacation with family', 'approved', '770e8400-e29b-41d4-a716-446655440005', '2025-05-20 10:30:00+00', false, NULL),
  ('aa0e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440002', 'sick', '2025-05-10', '2025-05-10', 1, 'Not feeling well', 'approved', '770e8400-e29b-41d4-a716-446655440001', '2025-05-09 14:15:00+00', false, NULL),
  ('aa0e8400-e29b-41d4-a716-446655440003', '770e8400-e29b-41d4-a716-446655440003', 'personal', '2025-07-05', '2025-07-05', 1, 'Doctor appointment', 'pending', NULL, NULL, true, 'morning'),
  ('aa0e8400-e29b-41d4-a716-446655440004', '770e8400-e29b-41d4-a716-446655440002', 'vacation', '2025-08-12', '2025-08-16', 4, 'Weekend getaway', 'draft', NULL, NULL, false, NULL),
  ('aa0e8400-e29b-41d4-a716-446655440005', '770e8400-e29b-41d4-a716-446655440001', 'personal', '2025-06-03', '2025-06-03', 1, 'Dentist appointment', 'approved', '770e8400-e29b-41d4-a716-446655440005', '2025-05-28 09:00:00+00', true, 'morning')
ON CONFLICT (id) DO NOTHING;

-- Insert sample notifications (skip if already exist)
INSERT INTO notifications (id, user_id, title, message, type, is_read, created_at) VALUES
  ('bb0e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440001', 'Leave Request Approved', 'Your vacation request for June 15-20 has been approved.', 'request_approved', false, '2025-05-20 10:30:00+00'),
  ('bb0e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440002', 'Leave Request Approved', 'Your sick leave request for May 10 has been approved.', 'request_approved', false, '2025-05-09 14:15:00+00'),
  ('bb0e8400-e29b-41d4-a716-446655440003', '770e8400-e29b-41d4-a716-446655440003', 'Leave Request Pending', 'Your personal leave request for July 5 is pending approval.', 'request_pending', false, '2025-06-01 11:00:00+00'),
  ('bb0e8400-e29b-41d4-a716-446655440004', '770e8400-e29b-41d4-a716-446655440001', 'New Leave Request', 'Jane Smith has submitted a leave request that requires your approval.', 'request_pending', false, '2025-06-01 11:00:00+00')
ON CONFLICT (id) DO NOTHING;

-- Insert sample calendar events (skip if already exist)
-- Note: calendar_events requires 'type' column and uses TIMESTAMP WITH TIME ZONE
INSERT INTO calendar_events (id, title, description, start_date, end_date, type, user_id, department_id, is_all_day, created_at) VALUES
  ('cc0e8400-e29b-41d4-a716-446655440001', 'Team Building Event', 'Annual team building event for Engineering department', '2025-07-15 09:00:00+00', '2025-07-15 17:00:00+00', 'company_event', '770e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', true, '2025-06-01 09:00:00+00'),
  ('cc0e8400-e29b-41d4-a716-446655440002', 'Marketing Workshop', 'Digital marketing workshop for Marketing team', '2025-06-25 09:00:00+00', '2025-06-25 17:00:00+00', 'company_event', '770e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440002', true, '2025-06-01 09:00:00+00'),
  ('cc0e8400-e29b-41d4-a716-446655440003', 'Company Holiday', 'Independence Day - Office Closed', '2025-07-04 00:00:00+00', '2025-07-04 23:59:59+00', 'holiday', NULL, NULL, true, '2025-06-01 09:00:00+00')
ON CONFLICT (id) DO NOTHING;

-- Insert sample audit logs (using correct column names, skip if already exist)
INSERT INTO audit_logs (id, user_id, action, resource_type, resource_id, details, ip_address, user_agent, created_at) VALUES
  ('dd0e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440001', 'CREATE', 'leave_requests', 'aa0e8400-e29b-41d4-a716-446655440001', '{"leave_type": "vacation", "start_date": "2025-06-15"}', '192.168.1.100', 'Mozilla/5.0', '2025-05-15 14:30:00+00'),
  ('dd0e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440005', 'UPDATE', 'leave_requests', 'aa0e8400-e29b-41d4-a716-446655440001', '{"status": "approved"}', '192.168.1.101', 'Mozilla/5.0', '2025-05-20 10:30:00+00'),
  ('dd0e8400-e29b-41d4-a716-446655440003', '770e8400-e29b-41d4-a716-446655440002', 'CREATE', 'leave_requests', 'aa0e8400-e29b-41d4-a716-446655440002', '{"leave_type": "sick", "start_date": "2025-05-10"}', '192.168.1.102', 'Mozilla/5.0', '2025-05-09 13:45:00+00')
ON CONFLICT (id) DO NOTHING; 