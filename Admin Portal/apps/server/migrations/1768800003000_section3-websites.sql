-- ============================================================================
-- SECTION 3: WEBSITES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS websites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    domain VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('DRAFT', 'ACTIVE', 'DISABLED')) DEFAULT 'DRAFT',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Each tenant can only have one entry per domain
    CONSTRAINT unique_tenant_domain UNIQUE (tenant_id, domain)
);

CREATE INDEX IF NOT EXISTS idx_websites_tenant_id ON websites(tenant_id);
CREATE INDEX IF NOT EXISTS idx_websites_status ON websites(status);

-- Down Migration
-- DROP TABLE IF EXISTS websites CASCADE;
