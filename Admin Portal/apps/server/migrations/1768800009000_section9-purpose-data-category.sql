-- ============================================================================
-- SECTION 9: ADD DATA CATEGORY INFO TO PURPOSES
-- ============================================================================

-- Add data_category_info column to purpose_translations for DPDPA compliance
-- This field stores information about data categories processed for each purpose
ALTER TABLE purpose_translations 
ADD COLUMN IF NOT EXISTS data_category_info TEXT;

-- Down Migration
-- ALTER TABLE purpose_translations DROP COLUMN IF EXISTS data_category_info;
