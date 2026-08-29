-- Migration: add_companies_and_invites
-- Description: Tenant tables (companies, company_invites), users.company_id, and create_company_with_owner RPC
-- Date: 2026-08-29

-- Companies: owner_id is nullable during insert to break the circular FK with users.company_id
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(80) NOT NULL,
    owner_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_companies_owner_id ON companies(owner_id);

CREATE TABLE company_invites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_company_invites_company_id ON company_invites(company_id);
CREATE INDEX idx_company_invites_email ON company_invites(email);

CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_company_invites_updated_at
    BEFORE UPDATE ON company_invites
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE users
    ADD COLUMN company_id UUID REFERENCES companies(id);

CREATE INDEX idx_users_company_id ON users(company_id);

-- Backfill existing rows into one demo company so company_id can be NOT NULL.
-- Skip when the table is empty (fresh reset: seed.sql inserts the demo company).
DO $$
DECLARE
    v_company_id uuid;
    v_owner_id uuid := '770e8400-e29b-41d4-a716-446655440005';
BEGIN
    IF EXISTS (SELECT 1 FROM users) THEN
        INSERT INTO companies (name, owner_id)
        VALUES ('Timeoff Demo', NULL)
        RETURNING id INTO v_company_id;

        UPDATE users SET company_id = v_company_id WHERE company_id IS NULL;

        IF EXISTS (SELECT 1 FROM users WHERE id = v_owner_id) THEN
            UPDATE companies SET owner_id = v_owner_id WHERE id = v_company_id;
        ELSE
            UPDATE companies
            SET owner_id = (SELECT id FROM users ORDER BY created_at ASC LIMIT 1)
            WHERE id = v_company_id;
        END IF;
    END IF;
END $$;

ALTER TABLE users ALTER COLUMN company_id SET NOT NULL;

-- Atomic create-company: insert company (null owner), insert admin owner, set owner_id.
-- p_password is nullable: credentials pass a bcrypt hash; Google (01-03) passes SQL NULL.
CREATE OR REPLACE FUNCTION create_company_with_owner(
    p_email TEXT,
    p_password TEXT,
    p_first_name TEXT,
    p_last_name TEXT,
    p_company_name TEXT
)
RETURNS users
LANGUAGE plpgsql
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

    RETURN v_user;
END;
$$;

GRANT EXECUTE ON FUNCTION create_company_with_owner(TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public company select" ON companies
    FOR SELECT USING (true);
CREATE POLICY "Allow public company insert" ON companies
    FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public company update" ON companies
    FOR UPDATE USING (true);

CREATE POLICY "Allow public company invite select" ON company_invites
    FOR SELECT USING (true);
CREATE POLICY "Allow public company invite insert" ON company_invites
    FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public company invite update" ON company_invites
    FOR UPDATE USING (true);
