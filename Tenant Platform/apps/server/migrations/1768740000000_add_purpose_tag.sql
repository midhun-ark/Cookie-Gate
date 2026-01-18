-- Add tag column to purposes table
ALTER TABLE purposes ADD COLUMN tag VARCHAR(50);

-- Update existing records to have a tag based on the English name
-- We use a subquery to fetch the name from purpose_translations
UPDATE purposes 
SET tag = LOWER(REGEXP_REPLACE(pt.name, '\s+', '_', 'g')) 
FROM purpose_translations pt 
WHERE purposes.id = pt.purpose_id 
AND pt.language_code = 'en'
AND purposes.tag IS NULL;

-- If any tags are still null (no English translation?), set a default
UPDATE purposes SET tag = 'purpose_' || SUBSTRING(id::text, 1, 8) WHERE tag IS NULL;

-- Make it not null after population
ALTER TABLE purposes ALTER COLUMN tag SET NOT NULL;

-- Add checking constraint for format (lowercase, numbers, underscores)
ALTER TABLE purposes ADD CONSTRAINT check_tag_format CHECK (tag ~ '^[a-z0-9_]+$');

-- Ensure uniqueness of tag per website
CREATE UNIQUE INDEX idx_purposes_website_tag ON purposes(website_id, tag);
