-- pgTAP: onboarding RPCs seed vacation/sick/personal from leave_policies;
-- ON CONFLICT DO NOTHING never overwrites used_days (BAL-02, D-07, D-13).

BEGIN;

SELECT plan(14);

SELECT lives_ok(
  $$SELECT create_company_with_owner(
    'seed-owner-03-03@pgtap.example',
    NULL,
    'Owner',
    'Seed',
    'Seed Co 03-03'
  )$$,
  'create_company_with_owner succeeds for a unique email'
);

SELECT is(
  (SELECT email FROM users WHERE email = 'seed-owner-03-03@pgtap.example'),
  'seed-owner-03-03@pgtap.example',
  'create_company_with_owner returns a users row'
);

SELECT is(
  (
    SELECT count(*)::int
    FROM leave_balances lb
    JOIN users u ON u.id = lb.user_id
    WHERE u.email = 'seed-owner-03-03@pgtap.example'
      AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)::integer
      AND lb.leave_type IN ('vacation', 'sick', 'personal')
  ),
  3,
  'owner has three current-year vacation/sick/personal balances'
);

SELECT is(
  (
    SELECT count(*)::int
    FROM leave_balances lb
    JOIN users u ON u.id = lb.user_id
    WHERE u.email = 'seed-owner-03-03@pgtap.example'
      AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)::integer
      AND lb.leave_type IN ('vacation', 'sick', 'personal')
      AND lb.used_days = 0
      AND lb.carried_over = 0
  ),
  3,
  'owner seeded used_days and carried_over are 0'
);

SELECT is(
  (
    SELECT remaining_days
    FROM leave_balances lb
    JOIN users u ON u.id = lb.user_id
    WHERE u.email = 'seed-owner-03-03@pgtap.example'
      AND lb.leave_type = 'vacation'
      AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)::integer
  ),
  (
    SELECT default_allowance
    FROM (
      SELECT DISTINCT ON (leave_type) default_allowance
      FROM leave_policies
      WHERE leave_type = 'vacation' AND is_active = true
      ORDER BY leave_type, name
    ) p
  ),
  'owner vacation remaining_days equals active policy default_allowance'
);

SELECT is(
  (
    SELECT remaining_days
    FROM leave_balances lb
    JOIN users u ON u.id = lb.user_id
    WHERE u.email = 'seed-owner-03-03@pgtap.example'
      AND lb.leave_type = 'sick'
      AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)::integer
  ),
  (
    SELECT default_allowance
    FROM (
      SELECT DISTINCT ON (leave_type) default_allowance
      FROM leave_policies
      WHERE leave_type = 'sick' AND is_active = true
      ORDER BY leave_type, name
    ) p
  ),
  'owner sick remaining_days equals active policy default_allowance'
);

SELECT is(
  (
    SELECT remaining_days
    FROM leave_balances lb
    JOIN users u ON u.id = lb.user_id
    WHERE u.email = 'seed-owner-03-03@pgtap.example'
      AND lb.leave_type = 'personal'
      AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)::integer
  ),
  (
    SELECT default_allowance
    FROM (
      SELECT DISTINCT ON (leave_type) default_allowance
      FROM leave_policies
      WHERE leave_type = 'personal' AND is_active = true
      ORDER BY leave_type, name
    ) p
  ),
  'owner personal remaining_days equals active policy default_allowance'
);

INSERT INTO company_invites (
  id, company_id, email, token_hash, expires_at, status
)
SELECT
  'c0000000-0000-4000-8000-000000000033'::uuid,
  u.company_id,
  'seed-invitee-03-03@pgtap.example',
  repeat('cc', 32),
  now() + interval '7 days',
  'pending'
FROM users u
WHERE u.email = 'seed-owner-03-03@pgtap.example';

SELECT lives_ok(
  $$SELECT accept_invite_with_employee(
    'c0000000-0000-4000-8000-000000000033'::uuid,
    'seed-invitee-03-03@pgtap.example',
    NULL,
    'Invitee',
    'Seed',
    (SELECT company_id FROM users WHERE email = 'seed-owner-03-03@pgtap.example')
  )$$,
  'accept_invite_with_employee succeeds for a pending invite'
);

