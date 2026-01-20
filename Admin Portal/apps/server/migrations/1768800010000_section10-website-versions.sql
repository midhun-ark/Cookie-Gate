-- ============================================================================
-- SECTION 10: WEBSITE VERSIONS TABLE
-- ============================================================================
-- Implements versioning for websites. All related data (notices, purposes, 
-- banner) now belongs to a version rather than directly to the website.
-- Only one version can be ACTIVE at a time per website.

CREATE TABLE IF NOT EXISTS website_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    version_name VARCHAR(100),  -- Optional editable name (e.g., "Holiday Campaign")
    status VARCHAR(20) NOT NULL CHECK (status IN ('DRAFT', 'ACTIVE', 'ARCHIVED')) DEFAULT 'DRAFT',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Each website can only have one of each version number
    CONSTRAINT unique_website_version UNIQUE (website_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_website_versions_website_id ON website_versions(website_id);
CREATE INDEX IF NOT EXISTS idx_website_versions_status ON website_versions(status);

-- Partial unique index: Only one ACTIVE version per website
CREATE UNIQUE INDEX IF NOT EXISTS idx_website_versions_one_active 
    ON website_versions(website_id) 
    WHERE status = 'ACTIVE';

-- Down Migration
-- DROP TABLE IF EXISTS website_versions CASCADE;
