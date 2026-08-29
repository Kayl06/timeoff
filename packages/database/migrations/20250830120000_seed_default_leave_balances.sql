-- Migration: seed_default_leave_balances
-- Description: CREATE OR REPLACE onboarding RPCs to insert-only seed vacation/sick/personal
--              leave_balances from active leave_policies.default_allowance (BAL-02).
-- Date: 2026-08-30

-- Atomic create-company: insert company (null owner), insert admin owner, set owner_id,
-- then insert-only default balances. p_password is nullable.
CREATE OR REPLACE FUNCTION public.create_company_with_owner(
    p_email TEXT,
    p_password TEXT,
    p_first_name TEXT,
    p_last_name TEXT,
    p_company_name TEXT
)
RETURNS users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_company_id uuid;
    v_user users;
BEGIN
    INSERT INTO companies (name, owner_id)
    VALUES (p_company_name, NULL)
    RETURNING id INTO v_company_id;

    INSERT INTO users (
        email,
        password,
        first_name,
        last_name,
        company_id,
        role,
        department,
        team
    )
    VALUES (
        p_email,
        p_password,
        p_first_name,
        p_last_name,
        v_company_id,
        'admin',
        'Unassigned',
        'Unassigned'
    )
    RETURNING * INTO v_user;

    UPDATE companies
    SET owner_id = v_user.id
    WHERE id = v_company_id;

    INSERT INTO public.leave_balances (
        user_id, leave_type, total_allowance, used_days, remaining_days, carried_over, year
    )
    SELECT
        v_user.id,
        lp.leave_type,
        lp.default_allowance,
        0,
        lp.default_allowance,
        0,
        EXTRACT(YEAR FROM CURRENT_DATE)::integer
    FROM (
        SELECT DISTINCT ON (leave_type)
            leave_type,
            default_allowance
        FROM public.leave_policies
        WHERE leave_type IN ('vacation', 'sick', 'personal')
          AND is_active = true
        ORDER BY leave_type, name
    ) lp
    ON CONFLICT (user_id, leave_type, year) DO NOTHING;

    RETURN v_user;
END;
$$;

-- Atomic accept: insert employee then mark invite accepted. If the invite is no
-- longer pending, RAISE so the insert rolls back (no orphan users row).
-- p_password is nullable. Not STRICT so a null p_password is still dispatched.
CREATE OR REPLACE FUNCTION public.accept_invite_with_employee(
    p_invite_id uuid,
    p_email TEXT,
    p_password TEXT,
    p_first_name TEXT,
    p_last_name TEXT,
    p_company_id uuid
)
RETURNS users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user users;
BEGIN
    INSERT INTO users (
        email,
        password,
        first_name,
        last_name,
        company_id,
        role,
        department,
        team
    )
    VALUES (
        p_email,
        p_password,
        p_first_name,
        p_last_name,
        p_company_id,
        'employee',
        'Unassigned',
        'Unassigned'
    )
    RETURNING * INTO v_user;

    UPDATE company_invites
    SET status = 'accepted',
        accepted_at = now()
    WHERE id = p_invite_id
      AND status = 'pending';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'invite_not_pending';
    END IF;

    INSERT INTO public.leave_balances (
        user_id, leave_type, total_allowance, used_days, remaining_days, carried_over, year
    )
    SELECT
        v_user.id,
        lp.leave_type,
        lp.default_allowance,
        0,
        lp.default_allowance,
        0,
        EXTRACT(YEAR FROM CURRENT_DATE)::integer
    FROM (
        SELECT DISTINCT ON (leave_type)
            leave_type,
            default_allowance
        FROM public.leave_policies
        WHERE leave_type IN ('vacation', 'sick', 'personal')
          AND is_active = true
        ORDER BY leave_type, name
    ) lp
    ON CONFLICT (user_id, leave_type, year) DO NOTHING;

    RETURN v_user;
END;
$$;

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
