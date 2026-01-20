-- ============================================================================
-- SECTION 4: WEBSITE NOTICES TABLE (with DPDPA fields)
-- ============================================================================
-- NOTE: Notices now belong to website_versions, not directly to websites.
-- This enables versioning of consent configurations.

-- 4.1 Base Notice Table
CREATE TABLE IF NOT EXISTS website_notices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    website_version_id UUID NOT NULL REFERENCES website_versions(id) ON DELETE CASCADE,
    dpo_email TEXT, -- DPO/Grievance Officer email (DPDPA requirement)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Only one notice per version
    CONSTRAINT unique_version_notice UNIQUE (website_version_id)
);

-- 4.2 Notice Translations Table (with DPDPA specific fields)
CREATE TABLE IF NOT EXISTS website_notice_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    website_notice_id UUID NOT NULL REFERENCES website_notices(id) ON DELETE CASCADE,
    language_code VARCHAR(10) NOT NULL, -- ISO 639-1 codes (en, hi, ta, etc.)
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    policy_url VARCHAR(1000),
    
    -- DPDPA specific fields
    data_categories TEXT[] DEFAULT '{}',
    processing_purposes TEXT[] DEFAULT '{}',
    rights_description TEXT,
    withdrawal_instruction TEXT,
    complaint_instruction TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Only one translation per language per notice
    CONSTRAINT unique_notice_translation UNIQUE (website_notice_id, language_code)
);

CREATE INDEX IF NOT EXISTS idx_notice_translations_notice_id ON website_notice_translations(website_notice_id);
CREATE INDEX IF NOT EXISTS idx_notice_translations_language ON website_notice_translations(language_code);

-- Down Migration
-- DROP TABLE IF EXISTS website_notice_translations CASCADE;
-- DROP TABLE IF EXISTS website_notices CASCADE;
