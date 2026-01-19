-- ============================================================================
-- SECTION 1: SUPER ADMIN & GOVERNANCE TABLES
-- ============================================================================

-- 1.1 SUPER ADMIN TABLE
CREATE TABLE IF NOT EXISTS super_admin (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP WITH TIME ZONE
);

-- 1.2 TENANTS TABLE
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('ACTIVE', 'SUSPENDED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    suspended_at TIMESTAMP WITH TIME ZONE
);

-- 1.3 GLOBAL RULES TABLE
CREATE TABLE IF NOT EXISTS global_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version INTEGER NOT NULL,
    rules_json JSONB NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_global_rules_version ON global_rules(version);
CREATE UNIQUE INDEX IF NOT EXISTS idx_global_rules_active ON global_rules(is_active) WHERE (is_active IS TRUE);

-- 1.4 SUPER ADMIN AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_type VARCHAR(50) NOT NULL CHECK (actor_type = 'SUPER_ADMIN'),
    actor_id UUID NOT NULL REFERENCES super_admin(id),
    action VARCHAR(255) NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Append-only enforcement for audit_logs
CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'audit_logs table is append-only. UPDATE and DELETE are prohibited.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_logs_immutable ON audit_logs;
CREATE TRIGGER audit_logs_immutable
    BEFORE UPDATE OR DELETE ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_log_modification();

-- 1.5 INCIDENTS TABLE
CREATE TABLE IF NOT EXISTS incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH')),
    type VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('OPEN', 'RESOLVED')),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- =============================================================================
-- SEED: DEFAULT SUPER ADMIN
-- =============================================================================
-- Password: Admin@123 (bcrypt hashed with 12 rounds)
-- NOTE: Change this password immediately after first login!

INSERT INTO super_admin (email, password_hash, created_at)
VALUES (
    'admin@complyark.internal',
    '$2b$12$SouGamH1Iv6/31iHksM8r.1jANb.khaYb/RG3Abl762t7lRWQHqhS',
    NOW()
) ON CONFLICT (email) DO NOTHING;

-- Down Migration
-- DELETE FROM super_admin WHERE email = 'admin@complyark.internal';
-- DROP TABLE IF EXISTS incidents CASCADE;
-- DROP TRIGGER IF EXISTS audit_logs_immutable ON audit_logs;
-- DROP FUNCTION IF EXISTS prevent_audit_log_modification;
-- DROP TABLE IF EXISTS audit_logs CASCADE;
-- DROP TABLE IF EXISTS global_rules CASCADE;
-- DROP TABLE IF EXISTS tenants CASCADE;
-- DROP TABLE IF EXISTS super_admin CASCADE;
