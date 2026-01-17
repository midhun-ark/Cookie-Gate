/**
 * Tenant Admin Service for ComplyArk Super Admin
 * 
 * PURPOSE:
 * - Create tenant admin records (SA-side only)
 * - Generate secure temporary passwords
 * - Trigger invitation emails
 * - Audit all actions
 * 
 * SCOPE RULES:
 * - This service runs ONLY in Super Admin context
 * - Only Super Admin can trigger it
 * - Tenants cannot self-register
 * - No tenant login logic here
 * 
 * SECURITY:
 * - Passwords are hashed with bcrypt
 * - Temporary passwords are never logged
 * - Temporary passwords are never stored in plaintext
 * - All actions are audited
 */

import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { db } from './db';
import { logAuditAction } from './audit';
import { sendTenantAdminInvite } from './email';

export interface TenantUser {
    id: string;
    tenant_id: string;
    email: string;
    must_reset_password: boolean;
    status: 'ACTIVE' | 'SUSPENDED';
    created_at: Date;
    invitation_sent_at?: Date;
    last_invitation_sent_at?: Date;
    invitation_count?: number;
}

export interface IssueTenantAdminResult {
    success: boolean;
    tenantUser?: TenantUser;
    emailSent: boolean;
    error?: string;
}

/**
 * Generate a cryptographically secure temporary password.
 * 
 * Requirements:
 * - Length ≥ 12 characters
 * - Mix of uppercase, lowercase, numbers, and symbols
 * - Cryptographically secure random
 */
function generateTemporaryPassword(): string {
    // Character sets for stronger passwords
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lower = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%&*';

    const allChars = upper + lower + numbers + symbols;
    const passwordLength = 14;

    // Ensure at least one of each type
    let password = '';
    password += upper[crypto.randomInt(upper.length)];
    password += lower[crypto.randomInt(lower.length)];
    password += numbers[crypto.randomInt(numbers.length)];
    password += symbols[crypto.randomInt(symbols.length)];

    // Fill remaining with random characters
    for (let i = password.length; i < passwordLength; i++) {
        password += allChars[crypto.randomInt(allChars.length)];
    }

    // Shuffle the password
    const shuffled = password.split('').sort(() => crypto.randomInt(3) - 1).join('');

    return shuffled;
}

/**
 * Issue Tenant Admin Access
 * 
 * This is the CORE governance action for provisioning tenant access.
 * 
 * Processing steps (STRICT ORDER):
 * 1. Validate Super Admin context (done by middleware)
 * 2. Validate tenant exists
 * 3. Validate tenant status = ACTIVE
 * 4. Check tenant_users table - reject if record exists
 * 5. Generate temporary password
 * 6. Hash password using bcrypt
 * 7. Insert tenant_users record
 * 8. Send invitation email
 * 9. Write audit log entry
 * 
 * @param actorId - Super Admin ID (from authenticated context)
 * @param tenantId - Target tenant ID
 * @param tenantAdminEmail - Email for the new tenant admin
 */
export async function issueTenantAdminAccess(
    actorId: string,
    tenantId: string,
    tenantAdminEmail: string
): Promise<IssueTenantAdminResult> {

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(tenantAdminEmail)) {
        return { success: false, emailSent: false, error: 'Invalid email format' };
    }

    // Step 2: Validate tenant exists
    const tenantRes = await db.query(
        'SELECT id, name, status FROM tenants WHERE id = $1',
        [tenantId]
    );

    if (tenantRes.rowCount === 0) {
        return { success: false, emailSent: false, error: 'Tenant not found' };
    }

    const tenant = tenantRes.rows[0];

    // Step 3: Validate tenant status = ACTIVE
    if (tenant.status !== 'ACTIVE') {
        return {
            success: false,
            emailSent: false,
            error: 'Cannot issue access to suspended tenant'
        };
    }

    // Step 4: Check if tenant admin already exists
    const existingRes = await db.query(
        'SELECT id FROM tenant_users WHERE tenant_id = $1',
        [tenantId]
    );

    if ((existingRes.rowCount ?? 0) > 0) {
        return {
            success: false,
            emailSent: false,
            error: 'Tenant admin already exists. Only one admin per tenant is allowed.'
        };
    }

    // Check if email is already used by another tenant
    const emailCheckRes = await db.query(
        'SELECT id FROM tenant_users WHERE email = $1',
        [tenantAdminEmail]
    );

    if ((emailCheckRes.rowCount ?? 0) > 0) {
        return {
            success: false,
            emailSent: false,
            error: 'This email is already assigned to another tenant'
        };
    }

    // Step 5: Generate temporary password
    const temporaryPassword = generateTemporaryPassword();

    // Step 6: Hash password using bcrypt
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(temporaryPassword, saltRounds);

    // Step 7: Insert tenant_users record with invitation tracking
    const now = new Date();
    const insertRes = await db.query(
        `INSERT INTO tenant_users (tenant_id, email, password_hash, must_reset_password, status, invitation_sent_at, last_invitation_sent_at, invitation_count)
         VALUES ($1, $2, $3, TRUE, 'ACTIVE', $4, $4, 1)
         RETURNING id, tenant_id, email, must_reset_password, status, created_at, invitation_sent_at, last_invitation_sent_at, invitation_count`,
        [tenantId, tenantAdminEmail, passwordHash, now]
    );

    const tenantUser = insertRes.rows[0] as TenantUser;

    // Step 8: Send invitation email
    const emailSent = await sendTenantAdminInvite({
        tenantName: tenant.name,
        tenantAdminEmail,
        temporaryPassword,
    });

    // Step 9: Write audit log entry
    // IMPORTANT: Audit log must be written AFTER successful DB insert
    // DO NOT log the temporary password
    await logAuditAction({
        actorId,
        action: 'ISSUE_TENANT_ADMIN_ACCESS',
        metadata: {
            tenant_id: tenantId,
            tenant_name: tenant.name,
            tenant_admin_email: tenantAdminEmail,
            tenant_user_id: tenantUser.id,
            email_sent: emailSent,
        }
    });

    return {
        success: true,
        tenantUser,
        emailSent,
    };
}

