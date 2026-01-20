-- ============================================================================
-- SECTION 11: ADD WEBSITE_VERSION_ID TO EXISTING TABLES
-- ============================================================================
-- Adds website_version_id column to notices, purposes, and banner tables
-- to support the versioning system. Also links existing data to versions.

-- Add website_version_id to website_notices
ALTER TABLE website_notices ADD COLUMN IF NOT EXISTS website_version_id UUID;
ALTER TABLE website_notices 
    DROP CONSTRAINT IF EXISTS website_notices_version_fkey;
ALTER TABLE website_notices 
    ADD CONSTRAINT website_notices_version_fkey 
    FOREIGN KEY (website_version_id) REFERENCES website_versions(id) ON DELETE CASCADE;

-- Update existing notices to link to active versions
UPDATE website_notices wn
SET website_version_id = wv.id
FROM website_versions wv
WHERE wn.website_id = wv.website_id AND wv.status = 'ACTIVE'
AND wn.website_version_id IS NULL;

-- Create index on website_version_id
CREATE INDEX IF NOT EXISTS idx_website_notices_version_id ON website_notices(website_version_id);

-- Add website_version_id to purposes
ALTER TABLE purposes ADD COLUMN IF NOT EXISTS website_version_id UUID;
ALTER TABLE purposes 
    DROP CONSTRAINT IF EXISTS purposes_version_fkey;
ALTER TABLE purposes 
    ADD CONSTRAINT purposes_version_fkey 
    FOREIGN KEY (website_version_id) REFERENCES website_versions(id) ON DELETE CASCADE;

-- Update existing purposes to link to active versions
UPDATE purposes p
SET website_version_id = wv.id
FROM website_versions wv
WHERE p.website_id = wv.website_id AND wv.status = 'ACTIVE'
AND p.website_version_id IS NULL;

-- Create index on website_version_id
CREATE INDEX IF NOT EXISTS idx_purposes_version_id ON purposes(website_version_id);

-- Add website_version_id to banner_customizations
ALTER TABLE banner_customizations ADD COLUMN IF NOT EXISTS website_version_id UUID;
ALTER TABLE banner_customizations 
    DROP CONSTRAINT IF EXISTS banner_customizations_version_fkey;
ALTER TABLE banner_customizations 
    ADD CONSTRAINT banner_customizations_version_fkey 
    FOREIGN KEY (website_version_id) REFERENCES website_versions(id) ON DELETE CASCADE;

-- Update existing banners to link to active versions
UPDATE banner_customizations bc
SET website_version_id = wv.id
FROM website_versions wv
WHERE bc.website_id = wv.website_id AND wv.status = 'ACTIVE'
AND bc.website_version_id IS NULL;

-- Create index on website_version_id
CREATE INDEX IF NOT EXISTS idx_banner_customizations_version_id ON banner_customizations(website_version_id);

-- Add website_version_id to website_banner_translations
ALTER TABLE website_banner_translations ADD COLUMN IF NOT EXISTS website_version_id UUID;
ALTER TABLE website_banner_translations 
    DROP CONSTRAINT IF EXISTS banner_translations_version_fkey;
ALTER TABLE website_banner_translations 
    ADD CONSTRAINT banner_translations_version_fkey 
    FOREIGN KEY (website_version_id) REFERENCES website_versions(id) ON DELETE CASCADE;

-- Update existing banner translations to link to active versions
UPDATE website_banner_translations wbt
SET website_version_id = wv.id
FROM website_versions wv
WHERE wbt.website_id = wv.website_id AND wv.status = 'ACTIVE'
AND wbt.website_version_id IS NULL;

-- Create index on website_version_id
CREATE INDEX IF NOT EXISTS idx_banner_translations_version_id ON website_banner_translations(website_version_id);

-- Down Migration
-- ALTER TABLE website_notices DROP COLUMN IF EXISTS website_version_id;
-- ALTER TABLE purposes DROP COLUMN IF EXISTS website_version_id;
-- ALTER TABLE banner_customizations DROP COLUMN IF EXISTS website_version_id;
-- ALTER TABLE website_banner_translations DROP COLUMN IF EXISTS website_version_id;
