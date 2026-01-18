-- Up Migration
-- Add DPO email to website_notices
ALTER TABLE website_notices 
ADD COLUMN dpo_email TEXT;

-- Add DPDPA specific fields to website_notice_translations
ALTER TABLE website_notice_translations
ADD COLUMN data_categories TEXT[] DEFAULT '{}',
ADD COLUMN processing_purposes TEXT[] DEFAULT '{}',
ADD COLUMN rights_description TEXT,
ADD COLUMN withdrawal_instruction TEXT,
ADD COLUMN complaint_instruction TEXT;

-- Down Migration
ALTER TABLE website_notice_translations
DROP COLUMN data_categories,
DROP COLUMN processing_purposes,
DROP COLUMN rights_description,
DROP COLUMN withdrawal_instruction,
DROP COLUMN complaint_instruction;

ALTER TABLE website_notices
DROP COLUMN dpo_email;
