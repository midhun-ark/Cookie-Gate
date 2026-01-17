import { query } from '../db';
import { TenantUser, TenantUserSafe, Tenant } from '../types';

/**
 * Repository for tenant user operations.
 * Handles authentication-related database queries.
 */
export const userRepository = {
    /**
     * Find a tenant user by email
     */
    async findByEmail(email: string): Promise<TenantUser | null> {
        const result = await query<TenantUser>(
            `SELECT 
                id, 
                tenant_id as "tenantId", 
                email, 
                password_hash as "passwordHash",
                must_reset_password as "mustResetPassword",
                status,
                created_at as "createdAt"
            FROM tenant_users 
            WHERE email = $1 AND status = 'ACTIVE'`,
            [email.toLowerCase()]
        );
        return result.rows[0] || null;
    },

    /**
     * Find a tenant user by ID
     */
    async findById(id: string): Promise<TenantUser | null> {
        const result = await query<TenantUser>(
            `SELECT 
                id, 
                tenant_id as "tenantId", 
                email, 
                password_hash as "passwordHash",
                must_reset_password as "mustResetPassword",
                status,
                created_at as "createdAt"
            FROM tenant_users 
            WHERE id = $1`,
            [id]
        );
        return result.rows[0] || null;
    },

    /**
     * Get safe user data (without password hash)
     */
    async findByIdSafe(id: string): Promise<TenantUserSafe | null> {
        const result = await query<TenantUserSafe>(
            `SELECT 
                id, 
                tenant_id as "tenantId", 
                email,
                must_reset_password as "mustResetPassword",
                status,
                created_at as "createdAt"
            FROM tenant_users 
            WHERE id = $1`,
            [id]
        );
        return result.rows[0] || null;
    },

    /**
     * Update password
     */
    async updatePassword(userId: string, passwordHash: string): Promise<void> {
        await query(
            `UPDATE tenant_users 
            SET password_hash = $1, must_reset_password = FALSE 
            WHERE id = $2`,
            [passwordHash, userId]
        );
    },

    /**
     * Get tenant by ID
     */
    async getTenant(tenantId: string): Promise<Tenant | null> {
        const result = await query<Tenant>(
            `SELECT 
                id, 
                name, 
                status,
                created_at as "createdAt",
                suspended_at as "suspendedAt"
            FROM tenants 
            WHERE id = $1 AND status = 'ACTIVE'`,
            [tenantId]
        );
        return result.rows[0] || null;
    },
};
