-- ============================================================================
-- SECTION 7: TENANT AUDIT LOGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS tenant_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    actor_id UUID NOT NULL REFERENCES tenant_users(id) ON DELETE RESTRICT,
    action VARCHAR(255) NOT NULL,
    resource_type VARCHAR(100), -- e.g., 'website', 'notice', 'purpose'
    resource_id UUID, -- ID of the affected resource
    metadata JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Append-only enforcement for tenant_audit_logs
CREATE OR REPLACE FUNCTION prevent_tenant_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'tenant_audit_logs table is append-only. UPDATE and DELETE are prohibited.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tenant_audit_logs_immutable ON tenant_audit_logs;
CREATE TRIGGER tenant_audit_logs_immutable
    BEFORE UPDATE OR DELETE ON tenant_audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION prevent_tenant_audit_modification();

CREATE INDEX IF NOT EXISTS idx_tenant_audit_logs_tenant ON tenant_audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_audit_logs_actor ON tenant_audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_tenant_audit_logs_action ON tenant_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_tenant_audit_logs_created ON tenant_audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_tenant_audit_logs_resource ON tenant_audit_logs(resource_type, resource_id);

-- Down Migration
-- DROP TRIGGER IF EXISTS tenant_audit_logs_immutable ON tenant_audit_logs;
-- DROP FUNCTION IF EXISTS prevent_tenant_audit_modification;
-- DROP TABLE IF EXISTS tenant_audit_logs CASCADE;
