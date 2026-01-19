-- ============================================================================
-- SECTION 2: TENANT USERS TABLE (with invitation tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS tenant_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    email TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    must_reset_password BOOLEAN DEFAULT TRUE,
    status TEXT CHECK (status IN ('ACTIVE', 'SUSPENDED')) DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Invitation tracking columns
    invitation_sent_at TIMESTAMPTZ,
    last_invitation_sent_at TIMESTAMPTZ,
    invitation_count INTEGER DEFAULT 1,
    
    -- Constraints: Only ONE tenant admin per tenant
    CONSTRAINT unique_tenant_admin UNIQUE (tenant_id),
    -- System-wide unique email
    CONSTRAINT unique_tenant_email UNIQUE (email)
);

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_tenant_users_email ON tenant_users(email);

-- Comments for invitation tracking columns
COMMENT ON COLUMN tenant_users.invitation_sent_at IS 'Timestamp of first invitation email';
COMMENT ON COLUMN tenant_users.last_invitation_sent_at IS 'Timestamp of most recent invitation email';
COMMENT ON COLUMN tenant_users.invitation_count IS 'Number of invitation emails sent';

-- Down Migration
-- DROP TABLE IF EXISTS tenant_users CASCADE;
