-- Up Migration
-- TENANT USERS TABLE (SA-Side Provisioning Only)
-- Purpose: Store tenant admin credentials created by Super Admin
-- NOTE: This table is NOT used for login yet. It stores credentials ONLY.

CREATE TABLE tenant_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    email TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    must_reset_password BOOLEAN DEFAULT TRUE,
    status TEXT CHECK (status IN ('ACTIVE', 'SUSPENDED')) DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints: Only ONE tenant admin per tenant
    CONSTRAINT unique_tenant_admin UNIQUE (tenant_id),
    -- System-wide unique email
    CONSTRAINT unique_tenant_email UNIQUE (email)
);

-- Index for email lookups (for future Tenant Platform)
CREATE INDEX idx_tenant_users_email ON tenant_users(email);

-- Down Migration
DROP TABLE tenant_users;
