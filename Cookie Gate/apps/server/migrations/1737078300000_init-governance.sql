-- Up Migration
-- 1. SUPER ADMIN TABLE
CREATE TABLE super_admin (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP WITH TIME ZONE
);

-- 2. TENANTS TABLE
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('ACTIVE', 'SUSPENDED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    suspended_at TIMESTAMP WITH TIME ZONE
);

-- 3. GLOBAL RULES TABLE
CREATE TABLE global_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version INTEGER NOT NULL,
    rules_json JSONB NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_global_rules_version ON global_rules(version);
CREATE UNIQUE INDEX idx_global_rules_active ON global_rules(is_active) WHERE (is_active IS TRUE);

-- 4. AUDIT LOGS TABLE
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_type VARCHAR(50) NOT NULL CHECK (actor_type = 'SUPER_ADMIN'),
    actor_id UUID NOT NULL REFERENCES super_admin(id),
    action VARCHAR(255) NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- PROTECTION: Append-only enforcement via Trigger
CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'audit_logs table is append-only. UPDATE and DELETE are prohibited.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_logs_immutable
    BEFORE UPDATE OR DELETE ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_log_modification();

-- 5. INCIDENTS TABLE
CREATE TABLE incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH')),
    type VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('OPEN', 'RESOLVED')),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Down Migration
DROP TABLE incidents;
DROP TRIGGER audit_logs_immutable ON audit_logs;
DROP FUNCTION prevent_audit_log_modification;
DROP TABLE audit_logs;
DROP TABLE global_rules;
DROP TABLE tenants;
DROP TABLE super_admin;
