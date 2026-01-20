import { query, withTransaction } from '../db';
import { Website, WebsiteWithStats, WebsiteStatus } from '../types';
import { PoolClient } from 'pg';

/**
 * Repository for website operations.
 */
export const websiteRepository = {
    /**
     * Create a new website
     */
    async create(tenantId: string, domain: string): Promise<Website> {
        const result = await query<Website>(
            `INSERT INTO websites (tenant_id, domain, status)
            VALUES ($1, $2, 'DRAFT')
            RETURNING 
                id, 
                tenant_id as "tenantId", 
                domain, 
                status,
                created_at as "createdAt",
                updated_at as "updatedAt"`,
            [tenantId, domain.toLowerCase()]
        );
        return result.rows[0];
    },

    /**
     * Find all websites for a tenant
     */
    async findByTenantId(tenantId: string): Promise<Website[]> {
        const result = await query<Website>(
            `SELECT 
                id, 
                tenant_id as "tenantId", 
                domain, 
                status,
                created_at as "createdAt",
                updated_at as "updatedAt"
            FROM websites 
            WHERE tenant_id = $1
            ORDER BY created_at DESC`,
            [tenantId]
        );
        return result.rows;
    },

    /**
     * Find all websites with stats for a tenant
     */
    async findByTenantIdWithStats(tenantId: string): Promise<WebsiteWithStats[]> {
        const result = await query<WebsiteWithStats>(
            `SELECT 
                w.id, 
                w.tenant_id as "tenantId", 
                w.domain, 
                w.status,
                w.created_at as "createdAt",
                w.updated_at as "updatedAt",
                (wn.id IS NOT NULL) as "hasNotice",
                COALESCE(p.purpose_count, 0)::int as "purposeCount",
                (wnt.id IS NOT NULL) as "hasEnglishNotice",
                (bc.id IS NOT NULL) as "hasBanner"
            FROM websites w
            LEFT JOIN website_notices wn ON w.id = wn.website_id
            LEFT JOIN website_notice_translations wnt ON wn.id = wnt.website_notice_id AND wnt.language_code = 'en'
            LEFT JOIN (
                SELECT website_id, COUNT(*) as purpose_count 
                FROM purposes 
                WHERE status = 'ACTIVE'
                GROUP BY website_id
            ) p ON w.id = p.website_id
            LEFT JOIN banner_customizations bc ON w.id = bc.website_id
            WHERE w.tenant_id = $1
            ORDER BY w.created_at DESC`,
            [tenantId]
        );
        return result.rows;
    },

    /**
     * Find website by ID
     */
    async findById(id: string): Promise<Website | null> {
        const result = await query<Website>(
            `SELECT 
                id, 
                tenant_id as "tenantId", 
                domain, 
                status,
                created_at as "createdAt",
                updated_at as "updatedAt"
            FROM websites 
            WHERE id = $1`,
            [id]
        );
        return result.rows[0] || null;
    },

    /**
     * Find website by ID and tenant (authorization check)
     */
    async findByIdAndTenant(id: string, tenantId: string): Promise<Website | null> {
        const result = await query<Website>(
            `SELECT 
                id, 
                tenant_id as "tenantId", 
                domain, 
                status,
                created_at as "createdAt",
                updated_at as "updatedAt"
            FROM websites 
            WHERE id = $1 AND tenant_id = $2`,
            [id, tenantId]
        );
        return result.rows[0] || null;
    },

    /**
     * Update website status
     */
    async updateStatus(id: string, status: WebsiteStatus, client?: PoolClient): Promise<Website | null> {
        const queryFn = client ? client.query.bind(client) : query;
        const result = await queryFn(
            `UPDATE websites 
            SET status = $1, updated_at = NOW()
            WHERE id = $2
            RETURNING 
                id, 
                tenant_id as "tenantId", 
                domain, 
                status,
                created_at as "createdAt",
                updated_at as "updatedAt"`,
            [status, id]
        ) as { rows: Website[] };
        return result.rows[0] || null;
    },

    /**
     * Check if website can be activated (has required components)
     * Checks the active version's data using website_version_id
     */
    async canActivate(websiteId: string): Promise<{
        canActivate: boolean;
        reasons: string[];
    }> {
        const result = await query<{
            hasActiveVersion: boolean;
            hasEnglishNotice: boolean;
            hasAtLeastOnePurpose: boolean;
            allEssentialPurposesHaveEnglish: boolean;
        }>(
            `WITH active_version AS (
                SELECT id FROM website_versions 
                WHERE website_id = $1 
                ORDER BY version_number DESC
                LIMIT 1
            )
            SELECT
                EXISTS (SELECT 1 FROM active_version) as "hasActiveVersion",
                EXISTS (
                    SELECT 1 FROM website_notices wn
                    JOIN website_notice_translations wnt ON wn.id = wnt.website_notice_id
                    WHERE wn.website_version_id = (SELECT id FROM active_version) 
                    AND wnt.language_code = 'en'
                ) as "hasEnglishNotice",
                EXISTS (
                    SELECT 1 FROM purposes 
                    WHERE website_version_id = (SELECT id FROM active_version) 
                    AND status = 'ACTIVE'
                ) as "hasAtLeastOnePurpose",
                NOT EXISTS (
                    SELECT 1 FROM purposes p
                    WHERE p.website_version_id = (SELECT id FROM active_version)
                    AND p.is_essential = TRUE 
                    AND p.status = 'ACTIVE'
                    AND NOT EXISTS (
                        SELECT 1 FROM purpose_translations pt 
                        WHERE pt.purpose_id = p.id AND pt.language_code = 'en'
                    )
                ) as "allEssentialPurposesHaveEnglish"`,
            [websiteId]
        );

        const checks = result.rows[0];
        const reasons: string[] = [];

        if (!checks.hasActiveVersion) {
            reasons.push('No active version found');
        }
        if (!checks.hasEnglishNotice) {
            reasons.push('Notice incomplete. DPO/Grievance Officer Email or Cookie Policy Link missing.');
        }
        if (!checks.hasAtLeastOnePurpose) {
            reasons.push('At least one active purpose is required');
        }
        if (!checks.allEssentialPurposesHaveEnglish) {
            reasons.push('All essential purposes must have English translations');
        }

        return {
            canActivate: reasons.length === 0,
            reasons,
        };
    },

    /**
     * Check if domain already exists for tenant
     */
    async domainExists(tenantId: string, domain: string): Promise<boolean> {
        const result = await query<{ exists: boolean }>(
            `SELECT EXISTS (
                SELECT 1 FROM websites 
                WHERE tenant_id = $1 AND domain = $2
            ) as exists`,
            [tenantId, domain.toLowerCase()]
        );
        return result.rows[0].exists;
    },

    /**
     * Delete website (only if DRAFT)
     */
    async delete(id: string): Promise<boolean> {
        const result = await query(
            `DELETE FROM websites WHERE id = $1 AND status = 'DRAFT'`,
            [id]
        );
        return (result.rowCount ?? 0) > 0;
    },
};
