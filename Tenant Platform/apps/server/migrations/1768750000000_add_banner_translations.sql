-- Up Migration: Add Multi-Language Banner Support
-- Split banner text (translatable) from styles (language-agnostic)

-- =============================================================================
-- 1. CREATE BANNER TRANSLATIONS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS website_banner_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
    language_code VARCHAR(10) NOT NULL,
    
    -- Banner Text Content (Translatable)
    headline_text VARCHAR(255) NOT NULL DEFAULT 'We use cookies',
    description_text TEXT NOT NULL DEFAULT 'This website uses cookies to ensure you get the best experience.',
    accept_button_text VARCHAR(100) NOT NULL DEFAULT 'Accept All',
    reject_button_text VARCHAR(100) NOT NULL DEFAULT 'Reject All',
    preferences_button_text VARCHAR(100) NOT NULL DEFAULT 'Settings',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- One translation per language per website
    CONSTRAINT unique_banner_translation UNIQUE (website_id, language_code)
);

CREATE INDEX idx_banner_translations_website ON website_banner_translations(website_id);
CREATE INDEX idx_banner_translations_language ON website_banner_translations(language_code);

-- =============================================================================
-- 2. MIGRATE EXISTING DATA
-- =============================================================================
-- Copy button text from banner_customizations to translations as English

INSERT INTO website_banner_translations (
    website_id,
    language_code,
    headline_text,
    description_text,
    accept_button_text,
    reject_button_text,
    preferences_button_text
)
SELECT 
    website_id,
    'en',
    'We use cookies',
    'This website uses cookies to ensure you get the best experience.',
    COALESCE(accept_button_text, 'Accept All'),
    COALESCE(reject_button_text, 'Reject All'),
    COALESCE(customize_button_text, 'Settings')
FROM banner_customizations
ON CONFLICT (website_id, language_code) DO NOTHING;

-- =============================================================================
-- 3. REMOVE TEXT COLUMNS FROM STYLES TABLE (Optional - keep for backward compat)
-- =============================================================================
-- NOTE: We keep the columns for now to avoid breaking changes
-- They will be deprecated and ignored by the new code

-- Down Migration
-- DROP TABLE IF EXISTS website_banner_translations CASCADE;