/**
 * Check if a tenant has an admin user.
 * Used by UI to show/hide "Create Tenant Admin" button.
 */
export async function getTenantAdminStatus(tenantId: string): Promise<{ hasAdmin: boolean; admin?: TenantUser }> {
    const res = await db.query(
        'SELECT id, tenant_id, email, must_reset_password, status, created_at, invitation_sent_at, last_invitation_sent_at, invitation_count FROM tenant_users WHERE tenant_id = $1',
        [tenantId]
    );

    if (res.rowCount === 0) {
        return { hasAdmin: false };
    }

    return { hasAdmin: true, admin: res.rows[0] as TenantUser };
}

/**
 * Get tenant admin info for multiple tenants (batch query for UI)
 */
export async function getTenantAdminsForTenants(tenantIds: string[]): Promise<Map<string, TenantUser>> {
    if (tenantIds.length === 0) {
        return new Map();
    }

    const res = await db.query(
        `SELECT id, tenant_id, email, must_reset_password, status, created_at, invitation_sent_at, last_invitation_sent_at, invitation_count 
         FROM tenant_users 
         WHERE tenant_id = ANY($1)`,
        [tenantIds]
    );

    const map = new Map<string, TenantUser>();
    for (const row of res.rows) {
        map.set(row.tenant_id, row as TenantUser);
    }

    return map;
}

/**
 * Resend invitation email to a tenant admin.
 * Generates a new temporary password and sends a new invitation.
 * 
 * @param actorId - Super Admin ID
 * @param tenantUserId - ID of the tenant_users record
 */
export async function resendTenantAdminInvitation(
    actorId: string,
    tenantUserId: string
): Promise<{ success: boolean; emailSent: boolean; error?: string; temporaryPassword?: string }> {

    // Get the tenant user record with tenant info
    const userRes = await db.query(
        `SELECT tu.id, tu.tenant_id, tu.email, tu.status, tu.invitation_count,
                t.name as tenant_name, t.status as tenant_status
         FROM tenant_users tu
         JOIN tenants t ON t.id = tu.tenant_id
         WHERE tu.id = $1`,
        [tenantUserId]
    );

    if (userRes.rowCount === 0) {
        return { success: false, emailSent: false, error: 'Tenant admin not found' };
    }

    const record = userRes.rows[0];

    // Validate tenant is active
    if (record.tenant_status !== 'ACTIVE') {
        return { success: false, emailSent: false, error: 'Cannot resend invitation - tenant is suspended' };
    }

    // Validate tenant user is active
    if (record.status !== 'ACTIVE') {
        return { success: false, emailSent: false, error: 'Cannot resend invitation - tenant admin is suspended' };
    }

    // Generate new temporary password
    const temporaryPassword = generateTemporaryPassword();

    // Hash new password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(temporaryPassword, saltRounds);

    // Update password and invitation tracking
    const now = new Date();
    const newCount = (record.invitation_count || 1) + 1;

    await db.query(
        `UPDATE tenant_users 
         SET password_hash = $1, 
             must_reset_password = TRUE,
             last_invitation_sent_at = $2,
             invitation_count = $3
         WHERE id = $4`,
        [passwordHash, now, newCount, tenantUserId]
    );

    // Send invitation email
    const emailSent = await sendTenantAdminInvite({
        tenantName: record.tenant_name,
        tenantAdminEmail: record.email,
        temporaryPassword,
    });

    // Audit log
    await logAuditAction({
        actorId,
        action: 'RESEND_TENANT_ADMIN_INVITATION',
        metadata: {
            tenant_id: record.tenant_id,
            tenant_name: record.tenant_name,
            tenant_admin_email: record.email,
            tenant_user_id: tenantUserId,
            invitation_count: newCount,
            email_sent: emailSent,
        }
    });

    return { success: true, emailSent, temporaryPassword };
}
