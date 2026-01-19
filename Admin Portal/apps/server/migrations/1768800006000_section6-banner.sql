-- ============================================================================
-- SECTION 6: BANNER CUSTOMIZATION & TRANSLATIONS
-- ============================================================================

-- 6.1 Banner Customization (Styles - Language Agnostic)
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
    
    -- Legacy button text columns (deprecated - use banner_translations instead)
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

-- 6.2 Banner Translations (Multi-Language Text)
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

CREATE INDEX IF NOT EXISTS idx_banner_translations_website ON website_banner_translations(website_id);
CREATE INDEX IF NOT EXISTS idx_banner_translations_language ON website_banner_translations(language_code);

-- Down Migration
-- DROP TABLE IF EXISTS website_banner_translations CASCADE;
-- DROP TABLE IF EXISTS banner_customizations CASCADE;
