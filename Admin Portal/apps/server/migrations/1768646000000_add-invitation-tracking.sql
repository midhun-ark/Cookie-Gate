-- Migration: Add invitation tracking columns to tenant_users
-- Purpose: Track email invitation status for resend functionality

-- Up Migration
ALTER TABLE tenant_users
ADD COLUMN invitation_sent_at TIMESTAMPTZ,
ADD COLUMN last_invitation_sent_at TIMESTAMPTZ,
ADD COLUMN invitation_count INTEGER DEFAULT 1;

-- Add comment for clarity
COMMENT ON COLUMN tenant_users.invitation_sent_at IS 'Timestamp of first invitation email';
COMMENT ON COLUMN tenant_users.last_invitation_sent_at IS 'Timestamp of most recent invitation email';
COMMENT ON COLUMN tenant_users.invitation_count IS 'Number of invitation emails sent';

-- Down Migration
-- @down
-- ALTER TABLE tenant_users DROP COLUMN invitation_sent_at;
-- ALTER TABLE tenant_users DROP COLUMN last_invitation_sent_at;
-- ALTER TABLE tenant_users DROP COLUMN invitation_count;