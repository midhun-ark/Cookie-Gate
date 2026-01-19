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

-- Down Migration
-- DROP TABLE IF EXISTS supported_languages CASCADE;
