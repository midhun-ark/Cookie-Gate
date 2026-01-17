-- Up Migration
-- Tenant Platform Database Schema
-- Purpose: Configure websites, notices, purposes, and banner customization for tenant admins

-- =============================================================================
-- 1. WEBSITES TABLE
-- =============================================================================
-- Stores websites configured by tenant admins under their organization

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

CREATE INDEX idx_websites_tenant_id ON websites(tenant_id);
CREATE INDEX idx_websites_status ON websites(status);

-- =============================================================================
-- 2. WEBSITE NOTICES TABLE (Base)
-- =============================================================================
-- One notice per website, storing the primary consent notice configuration

CREATE TABLE IF NOT EXISTS website_notices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Only one notice per website
    CONSTRAINT unique_website_notice UNIQUE (website_id)
);

-- =============================================================================
-- 3. WEBSITE NOTICE TRANSLATIONS TABLE
-- =============================================================================
-- Multi-language support for notices. English (en) is mandatory.

CREATE TABLE IF NOT EXISTS website_notice_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    website_notice_id UUID NOT NULL REFERENCES website_notices(id) ON DELETE CASCADE,
    language_code VARCHAR(10) NOT NULL, -- ISO 639-1 codes (en, hi, ta, etc.)
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    policy_url VARCHAR(1000),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Only one translation per language per notice
    CONSTRAINT unique_notice_translation UNIQUE (website_notice_id, language_code)
);

CREATE INDEX idx_notice_translations_notice_id ON website_notice_translations(website_notice_id);
CREATE INDEX idx_notice_translations_language ON website_notice_translations(language_code);

-- =============================================================================
-- 4. PURPOSES TABLE (Base)
-- =============================================================================
-- Data processing purposes for each website (e.g., Analytics, Marketing, etc.)

CREATE TABLE IF NOT EXISTS purposes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
    is_essential BOOLEAN NOT NULL DEFAULT FALSE, -- Essential purposes cannot be declined
    status VARCHAR(20) NOT NULL CHECK (status IN ('ACTIVE', 'INACTIVE')) DEFAULT 'ACTIVE',
    display_order INTEGER NOT NULL DEFAULT 0, -- For UI ordering
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_purposes_website_id ON purposes(website_id);
CREATE INDEX idx_purposes_status ON purposes(status);

-- =============================================================================
-- 5. PURPOSE TRANSLATIONS TABLE
-- =============================================================================
-- Multi-language support for purposes. English (en) is mandatory for essential purposes.

CREATE TABLE IF NOT EXISTS purpose_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purpose_id UUID NOT NULL REFERENCES purposes(id) ON DELETE CASCADE,
    language_code VARCHAR(10) NOT NULL, -- ISO 639-1 codes
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Only one translation per language per purpose
    CONSTRAINT unique_purpose_translation UNIQUE (purpose_id, language_code)
);

CREATE INDEX idx_purpose_translations_purpose_id ON purpose_translations(purpose_id);
CREATE INDEX idx_purpose_translations_language ON purpose_translations(language_code);

-- =============================================================================
-- 6. BANNER CUSTOMIZATION TABLE
-- =============================================================================
-- Guarded banner customization with dark pattern prevention

CREATE TABLE IF NOT EXISTS banner_customizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
    
    -- Primary Colors (DPDPA requires equal prominence)
    primary_color VARCHAR(7) NOT NULL DEFAULT '#0066CC',
    secondary_color VARCHAR(7) NOT NULL DEFAULT '#666666',
    background_color VARCHAR(7) NOT NULL DEFAULT '#FFFFFF',
    text_color VARCHAR(7) NOT NULL DEFAULT '#333333',
    
    -- Button Configuration (DPDPA: Equal prominence required)
    accept_button_color VARCHAR(7) NOT NULL DEFAULT '#0066CC',
    reject_button_color VARCHAR(7) NOT NULL DEFAULT '#0066CC', -- Same as accept for equal prominence
    accept_button_text VARCHAR(100) NOT NULL DEFAULT 'Accept All',
    reject_button_text VARCHAR(100) NOT NULL DEFAULT 'Reject All',
    customize_button_text VARCHAR(100) NOT NULL DEFAULT 'Customize',
    
    -- Layout Configuration
    position VARCHAR(20) NOT NULL CHECK (position IN ('bottom', 'top', 'center')) DEFAULT 'bottom',
    layout VARCHAR(20) NOT NULL CHECK (layout IN ('banner', 'modal', 'popup')) DEFAULT 'banner',
    
    -- Font Configuration
    font_family VARCHAR(100) DEFAULT 'system-ui, -apple-system, sans-serif',
    font_size VARCHAR(10) DEFAULT '14px',
    
    -- Accessibility
    focus_outline_color VARCHAR(7) DEFAULT '#005299',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Only one customization per website
    CONSTRAINT unique_website_banner UNIQUE (website_id)
);

