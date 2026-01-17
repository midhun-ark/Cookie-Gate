/**
 * Tenant Admin Routes (Super Admin Context Only)
 * 
 * PURPOSE:
 * - Expose tenant admin provisioning via API
 * - All routes require Super Admin authentication
 * 
 * SCOPE:
 * - This is SA-side access issuance ONLY
 * - No tenant login endpoints
 * - No tenant authentication
 * - No password reset
 */

import { FastifyInstance } from 'fastify';
import { requireAuth } from '../middleware/require-auth';
import {
    issueTenantAdminAccess,
    getTenantAdminStatus,
    getTenantAdminsForTenants,
    resendTenantAdminInvitation
} from '../tenant-admin';

export async function tenantAdminRoutes(app: FastifyInstance) {
    // Apply auth guard - Super Admin only
    app.addHook('preHandler', requireAuth);

    /**
     * GET /tenant-admins/:tenantId
     * Check if tenant has an admin
     */
    app.get('/:tenantId', async (req: any, reply) => {
        const { tenantId } = req.params;

        try {
            const result = await getTenantAdminStatus(tenantId);
            return result;
        } catch (err: any) {
            return reply.internalServerError(err.message);
        }
    });

    /**
     * POST /tenant-admins/batch-status
     * Get admin status for multiple tenants (for UI optimization)
     */
    app.post('/batch-status', async (req: any, reply) => {
        const { tenantIds } = req.body || {};

        if (!Array.isArray(tenantIds)) {
            return reply.badRequest('tenantIds must be an array');
        }

        try {
            const adminsMap = await getTenantAdminsForTenants(tenantIds);

            // Convert Map to object for JSON serialization
            const result: Record<string, any> = {};
            for (const [tenantId, admin] of adminsMap) {
                result[tenantId] = admin;
            }

            return { admins: result };
        } catch (err: any) {
            return reply.internalServerError(err.message);
        }
    });

    /**
     * POST /tenant-admins/issue
     * Issue tenant admin access
     * 
     * This is the CORE governance action.
     * 
     * Body:
     * - tenantId: string
     * - email: string
     */
    app.post('/issue', async (req: any, reply) => {
        const { tenantId, email } = req.body || {};

        if (!tenantId || !email) {
            return reply.badRequest('tenantId and email are required');
        }

        try {
            const result = await issueTenantAdminAccess(
                req.admin!.id,
                tenantId,
                email
            );

            if (!result.success) {
                return reply.badRequest(result.error);
            }

            return {
                success: true,
                tenantUser: {
                    id: result.tenantUser!.id,
                    email: result.tenantUser!.email,
                    status: result.tenantUser!.status,
                    created_at: result.tenantUser!.created_at,
                },
                emailSent: result.emailSent,
                message: result.emailSent
                    ? 'Tenant admin access issued. Invitation email sent.'
                    : 'Tenant admin access issued. Email delivery failed - check server logs.'
            };
        } catch (err: any) {
            console.error('[TENANT ADMIN] Issue access failed:', err);
            return reply.internalServerError('Failed to issue tenant admin access');
        }
    });

    /**
     * POST /tenant-admins/resend/:tenantUserId
     * Resend invitation email to tenant admin
     * Generates a new temporary password
     */
    app.post('/resend/:tenantUserId', async (req: any, reply) => {
        const { tenantUserId } = req.params;

        try {
            const result = await resendTenantAdminInvitation(
                req.admin!.id,
                tenantUserId
            );

            if (!result.success) {
                return reply.badRequest(result.error);
            }

            // In development, or if email failed (and password exists), return it for debugging
            const debugPassword = (process.env.NODE_ENV === 'development' || !result.emailSent)
                ? result.temporaryPassword
                : undefined;

            return {
                success: true,
                emailSent: result.emailSent,
                temporaryPassword: debugPassword,
                message: result.emailSent
                    ? 'Invitation resent successfully.'
                    : 'New password generated but email delivery failed. Password included in response for debugging.'
            };
        } catch (err: any) {
            console.error('[TENANT ADMIN] Resend invitation failed:', err);
            return reply.internalServerError('Failed to resend invitation');
        }
    });
}
