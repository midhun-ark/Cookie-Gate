/**
 * Privacy Team Repository
 * 
 * Database operations for privacy team members
 */

import { query } from '../db';

export interface PrivacyTeamMember {
    id: string;
    tenantId: string;
    fullName: string;
    email: string;
    role: 'ADMIN' | 'STAFF';
    status: 'ACTIVE' | 'INACTIVE';
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateTeamMemberInput {
    tenantId: string;
    fullName: string;
    email: string;
    role: 'ADMIN' | 'STAFF';
}

export interface UpdateTeamMemberInput {
    fullName?: string;
    email?: string;
    role?: 'ADMIN' | 'STAFF';
}

export const privacyTeamRepository = {
    /**
     * Create a new team member
     */
    async create(input: CreateTeamMemberInput): Promise<PrivacyTeamMember> {
        const result = await query<PrivacyTeamMember>(
            `INSERT INTO privacy_team_members (tenant_id, full_name, email, role)
             VALUES ($1, $2, $3, $4)
             RETURNING 
                id, tenant_id as "tenantId", full_name as "fullName", 
                email, role, status, created_at as "createdAt", updated_at as "updatedAt"`,
            [input.tenantId, input.fullName, input.email, input.role]
        );
        return result.rows[0];
    },

    /**
     * Find all team members for a tenant
     */
    async findByTenant(tenantId: string): Promise<PrivacyTeamMember[]> {
        const result = await query<PrivacyTeamMember>(
            `SELECT 
                id, tenant_id as "tenantId", full_name as "fullName", 
                email, role, status, created_at as "createdAt", updated_at as "updatedAt"
             FROM privacy_team_members
             WHERE tenant_id = $1
             ORDER BY created_at DESC`,
            [tenantId]
        );
        return result.rows;
    },

    /**
     * Find active team members for a tenant (for assignment dropdown)
     */
    async findActiveByTenant(tenantId: string): Promise<PrivacyTeamMember[]> {
        const result = await query<PrivacyTeamMember>(
            `SELECT 
                id, tenant_id as "tenantId", full_name as "fullName", 
                email, role, status, created_at as "createdAt", updated_at as "updatedAt"
             FROM privacy_team_members
             WHERE tenant_id = $1 AND status = 'ACTIVE'
             ORDER BY full_name ASC`,
            [tenantId]
        );
        return result.rows;
    },

    /**
     * Find a team member by ID
     */
    async findById(id: string, tenantId: string): Promise<PrivacyTeamMember | null> {
        const result = await query<PrivacyTeamMember>(
            `SELECT 
                id, tenant_id as "tenantId", full_name as "fullName", 
                email, role, status, created_at as "createdAt", updated_at as "updatedAt"
             FROM privacy_team_members
             WHERE id = $1 AND tenant_id = $2`,
            [id, tenantId]
        );
        return result.rows[0] || null;
    },

    /**
     * Update a team member
     */
    async update(id: string, tenantId: string, input: UpdateTeamMemberInput): Promise<PrivacyTeamMember | null> {
        const result = await query<PrivacyTeamMember>(
            `UPDATE privacy_team_members
             SET 
                full_name = COALESCE($3, full_name),
                email = COALESCE($4, email),
                role = COALESCE($5, role),
                updated_at = NOW()
             WHERE id = $1 AND tenant_id = $2
             RETURNING 
                id, tenant_id as "tenantId", full_name as "fullName", 
                email, role, status, created_at as "createdAt", updated_at as "updatedAt"`,
            [id, tenantId, input.fullName, input.email, input.role]
        );
        return result.rows[0] || null;
    },

    /**
     * Update team member status (active/inactive toggle)
     */
    async updateStatus(id: string, tenantId: string, status: 'ACTIVE' | 'INACTIVE'): Promise<PrivacyTeamMember | null> {
        const result = await query<PrivacyTeamMember>(
            `UPDATE privacy_team_members
             SET status = $3, updated_at = NOW()
             WHERE id = $1 AND tenant_id = $2
             RETURNING 
                id, tenant_id as "tenantId", full_name as "fullName", 
                email, role, status, created_at as "createdAt", updated_at as "updatedAt"`,
            [id, tenantId, status]
        );
        return result.rows[0] || null;
    },

    /**
     * Check if email already exists for tenant
     */
    async emailExists(tenantId: string, email: string, excludeId?: string): Promise<boolean> {
        const params = excludeId
            ? [tenantId, email, excludeId]
            : [tenantId, email];

        const whereClause = excludeId
            ? 'tenant_id = $1 AND email = $2 AND id != $3'
            : 'tenant_id = $1 AND email = $2';

        const result = await query(
            `SELECT 1 FROM privacy_team_members WHERE ${whereClause} LIMIT 1`,
            params
        );
        return result.rows.length > 0;
    },

    /**
     * Delete a team member
     */
    async delete(id: string, tenantId: string): Promise<boolean> {
        const result = await query(
            'DELETE FROM privacy_team_members WHERE id = $1 AND tenant_id = $2',
            [id, tenantId]
        );
        return (result.rowCount ?? 0) > 0;
    },
};