-- =============================================================================
-- 7. TENANT AUDIT LOGS TABLE
-- =============================================================================
-- Separate audit log for tenant admin actions (distinct from super admin audit)

CREATE TABLE IF NOT EXISTS tenant_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    actor_id UUID NOT NULL REFERENCES tenant_users(id) ON DELETE RESTRICT, -- Tenant admin who performed action
    action VARCHAR(255) NOT NULL,
    resource_type VARCHAR(100), -- e.g., 'website', 'notice', 'purpose'
    resource_id UUID, -- ID of the affected resource
    metadata JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- PROTECTION: Append-only enforcement via Trigger
CREATE OR REPLACE FUNCTION prevent_tenant_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'tenant_audit_logs table is append-only. UPDATE and DELETE are prohibited.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tenant_audit_logs_immutable
    BEFORE UPDATE OR DELETE ON tenant_audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION prevent_tenant_audit_modification();

CREATE INDEX idx_tenant_audit_logs_tenant ON tenant_audit_logs(tenant_id);
CREATE INDEX idx_tenant_audit_logs_actor ON tenant_audit_logs(actor_id);
CREATE INDEX idx_tenant_audit_logs_action ON tenant_audit_logs(action);
CREATE INDEX idx_tenant_audit_logs_created ON tenant_audit_logs(created_at);
CREATE INDEX idx_tenant_audit_logs_resource ON tenant_audit_logs(resource_type, resource_id);

-- =============================================================================
-- 8. SUPPORTED LANGUAGES TABLE
-- =============================================================================
-- Master list of supported languages for the platform

CREATE TABLE IF NOT EXISTS supported_languages (
    code VARCHAR(10) PRIMARY KEY, -- ISO 639-1 code
    name VARCHAR(100) NOT NULL,
    native_name VARCHAR(100) NOT NULL,
    is_rtl BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default supported languages (English + Indian languages)
INSERT INTO supported_languages (code, name, native_name, is_rtl) VALUES
    ('en', 'English', 'English', FALSE),
    ('hi', 'Hindi', 'हिन्दी', FALSE),
    ('ta', 'Tamil', 'தமிழ்', FALSE),
    ('te', 'Telugu', 'తెలుగు', FALSE),
    ('bn', 'Bengali', 'বাংলা', FALSE),
    ('mr', 'Marathi', 'मराठी', FALSE),
    ('gu', 'Gujarati', 'ગુજરાતી', FALSE),
    ('kn', 'Kannada', 'ಕನ್ನಡ', FALSE),
    ('ml', 'Malayalam', 'മലയാളം', FALSE),
    ('pa', 'Punjabi', 'ਪੰਜਾਬੀ', FALSE),
    ('or', 'Odia', 'ଓଡ଼ିଆ', FALSE)
ON CONFLICT (code) DO NOTHING;

-- =============================================================================
-- DOWN MIGRATION
-- =============================================================================

-- Down Migration
DROP TABLE IF EXISTS supported_languages CASCADE;
DROP TRIGGER IF EXISTS tenant_audit_logs_immutable ON tenant_audit_logs;
DROP FUNCTION IF EXISTS prevent_tenant_audit_modification;
DROP TABLE IF EXISTS tenant_audit_logs CASCADE;
DROP TABLE IF EXISTS banner_customizations CASCADE;
DROP TABLE IF EXISTS purpose_translations CASCADE;
DROP TABLE IF EXISTS purposes CASCADE;
DROP TABLE IF EXISTS website_notice_translations CASCADE;
DROP TABLE IF EXISTS website_notices CASCADE;
DROP TABLE IF EXISTS websites CASCADE;
