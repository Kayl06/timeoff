-- Migration: tenant_rls_and_anon_revoke
-- Description: Tenant RLS via current_company_id(), drop unrestricted policies, REVOKE anon, SECURITY DEFINER onboarding RPCs, security_invoker view
-- Date: 2026-08-29

-- JWT company_id claim (minted by the BFF). Wrap call sites in (SELECT ...) for initPlan caching.
CREATE OR REPLACE FUNCTION public.current_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF((SELECT auth.jwt() ->> 'company_id'), '')::uuid;
$$;

GRANT EXECUTE ON FUNCTION public.current_company_id() TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Drop unrestricted / NextAuth-era policies by exact name
-- ---------------------------------------------------------------------------

-- leave_requests
DROP POLICY IF EXISTS "Users can create own requests" ON leave_requests;
DROP POLICY IF EXISTS "Users can view own requests" ON leave_requests;
DROP POLICY IF EXISTS "Users can update own requests" ON leave_requests;
DROP POLICY IF EXISTS "Approvers can view requests to approve" ON leave_requests;
DROP POLICY IF EXISTS "Users can delete requests" ON leave_requests;

-- notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Allow notification creation" ON notifications;

-- calendar_events
DROP POLICY IF EXISTS "Users can view relevant events" ON calendar_events;

-- users (never recreate a users self-subquery)
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Supervisors can view team profiles" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Allow public user creation" ON users;
DROP POLICY IF EXISTS "Admins can read all users" ON users;
DROP POLICY IF EXISTS "Admins can update all users" ON users;
DROP POLICY IF EXISTS "Public can read users" ON users;
DROP POLICY IF EXISTS "Users can read own profile" ON users;

-- companies
DROP POLICY IF EXISTS "Allow public company select" ON companies;
DROP POLICY IF EXISTS "Allow public company insert" ON companies;
DROP POLICY IF EXISTS "Allow public company update" ON companies;

-- company_invites
DROP POLICY IF EXISTS "Allow public company invite select" ON company_invites;
DROP POLICY IF EXISTS "Allow public company invite insert" ON company_invites;
DROP POLICY IF EXISTS "Allow public company invite update" ON company_invites;

-- audit_logs
DROP POLICY IF EXISTS "Allow audit log creation" ON audit_logs;
DROP POLICY IF EXISTS "Users can read own audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Admins can read all audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Admins can update audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Admins can delete audit logs" ON audit_logs;

-- catalog (A2: authenticated SELECT-all; drop public USING true)
DROP POLICY IF EXISTS "Public can read departments" ON departments;
DROP POLICY IF EXISTS "Public can read teams" ON teams;
DROP POLICY IF EXISTS "Public can read leave policies" ON leave_policies;

-- ---------------------------------------------------------------------------
-- Authenticated tenant policies
-- Child tables: EXISTS users.company_id = (SELECT current_company_id())
-- users/companies/company_invites: direct equality, no users self-subquery
-- ---------------------------------------------------------------------------

CREATE POLICY leave_requests_tenant_select ON public.leave_requests
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = leave_requests.user_id
        AND u.company_id = (SELECT public.current_company_id())
    )
  );

CREATE POLICY leave_requests_tenant_insert ON public.leave_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = leave_requests.user_id
        AND u.company_id = (SELECT public.current_company_id())
    )
    AND (SELECT auth.uid()) = user_id
  );

CREATE POLICY leave_requests_tenant_update ON public.leave_requests
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = leave_requests.user_id
        AND u.company_id = (SELECT public.current_company_id())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = leave_requests.user_id
        AND u.company_id = (SELECT public.current_company_id())
    )
  );

CREATE POLICY leave_requests_tenant_delete ON public.leave_requests
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = leave_requests.user_id
        AND u.company_id = (SELECT public.current_company_id())
    )
  );

CREATE POLICY notifications_tenant_all ON public.notifications
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = notifications.user_id
        AND u.company_id = (SELECT public.current_company_id())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = notifications.user_id
        AND u.company_id = (SELECT public.current_company_id())
    )
  );

