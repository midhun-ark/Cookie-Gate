-- ============================================================================
-- SECTION 8: SUPPORTED LANGUAGES TABLE
-- ============================================================================

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

ON CONFLICT (code) DO NOTHING;

-- Down Migration
-- DROP TABLE IF EXISTS supported_languages CASCADE;
