-- ============================================================================
-- SECTION 5: PURPOSES TABLE (with tag support)
-- ============================================================================

-- 5.1 Base Purposes Table
CREATE TABLE IF NOT EXISTS purposes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
    tag VARCHAR(50) NOT NULL, -- Unique identifier tag (e.g., 'analytics', 'marketing')
    is_essential BOOLEAN NOT NULL DEFAULT FALSE, -- Essential purposes cannot be declined
    status VARCHAR(20) NOT NULL CHECK (status IN ('ACTIVE', 'INACTIVE')) DEFAULT 'ACTIVE',
    display_order INTEGER NOT NULL DEFAULT 0, -- For UI ordering
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Tag format constraint (lowercase, numbers, underscores)
    CONSTRAINT check_tag_format CHECK (tag ~ '^[a-z0-9_]+$')
);

CREATE INDEX IF NOT EXISTS idx_purposes_website_id ON purposes(website_id);
CREATE INDEX IF NOT EXISTS idx_purposes_status ON purposes(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_purposes_website_tag ON purposes(website_id, tag);

-- 5.2 Purpose Translations Table
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

CREATE INDEX IF NOT EXISTS idx_purpose_translations_purpose_id ON purpose_translations(purpose_id);
CREATE INDEX IF NOT EXISTS idx_purpose_translations_language ON purpose_translations(language_code);

-- Down Migration
-- DROP TABLE IF EXISTS purpose_translations CASCADE;
-- DROP TABLE IF EXISTS purposes CASCADE;
