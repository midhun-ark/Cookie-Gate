import { query, withTransaction } from '../db';
import { WebsiteNotice, NoticeTranslation, WebsiteNoticeWithTranslations } from '../types';
import { NoticeTranslationInput } from '../validators';
import { PoolClient } from 'pg';

/**
 * Repository for notice operations.
 */
export const noticeRepository = {
    /**
     * Create notice with translations in a transaction
     */
    async createWithTranslations(
        websiteId: string,
        translations: NoticeTranslationInput[]
    ): Promise<WebsiteNoticeWithTranslations> {
        return withTransaction(async (client: PoolClient) => {
            // Create the notice
            const noticeResult = await client.query<WebsiteNotice>(
                `INSERT INTO website_notices (website_id)
                VALUES ($1)
                RETURNING 
                    id, 
                    website_id as "websiteId",
                    created_at as "createdAt",
                    updated_at as "updatedAt"`,
                [websiteId]
            );
            const notice = noticeResult.rows[0];

            // Create translations
            const translationResults: NoticeTranslation[] = [];
            for (const t of translations) {
                const result = await client.query<NoticeTranslation>(
                    `INSERT INTO website_notice_translations 
                    (website_notice_id, language_code, title, description, policy_url)
                    VALUES ($1, $2, $3, $4, $5)
                    RETURNING 
                        id,
                        website_notice_id as "websiteNoticeId",
                        language_code as "languageCode",
                        title,
                        description,
                        policy_url as "policyUrl",
                        created_at as "createdAt",
                        updated_at as "updatedAt"`,
                    [notice.id, t.languageCode, t.title, t.description, t.policyUrl]
                );
                translationResults.push(result.rows[0]);
            }

            return {
                ...notice,
                translations: translationResults,
            };
        });
    },

    /**
     * Find notice by website ID with translations
     */
    async findByWebsiteId(websiteId: string): Promise<WebsiteNoticeWithTranslations | null> {
        const noticeResult = await query<WebsiteNotice>(
            `SELECT 
                id, 
                website_id as "websiteId",
                created_at as "createdAt",
                updated_at as "updatedAt"
            FROM website_notices 
            WHERE website_id = $1`,
            [websiteId]
        );

        if (noticeResult.rows.length === 0) {
            return null;
        }

        const notice = noticeResult.rows[0];
        const translations = await this.getTranslations(notice.id);

        return {
            ...notice,
            translations,
        };
    },

    /**
     * Find notice by ID
     */
    async findById(id: string): Promise<WebsiteNotice | null> {
        const result = await query<WebsiteNotice>(
            `SELECT 
                id, 
                website_id as "websiteId",
                created_at as "createdAt",
                updated_at as "updatedAt"
            FROM website_notices 
            WHERE id = $1`,
            [id]
        );
        return result.rows[0] || null;
    },

    /**
     * Get all translations for a notice
     */
    async getTranslations(noticeId: string): Promise<NoticeTranslation[]> {
        const result = await query<NoticeTranslation>(
            `SELECT 
                id,
                website_notice_id as "websiteNoticeId",
                language_code as "languageCode",
                title,
                description,
                policy_url as "policyUrl",
                created_at as "createdAt",
                updated_at as "updatedAt"
            FROM website_notice_translations
            WHERE website_notice_id = $1
            ORDER BY language_code`,
            [noticeId]
        );
        return result.rows;
    },

    /**
     * Upsert (insert or update) a translation
     */
    async upsertTranslation(
        noticeId: string,
        translation: NoticeTranslationInput
    ): Promise<NoticeTranslation> {
        const result = await query<NoticeTranslation>(
            `INSERT INTO website_notice_translations 
            (website_notice_id, language_code, title, description, policy_url)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (website_notice_id, language_code) 
            DO UPDATE SET 
                title = EXCLUDED.title,
                description = EXCLUDED.description,
                policy_url = EXCLUDED.policy_url,
                updated_at = NOW()
            RETURNING 
                id,
                website_notice_id as "websiteNoticeId",
                language_code as "languageCode",
                title,
                description,
                policy_url as "policyUrl",
                created_at as "createdAt",
                updated_at as "updatedAt"`,
            [noticeId, translation.languageCode, translation.title, translation.description, translation.policyUrl]
        );
        return result.rows[0];
    },

    /**
     * Delete a translation (cannot delete English)
     */
    async deleteTranslation(noticeId: string, languageCode: string): Promise<boolean> {
        if (languageCode === 'en') {
            throw new Error('Cannot delete English translation');
        }
        const result = await query(
            `DELETE FROM website_notice_translations 
            WHERE website_notice_id = $1 AND language_code = $2`,
            [noticeId, languageCode]
        );
        return (result.rowCount ?? 0) > 0;
    },

    /**
     * Check if notice has English translation
     */
    async hasEnglishTranslation(noticeId: string): Promise<boolean> {
        const result = await query<{ exists: boolean }>(
            `SELECT EXISTS (
                SELECT 1 FROM website_notice_translations 
                WHERE website_notice_id = $1 AND language_code = 'en'
            ) as exists`,
            [noticeId]
        );
        return result.rows[0].exists;
    },

    /**
     * Check if notice exists for website
     */
    async existsForWebsite(websiteId: string): Promise<boolean> {
        const result = await query<{ exists: boolean }>(
            `SELECT EXISTS (
                SELECT 1 FROM website_notices 
                WHERE website_id = $1
            ) as exists`,
            [websiteId]
        );
        return result.rows[0].exists;
    },
};
