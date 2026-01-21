-- Data Principal Requests Module Schema Migration
-- This migration creates tables for DPDPA compliance: Privacy Team, DPR requests, communications, audit

-- ============================================================================
-- 1. PRIVACY TEAM MEMBERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS privacy_team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'STAFF')),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, email)
);

CREATE INDEX IF NOT EXISTS idx_privacy_team_tenant ON privacy_team_members(tenant_id);
CREATE INDEX IF NOT EXISTS idx_privacy_team_status ON privacy_team_members(status);

-- ============================================================================
-- 2. SLA CONFIGURATIONS (per tenant)
-- ============================================================================
CREATE TABLE IF NOT EXISTS sla_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
    default_sla_days INTEGER NOT NULL DEFAULT 14,
    nomination_sla_days INTEGER NOT NULL DEFAULT 30,
    warning_threshold_days INTEGER NOT NULL DEFAULT 5,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 3. OTP VERIFICATIONS (for intake flow)
-- ============================================================================
CREATE TABLE IF NOT EXISTS dpr_otp_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    request_type VARCHAR(20) NOT NULL CHECK (request_type IN ('ACCESS', 'CORRECTION', 'ERASURE', 'NOMINATION', 'GRIEVANCE')),
    request_payload JSONB NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_email ON dpr_otp_verifications(email);
CREATE INDEX IF NOT EXISTS idx_otp_expires ON dpr_otp_verifications(expires_at);

-- ============================================================================
-- 4. DATA PRINCIPAL REQUESTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS data_principal_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
    
    -- Request identification
    request_number VARCHAR(50) NOT NULL UNIQUE,
    request_type VARCHAR(20) NOT NULL CHECK (request_type IN ('ACCESS', 'CORRECTION', 'ERASURE', 'NOMINATION', 'GRIEVANCE')),
    
    -- Data Principal info
    data_principal_email VARCHAR(255) NOT NULL,
    submission_language VARCHAR(10) NOT NULL DEFAULT 'en',
    
    -- Status tracking
    status VARCHAR(30) NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED', 'WORK_IN_PROGRESS', 'RESPONDED', 'RESOLVED')),
    response_outcome VARCHAR(30) CHECK (response_outcome IN ('FULFILLED', 'PARTIALLY_FULFILLED', 'REJECTED')),
    
    -- Assignment
    assigned_to UUID REFERENCES privacy_team_members(id) ON DELETE SET NULL,
    
    -- SLA
    sla_due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    sla_days INTEGER NOT NULL,
    
    -- Request data (immutable)
    original_payload JSONB NOT NULL,
    
    -- Response data
    response_reason TEXT,
    response_attachments JSONB DEFAULT '[]',
    
    -- Timestamps
    responded_at TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dpr_tenant ON data_principal_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dpr_website ON data_principal_requests(website_id);
CREATE INDEX IF NOT EXISTS idx_dpr_status ON data_principal_requests(status);
CREATE INDEX IF NOT EXISTS idx_dpr_type ON data_principal_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_dpr_sla ON data_principal_requests(sla_due_date);
CREATE INDEX IF NOT EXISTS idx_dpr_assigned ON data_principal_requests(assigned_to);
CREATE INDEX IF NOT EXISTS idx_dpr_email ON data_principal_requests(data_principal_email);

-- ============================================================================
-- 5. REQUEST COMMUNICATIONS (email timeline)
-- ============================================================================
CREATE TABLE IF NOT EXISTS dpr_communications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES data_principal_requests(id) ON DELETE CASCADE,
    
    direction VARCHAR(10) NOT NULL CHECK (direction IN ('INCOMING', 'OUTGOING')),
    subject VARCHAR(500) NOT NULL,
    body TEXT NOT NULL,
    attachments JSONB DEFAULT '[]',
    
    sent_at TIMESTAMP WITH TIME ZONE NOT NULL,
    message_id VARCHAR(255),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dpr_comm_request ON dpr_communications(request_id);
CREATE INDEX IF NOT EXISTS idx_dpr_comm_sent ON dpr_communications(sent_at);

-- ============================================================================
-- 6. REQUEST AUDIT ENTRIES (immutable log)
-- ============================================================================
CREATE TABLE IF NOT EXISTS dpr_audit_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES data_principal_requests(id) ON DELETE CASCADE,
    
    actor_id UUID,
    actor_email VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL,
    
    previous_value JSONB,
    new_value JSONB,
    
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dpr_audit_request ON dpr_audit_entries(request_id);
CREATE INDEX IF NOT EXISTS idx_dpr_audit_created ON dpr_audit_entries(created_at);

-- Prevent updates and deletes on audit entries
CREATE OR REPLACE FUNCTION prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'DPR audit entries cannot be modified or deleted';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS protect_dpr_audit ON dpr_audit_entries;
CREATE TRIGGER protect_dpr_audit
    BEFORE UPDATE OR DELETE ON dpr_audit_entries
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_modification();

-- ============================================================================
-- DOWN MIGRATION (for rollback)
-- ============================================================================
-- DROP TRIGGER IF EXISTS protect_dpr_audit ON dpr_audit_entries;
-- DROP FUNCTION IF EXISTS prevent_audit_modification();
-- DROP TABLE IF EXISTS dpr_audit_entries;
-- DROP TABLE IF EXISTS dpr_communications;
-- DROP TABLE IF EXISTS data_principal_requests;
-- DROP TABLE IF EXISTS dpr_otp_verifications;
-- DROP TABLE IF EXISTS sla_configurations;
-- DROP TABLE IF EXISTS privacy_team_members;
