import { query, withTransaction } from '../db';
import { WebsiteVersion, WebsiteVersionWithStats, VersionStatus } from '../types';
import { PoolClient } from 'pg';

/**
 * Repository for website version operations.
 */
export const versionRepository = {
    /**
     * Create a new version for a website
     */
    async create(
        websiteId: string,
        versionNumber: number,
        versionName?: string,
        client?: PoolClient
    ): Promise<WebsiteVersion> {
        const queryFn = client ? client.query.bind(client) : query;
        const result = await queryFn(
            `INSERT INTO website_versions (website_id, version_number, version_name, status)
            VALUES ($1, $2, $3, 'DRAFT')
            RETURNING 
                id, 
                website_id as "websiteId", 
                version_number as "versionNumber",
                version_name as "versionName",
                status,
                created_at as "createdAt",
                updated_at as "updatedAt"`,
            [websiteId, versionNumber, versionName || null]
        );
        return result.rows[0];
    },

    /**
     * Find all versions for a website
     */
    async findByWebsiteId(websiteId: string): Promise<WebsiteVersionWithStats[]> {
        const result = await query<WebsiteVersionWithStats>(
            `SELECT 
                v.id, 
                v.website_id as "websiteId", 
                v.version_number as "versionNumber",
                v.version_name as "versionName",
                v.status,
                v.created_at as "createdAt",
                v.updated_at as "updatedAt",
                (wn.id IS NOT NULL) as "hasNotice",
                COALESCE(p.purpose_count, 0)::int as "purposeCount",
                (wnt.id IS NOT NULL) as "hasEnglishNotice",
                (bc.id IS NOT NULL) as "hasBanner"
            FROM website_versions v
            LEFT JOIN website_notices wn ON v.id = wn.website_version_id
            LEFT JOIN website_notice_translations wnt ON wn.id = wnt.website_notice_id AND wnt.language_code = 'en'
            LEFT JOIN (
                SELECT website_version_id, COUNT(*) as purpose_count 
                FROM purposes 
                WHERE status = 'ACTIVE'
                GROUP BY website_version_id
            ) p ON v.id = p.website_version_id
            LEFT JOIN banner_customizations bc ON v.id = bc.website_version_id
            WHERE v.website_id = $1
            ORDER BY v.version_number DESC`,
            [websiteId]
        );
        return result.rows;
    },

    /**
     * Find active version for a website
     */
    async findActiveByWebsiteId(websiteId: string): Promise<WebsiteVersion | null> {
        const result = await query<WebsiteVersion>(
            `SELECT 
                id, 
                website_id as "websiteId", 
                version_number as "versionNumber",
                version_name as "versionName",
                status,
                created_at as "createdAt",
                updated_at as "updatedAt"
            FROM website_versions 
            WHERE website_id = $1 AND status = 'ACTIVE'`,
            [websiteId]
        );
        return result.rows[0] || null;
    },

    /**
     * Find version by ID
     */
    async findById(id: string): Promise<WebsiteVersion | null> {
        const result = await query<WebsiteVersion>(
            `SELECT 
                id, 
                website_id as "websiteId", 
                version_number as "versionNumber",
                version_name as "versionName",
                status,
                created_at as "createdAt",
                updated_at as "updatedAt"
            FROM website_versions 
            WHERE id = $1`,
            [id]
        );
        return result.rows[0] || null;
    },

    /**
     * Find version by ID with website tenant check
     */
    async findByIdAndTenant(id: string, tenantId: string): Promise<WebsiteVersion | null> {
        const result = await query<WebsiteVersion>(
            `SELECT 
                v.id, 
                v.website_id as "websiteId", 
                v.version_number as "versionNumber",
                v.version_name as "versionName",
                v.status,
                v.created_at as "createdAt",
                v.updated_at as "updatedAt"
            FROM website_versions v
            JOIN websites w ON v.website_id = w.id
            WHERE v.id = $1 AND w.tenant_id = $2`,
            [id, tenantId]
        );
        return result.rows[0] || null;
    },

    /**
     * Get the next version number for a website
     */
    async getNextVersionNumber(websiteId: string, client?: PoolClient): Promise<number> {
        const queryFn = client ? client.query.bind(client) : query;
        const result = await queryFn(
            `SELECT COALESCE(MAX(version_number), 0) + 1 as next
            FROM website_versions 
            WHERE website_id = $1`,
            [websiteId]
        );
        return result.rows[0].next;
    },

    /**
     * Update version name
     */
    async updateName(id: string, versionName: string): Promise<WebsiteVersion | null> {
        const result = await query<WebsiteVersion>(
            `UPDATE website_versions 
            SET version_name = $1, updated_at = NOW()
            WHERE id = $2
            RETURNING 
                id, 
                website_id as "websiteId", 
                version_number as "versionNumber",
                version_name as "versionName",
                status,
                created_at as "createdAt",
                updated_at as "updatedAt"`,
            [versionName, id]
        );
        return result.rows[0] || null;
    },

    /**
     * Update version status
     */
    async updateStatus(id: string, status: VersionStatus, client?: PoolClient): Promise<WebsiteVersion | null> {
        const queryFn = client ? client.query.bind(client) : query;
        const result = await queryFn(
            `UPDATE website_versions 
            SET status = $1, updated_at = NOW()
            WHERE id = $2
            RETURNING 
                id, 
                website_id as "websiteId", 
                version_number as "versionNumber",
                version_name as "versionName",
                status,
                created_at as "createdAt",
                updated_at as "updatedAt"`,
            [status, id]
        );
        return result.rows[0] || null;
    },

    /**
     * Archive all active versions for a website (before activating a new one)
     */
    async archiveActiveVersions(websiteId: string, client?: PoolClient): Promise<void> {
        const queryFn = client ? client.query.bind(client) : query;
        await queryFn(
            `UPDATE website_versions 
            SET status = 'ARCHIVED', updated_at = NOW()
            WHERE website_id = $1 AND status = 'ACTIVE'`,
            [websiteId]
        );
    },

    /**
     * Copy all data from source version to target version
     * Includes: notice, notice translations, purposes, purpose translations, 
     * banner customization, banner translations
     */
    async copyVersionData(sourceVersionId: string, targetVersionId: string, client?: PoolClient): Promise<void> {
        const queryFn = client ? client.query.bind(client) : query;

        // Copy notice and get mapping
        const noticeResult = await queryFn(
            `INSERT INTO website_notices (website_version_id, dpo_email)
            SELECT $2, dpo_email
            FROM website_notices
            WHERE website_version_id = $1
            RETURNING id`,
            [sourceVersionId, targetVersionId]
        );

        // Copy notice translations if notice was copied
        if (noticeResult.rows.length > 0) {
            const newNoticeId = noticeResult.rows[0].id;
            await queryFn(
                `INSERT INTO website_notice_translations 
                    (website_notice_id, language_code, title, description, policy_url,
                     data_categories, processing_purposes, rights_description,
                     withdrawal_instruction, complaint_instruction)
                SELECT $2, language_code, title, description, policy_url,
                       data_categories, processing_purposes, rights_description,
                       withdrawal_instruction, complaint_instruction
                FROM website_notice_translations wnt
                JOIN website_notices wn ON wnt.website_notice_id = wn.id
                WHERE wn.website_version_id = $1`,
                [sourceVersionId, newNoticeId]
            );
        }

        // Copy purposes with translations
        // First get source purposes
        const purposesResult = await queryFn(
            `SELECT id, tag, is_essential, status, display_order
            FROM purposes
            WHERE website_version_id = $1`,
            [sourceVersionId]
        );

        for (const sourcePurpose of purposesResult.rows) {
            // Create new purpose
            const newPurposeResult = await queryFn(
                `INSERT INTO purposes (website_version_id, tag, is_essential, status, display_order)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id`,
                [targetVersionId, sourcePurpose.tag, sourcePurpose.is_essential, sourcePurpose.status, sourcePurpose.display_order]
            );
            const newPurposeId = newPurposeResult.rows[0].id;

            // Copy purpose translations
            await queryFn(
                `INSERT INTO purpose_translations (purpose_id, language_code, name, description, data_category_info)
                SELECT $2, language_code, name, description, data_category_info
                FROM purpose_translations
                WHERE purpose_id = $1`,
                [sourcePurpose.id, newPurposeId]
            );
        }

        // Copy banner customization
        await queryFn(
            `INSERT INTO banner_customizations 
                (website_version_id, primary_color, secondary_color, background_color, text_color,
                 accept_button_color, reject_button_color, accept_button_text, reject_button_text,
                 customize_button_text, position, layout, font_family, font_size, focus_outline_color)
            SELECT $2, primary_color, secondary_color, background_color, text_color,
                   accept_button_color, reject_button_color, accept_button_text, reject_button_text,
                   customize_button_text, position, layout, font_family, font_size, focus_outline_color
            FROM banner_customizations
            WHERE website_version_id = $1`,
            [sourceVersionId, targetVersionId]
        );

        // Copy banner translations
        await queryFn(
            `INSERT INTO website_banner_translations 
                (website_version_id, language_code, headline_text, description_text,
                 accept_button_text, reject_button_text, preferences_button_text)
            SELECT $2, language_code, headline_text, description_text,
                   accept_button_text, reject_button_text, preferences_button_text
            FROM website_banner_translations
            WHERE website_version_id = $1`,
            [sourceVersionId, targetVersionId]
        );
    },

    /**
     * Create initial version with default Essential purpose
     */
    async createInitialVersion(websiteId: string, client?: PoolClient): Promise<WebsiteVersion> {
        const queryFn = client ? client.query.bind(client) : query;

        // Create version 1
        const version = await this.create(websiteId, 1, 'Version 1', client);

        // Create Essential purpose with English translation
        const purposeResult = await queryFn(
            `INSERT INTO purposes (website_version_id, tag, is_essential, status, display_order)
            VALUES ($1, 'essential', TRUE, 'ACTIVE', 0)
            RETURNING id`,
            [version.id]
        );

        const purposeId = purposeResult.rows[0].id;

        // Add English translation for Essential purpose
        await queryFn(
            `INSERT INTO purpose_translations (purpose_id, language_code, name, description)
            VALUES ($1, 'en', 'Necessary', 'These cookies are necessary for the website to function and cannot be switched off.')`,
            [purposeId]
        );

        // Return the draft version - user must activate manually
        return version;
    },
};
