-- pgTAP: anon deny + company A JWT cannot SELECT/INSERT/UPDATE/DELETE company B rows.
-- JWT claims via set_config request.jwt.claims; role authenticated.

BEGIN;

SELECT plan(22);

CREATE FUNCTION pg_temp.fails_or_zero(p_sql text)
RETURNS boolean
LANGUAGE plpgsql AS $$
DECLARE
  n bigint;
BEGIN
  EXECUTE p_sql INTO n;
  RETURN COALESCE(n, 0) = 0;
EXCEPTION
  WHEN insufficient_privilege THEN
    RETURN true;
  WHEN OTHERS THEN
    RETURN true;
END;
$$;

CREATE FUNCTION pg_temp.set_company_jwt(p_sub uuid, p_company_id uuid)
RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object(
      'role', 'authenticated',
      'sub', p_sub,
      'company_id', p_company_id
    )::text,
    true
  );
  PERFORM set_config('request.jwt.claim.sub', p_sub::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
END;
$$;

-- Two companies; user JWT for A must not reach B rows.
INSERT INTO companies (id, name, owner_id)
VALUES
  ('a0000000-0000-4000-8000-00000000000a', 'pgTAP Company A', NULL),
  ('b0000000-0000-4000-8000-00000000000b', 'pgTAP Company B', NULL);

INSERT INTO users (
  id, email, first_name, last_name, department, team, role, company_id
) VALUES
  (
    'a0000000-0000-4000-8000-0000000000aa',
    'rls-tenant-a@pgtap.example',
    'Alice',
    'A',
    'Unassigned',
    'Unassigned',
    'admin',
    'a0000000-0000-4000-8000-00000000000a'
  ),
  (
    'b0000000-0000-4000-8000-0000000000bb',
    'rls-tenant-b@pgtap.example',
    'Bob',
    'B',
    'Unassigned',
    'Unassigned',
    'admin',
    'b0000000-0000-4000-8000-00000000000b'
  );

UPDATE companies
SET owner_id = 'a0000000-0000-4000-8000-0000000000aa'
WHERE id = 'a0000000-0000-4000-8000-00000000000a';

UPDATE companies
SET owner_id = 'b0000000-0000-4000-8000-0000000000bb'
WHERE id = 'b0000000-0000-4000-8000-00000000000b';

INSERT INTO leave_requests (
  id, user_id, leave_type, start_date, end_date, total_days, reason, status
) VALUES
  (
    'a0000000-0000-4000-8000-0000000000a1',
    'a0000000-0000-4000-8000-0000000000aa',
    'vacation',
    '2026-09-01',
    '2026-09-02',
    2,
    'company A leave',
    'pending'
  ),
  (
    'b0000000-0000-4000-8000-0000000000b1',
    'b0000000-0000-4000-8000-0000000000bb',
    'vacation',
    '2026-09-10',
    '2026-09-11',
    2,
    'company B leave',
    'pending'
  );

INSERT INTO leave_balances (
  user_id, leave_type, total_allowance, used_days, remaining_days, carried_over, year
) VALUES
  ('a0000000-0000-4000-8000-0000000000aa', 'vacation', 20, 0, 20, 0, 2026),
  ('b0000000-0000-4000-8000-0000000000bb', 'vacation', 20, 0, 20, 0, 2026);

INSERT INTO notifications (id, user_id, title, message, type) VALUES
  (
    'a0000000-0000-4000-8000-0000000000a2',
    'a0000000-0000-4000-8000-0000000000aa',
    'A notice',
    'for A',
    'request_pending'
  ),
  (
    'b0000000-0000-4000-8000-0000000000b2',
    'b0000000-0000-4000-8000-0000000000bb',
    'B notice',
    'for B',
    'request_pending'
  );

INSERT INTO audit_logs (id, user_id, action, resource_type, resource_id, details) VALUES
  (
    'a0000000-0000-4000-8000-0000000000a3',
    'a0000000-0000-4000-8000-0000000000aa',
    'create',
    'leave_requests',
    'a0000000-0000-4000-8000-0000000000a1',
    '{}'::jsonb
  ),
  (
    'b0000000-0000-4000-8000-0000000000b3',
    'b0000000-0000-4000-8000-0000000000bb',
    'create',
    'leave_requests',
    'b0000000-0000-4000-8000-0000000000b1',
    '{}'::jsonb
  );

INSERT INTO calendar_events (id, title, start_date, end_date, type, user_id) VALUES
  (
    'b0000000-0000-4000-8000-0000000000b4',
    'B personal leave',
    '2026-09-10 00:00:00+00',
    '2026-09-11 00:00:00+00',
    'leave',
    'b0000000-0000-4000-8000-0000000000bb'
  ),
  (
    'c0000000-0000-4000-8000-0000000000c4',
    'Shared holiday',
    '2026-12-25 00:00:00+00',
    '2026-12-25 00:00:00+00',
    'holiday',
    NULL
  );

INSERT INTO company_invites (
  id, company_id, email, token_hash, expires_at, status
) VALUES
  (
    'b0000000-0000-4000-8000-0000000000b5',
    'b0000000-0000-4000-8000-00000000000b',
    'invitee-b@pgtap.example',
    repeat('bb', 32),
    now() + interval '7 days',
    'pending'
  );

-- AUTHZ-03: anon SELECT/INSERT on leave_requests, users, notifications
SET ROLE anon;

SELECT ok(
  pg_temp.fails_or_zero('SELECT count(*) FROM leave_requests'),
  'anon SELECT leave_requests fails or returns zero rows'
);

SELECT throws_ok(
  $$INSERT INTO leave_requests (user_id, leave_type, start_date, end_date, total_days, reason, status)
    VALUES (
      'a0000000-0000-4000-8000-0000000000aa',
      'vacation',
      '2026-10-01',
      '2026-10-02',
      2,
      'anon insert',
      'pending'
    )$$,
  '42501',
  'anon INSERT leave_requests is denied'
);

SELECT ok(
  pg_temp.fails_or_zero('SELECT count(*) FROM users'),
  'anon SELECT users fails or returns zero rows'
);

SELECT throws_ok(
  $$INSERT INTO users (email, first_name, last_name, department, team, company_id)
    VALUES (
      'anon-insert@pgtap.example',
      'Anon',
      'User',
      'Unassigned',
      'Unassigned',
      'a0000000-0000-4000-8000-00000000000a'
    )$$,
  '42501',
  'anon INSERT users is denied'
);

SELECT ok(
  pg_temp.fails_or_zero('SELECT count(*) FROM notifications'),
  'anon SELECT notifications fails or returns zero rows'
);

SELECT throws_ok(
  $$INSERT INTO notifications (user_id, title, message, type)
    VALUES (
      'a0000000-0000-4000-8000-0000000000aa',
      'anon',
      'anon',
      'request_pending'
    )$$,
  '42501',
  'anon INSERT notifications is denied'
);

RESET ROLE;

-- Company A JWT
SELECT pg_temp.set_company_jwt(
  'a0000000-0000-4000-8000-0000000000aa'::uuid,
  'a0000000-0000-4000-8000-00000000000a'::uuid
);
SET ROLE authenticated;

SELECT is(
  (SELECT count(*)::int FROM users WHERE id = 'b0000000-0000-4000-8000-0000000000bb'),
  0,
  'A JWT cannot SELECT company B users'
);

SELECT is(
  (SELECT count(*)::int FROM leave_requests WHERE id = 'b0000000-0000-4000-8000-0000000000b1'),
  0,
  'A JWT cannot SELECT company B leave_requests'
);

SELECT is(
  (SELECT count(*)::int FROM leave_balances WHERE user_id = 'b0000000-0000-4000-8000-0000000000bb'),
  0,
  'A JWT cannot SELECT company B leave_balances'
);

SELECT is(
  (SELECT count(*)::int FROM notifications WHERE id = 'b0000000-0000-4000-8000-0000000000b2'),
  0,
  'A JWT cannot SELECT company B notifications'
);

SELECT is(
  (SELECT count(*)::int FROM audit_logs WHERE id = 'b0000000-0000-4000-8000-0000000000b3'),
  0,
  'A JWT cannot SELECT company B audit_logs'
);

SELECT is(
  (SELECT count(*)::int FROM calendar_events WHERE id = 'b0000000-0000-4000-8000-0000000000b4'),
  0,
  'A JWT cannot SELECT company B calendar_events when user_id is set'
);

SELECT is(
  (SELECT count(*)::int FROM companies WHERE id = 'b0000000-0000-4000-8000-00000000000b'),
  0,
  'A JWT cannot SELECT company B companies'
);

SELECT is(
  (SELECT count(*)::int FROM company_invites WHERE id = 'b0000000-0000-4000-8000-0000000000b5'),
  0,
  'A JWT cannot SELECT company B company_invites'
);

SELECT is(
  (SELECT count(*)::int FROM leave_requests WHERE id = 'a0000000-0000-4000-8000-0000000000a1'),
  1,
  'authenticated A can SELECT A own leave_requests'
);

SELECT is(
  (SELECT count(*)::int FROM active_leave_requests WHERE user_id = 'b0000000-0000-4000-8000-0000000000bb'),
  0,
  'active_leave_requests as A does not return B rows'
);

-- TENANT-04 change path: A JWT against B rows
UPDATE leave_requests
SET reason = 'pwned by A'
WHERE id = 'b0000000-0000-4000-8000-0000000000b1';

DELETE FROM leave_requests
WHERE id = 'b0000000-0000-4000-8000-0000000000b1';

SELECT throws_ok(
  $$INSERT INTO leave_requests (user_id, leave_type, start_date, end_date, total_days, reason, status)
    VALUES (
      'b0000000-0000-4000-8000-0000000000bb',
      'vacation',
      '2026-11-01',
      '2026-11-02',
      2,
      'A inserting for B',
      'pending'
    )$$,
  '42501',
  'A JWT INSERT leave_requests with company B user_id is denied'
);

SELECT throws_ok(
  $$INSERT INTO notifications (user_id, title, message, type)
    VALUES (
      'b0000000-0000-4000-8000-0000000000bb',
      'cross',
      'cross',
      'request_pending'
    )$$,
  '42501',
  'A JWT INSERT notifications with company B user_id is denied'
);

UPDATE users
SET first_name = 'pwned'
WHERE id = 'b0000000-0000-4000-8000-0000000000bb';

RESET ROLE;

SELECT is(
  (SELECT reason FROM leave_requests WHERE id = 'b0000000-0000-4000-8000-0000000000b1'),
  'company B leave',
  'UPDATE of company B leave_requests by A JWT changes zero rows'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM leave_requests WHERE id = 'b0000000-0000-4000-8000-0000000000b1'
  ),
  'DELETE of company B leave_requests by A JWT deletes zero rows'
);

SELECT is(
  (SELECT first_name FROM users WHERE id = 'b0000000-0000-4000-8000-0000000000bb'),
  'Bob',
  'UPDATE of company B users by A JWT changes zero rows'
);

SELECT * FROM finish();
ROLLBACK;