SELECT is(
  (
    SELECT count(*)::int
    FROM leave_balances lb
    JOIN users u ON u.id = lb.user_id
    WHERE u.email = 'seed-invitee-03-03@pgtap.example'
      AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)::integer
      AND lb.leave_type IN ('vacation', 'sick', 'personal')
  ),
  3,
  'invitee has three current-year vacation/sick/personal balances'
);

SELECT is(
  (
    SELECT count(*)::int
    FROM leave_balances lb
    JOIN users u ON u.id = lb.user_id
    WHERE u.email = 'seed-invitee-03-03@pgtap.example'
      AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)::integer
      AND lb.leave_type IN ('vacation', 'sick', 'personal')
      AND lb.used_days = 0
      AND lb.carried_over = 0
  ),
  3,
  'invitee seeded used_days and carried_over are 0'
);

SELECT is(
  (
    SELECT remaining_days
    FROM leave_balances lb
    JOIN users u ON u.id = lb.user_id
    WHERE u.email = 'seed-invitee-03-03@pgtap.example'
      AND lb.leave_type = 'vacation'
      AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)::integer
  ),
  (
    SELECT default_allowance
    FROM (
      SELECT DISTINCT ON (leave_type) default_allowance
      FROM leave_policies
      WHERE leave_type = 'vacation' AND is_active = true
      ORDER BY leave_type, name
    ) p
  ),
  'invitee vacation remaining_days equals active policy default_allowance'
);

SELECT is(
  (
    SELECT remaining_days
    FROM leave_balances lb
    JOIN users u ON u.id = lb.user_id
    WHERE u.email = 'seed-invitee-03-03@pgtap.example'
      AND lb.leave_type = 'sick'
      AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)::integer
  ),
  (
    SELECT default_allowance
    FROM (
      SELECT DISTINCT ON (leave_type) default_allowance
      FROM leave_policies
      WHERE leave_type = 'sick' AND is_active = true
      ORDER BY leave_type, name
    ) p
  ),
  'invitee sick remaining_days equals active policy default_allowance'
);

SELECT is(
  (
    SELECT remaining_days
    FROM leave_balances lb
    JOIN users u ON u.id = lb.user_id
    WHERE u.email = 'seed-invitee-03-03@pgtap.example'
      AND lb.leave_type = 'personal'
      AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)::integer
  ),
  (
    SELECT default_allowance
    FROM (
      SELECT DISTINCT ON (leave_type) default_allowance
      FROM leave_policies
      WHERE leave_type = 'personal' AND is_active = true
      ORDER BY leave_type, name
    ) p
  ),
  'invitee personal remaining_days equals active policy default_allowance'
);

UPDATE leave_balances lb
SET used_days = 7
FROM users u
WHERE lb.user_id = u.id
  AND u.email = 'seed-owner-03-03@pgtap.example'
  AND lb.leave_type = 'vacation'
  AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)::integer;

INSERT INTO public.leave_balances (
  user_id, leave_type, total_allowance, used_days, remaining_days, carried_over, year
)
SELECT
  u.id,
  lp.leave_type,
  lp.default_allowance,
  0,
  lp.default_allowance,
  0,
  EXTRACT(YEAR FROM CURRENT_DATE)::integer
FROM users u
CROSS JOIN (
  SELECT DISTINCT ON (leave_type)
    leave_type,
    default_allowance
  FROM public.leave_policies
  WHERE leave_type IN ('vacation', 'sick', 'personal')
    AND is_active = true
  ORDER BY leave_type, name
) lp
WHERE u.email = 'seed-owner-03-03@pgtap.example'
ON CONFLICT (user_id, leave_type, year) DO NOTHING;

SELECT is(
  (
    SELECT used_days
    FROM leave_balances lb
    JOIN users u ON u.id = lb.user_id
    WHERE u.email = 'seed-owner-03-03@pgtap.example'
      AND lb.leave_type = 'vacation'
      AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)::integer
  ),
  7,
  'conflicting insert does not overwrite existing used_days'
);

SELECT * FROM finish();
ROLLBACK;
