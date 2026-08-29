-- Migration: accept_invite_with_employee
-- Description: Atomic insert of employee user + mark company invite accepted
-- Date: 2026-08-29

-- Atomic accept: insert employee then mark invite accepted. If the invite is no
-- longer pending, RAISE so the insert rolls back (no orphan users row).
-- p_password is nullable: credentials pass a bcrypt hash; Google (01-09) passes SQL NULL.
-- Not STRICT so a null p_password is still dispatched.
CREATE OR REPLACE FUNCTION accept_invite_with_employee(
    p_invite_id uuid,
    p_email TEXT,
    p_password TEXT,
    p_first_name TEXT,
    p_last_name TEXT,
    p_company_id uuid
)
RETURNS users
LANGUAGE plpgsql
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

    RETURN v_user;
END;
$$;

GRANT EXECUTE ON FUNCTION accept_invite_with_employee(uuid, TEXT, TEXT, TEXT, TEXT, uuid) TO anon, authenticated, service_role;