CREATE POLICY audit_logs_tenant_all ON public.audit_logs
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = audit_logs.user_id
        AND u.company_id = (SELECT public.current_company_id())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = audit_logs.user_id
        AND u.company_id = (SELECT public.current_company_id())
    )
  );

CREATE POLICY leave_balances_tenant_all ON public.leave_balances
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = leave_balances.user_id
        AND u.company_id = (SELECT public.current_company_id())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = leave_balances.user_id
        AND u.company_id = (SELECT public.current_company_id())
    )
  );

CREATE POLICY calendar_events_tenant_all ON public.calendar_events
  FOR ALL TO authenticated
  USING (
    user_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = calendar_events.user_id
        AND u.company_id = (SELECT public.current_company_id())
    )
  )
  WITH CHECK (
    user_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = calendar_events.user_id
        AND u.company_id = (SELECT public.current_company_id())
    )
  );

CREATE POLICY users_tenant_select ON public.users
  FOR SELECT TO authenticated
  USING (company_id = (SELECT public.current_company_id()));

CREATE POLICY users_tenant_update ON public.users
  FOR UPDATE TO authenticated
  USING (company_id = (SELECT public.current_company_id()))
  WITH CHECK (company_id = (SELECT public.current_company_id()));

CREATE POLICY companies_tenant_select ON public.companies
  FOR SELECT TO authenticated
  USING (id = (SELECT public.current_company_id()));

CREATE POLICY company_invites_tenant_all ON public.company_invites
  FOR ALL TO authenticated
  USING (company_id = (SELECT public.current_company_id()))
  WITH CHECK (company_id = (SELECT public.current_company_id()));

-- Catalog tables: authenticated SELECT-all this phase (A2). Not tenant tables.
CREATE POLICY departments_authenticated_select ON public.departments
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY teams_authenticated_select ON public.teams
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY leave_policies_authenticated_select ON public.leave_policies
  FOR SELECT TO authenticated
  USING (true);

-- ---------------------------------------------------------------------------
-- Grants: anon cannot operate tenant tables; authenticated BFF can
-- ---------------------------------------------------------------------------

REVOKE ALL ON TABLE public.users FROM anon;
REVOKE ALL ON TABLE public.companies FROM anon;
REVOKE ALL ON TABLE public.company_invites FROM anon;
REVOKE ALL ON TABLE public.leave_requests FROM anon;
REVOKE ALL ON TABLE public.leave_balances FROM anon;
REVOKE ALL ON TABLE public.notifications FROM anon;
REVOKE ALL ON TABLE public.audit_logs FROM anon;
REVOKE ALL ON TABLE public.calendar_events FROM anon;

REVOKE INSERT, UPDATE, DELETE ON TABLE public.departments FROM anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.teams FROM anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.leave_policies FROM anon;

GRANT SELECT ON TABLE public.departments TO authenticated;
GRANT SELECT ON TABLE public.teams TO authenticated;
GRANT SELECT ON TABLE public.leave_policies TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.companies TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.company_invites TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.leave_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.leave_balances TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.audit_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.calendar_events TO authenticated;

-- Onboarding RPCs remain callable by anon; pin search_path against hijack.
ALTER FUNCTION public.create_company_with_owner(TEXT, TEXT, TEXT, TEXT, TEXT)
  SECURITY DEFINER
  SET search_path = public;

ALTER FUNCTION public.accept_invite_with_employee(uuid, TEXT, TEXT, TEXT, TEXT, uuid)
  SECURITY DEFINER
  SET search_path = public;

GRANT EXECUTE ON FUNCTION public.create_company_with_owner(TEXT, TEXT, TEXT, TEXT, TEXT)
  TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.accept_invite_with_employee(uuid, TEXT, TEXT, TEXT, TEXT, uuid)
  TO anon, authenticated, service_role;

-- Recreate so the view does not bypass leave_requests RLS.
CREATE OR REPLACE VIEW public.active_leave_requests
WITH (security_invoker = true) AS
SELECT * FROM public.leave_requests
WHERE deleted_at IS NULL;

REVOKE ALL ON TABLE public.active_leave_requests FROM anon;
GRANT SELECT ON TABLE public.active_leave_requests TO authenticated;
