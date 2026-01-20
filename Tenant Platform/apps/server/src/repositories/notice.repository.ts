import { query, withTransaction } from '../db';
import { WebsiteNotice, NoticeTranslation, WebsiteNoticeWithTranslations } from '../types';
import { NoticeTranslationInput } from '../validators';
import { PoolClient } from 'pg';

/**
 * Repository for notice operations.
 * Note: Notices are now tied to website_versions, not websites directly.
 */
export const noticeRepository = {
    /**
     * Create notice with translations in a transaction
     */
    async createWithTranslations(
        versionId: string,
        translations: NoticeTranslationInput[],
        dpoEmail?: string
    ): Promise<WebsiteNoticeWithTranslations> {
        return withTransaction(async (client: PoolClient) => {
            // Create the notice
            const noticeResult = await client.query<WebsiteNotice>(
                `INSERT INTO website_notices (website_version_id, dpo_email)
                VALUES ($1, $2)
                RETURNING 
                    id, 
                    website_version_id as "versionId",
                    dpo_email as "dpoEmail",
                    created_at as "createdAt",
                    updated_at as "updatedAt"`,
                [versionId, dpoEmail]
            );
            const notice = noticeResult.rows[0];

            // Create translations
            const translationResults: NoticeTranslation[] = [];
            for (const t of translations) {
                const result = await client.query<NoticeTranslation>(
                    `INSERT INTO website_notice_translations 
                    (website_notice_id, language_code, title, description, policy_url, data_categories, processing_purposes, rights_description, withdrawal_instruction, complaint_instruction)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                    RETURNING 
                        id,
                        website_notice_id as "websiteNoticeId",
                        language_code as "languageCode",
                        title,
                        description,
                        policy_url as "policyUrl",
                        data_categories as "dataCategories",
                        processing_purposes as "processingPurposes",
                        rights_description as "rightsDescription",
                        withdrawal_instruction as "withdrawalInstruction",
                        complaint_instruction as "complaintInstruction",
                        created_at as "createdAt",
                        updated_at as "updatedAt"`,
                    [notice.id, t.languageCode, t.title, t.description, t.policyUrl, t.dataCategories, t.processingPurposes, t.rightsDescription, t.withdrawalInstruction, t.complaintInstruction]
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
     * Update notice fields
     */
    async update(id: string, data: { dpoEmail?: string }): Promise<WebsiteNotice | null> {
        const result = await query<WebsiteNotice>(
            `UPDATE website_notices
            SET dpo_email = COALESCE($2, dpo_email),
                updated_at = NOW()
            WHERE id = $1
            RETURNING 
                id, 
                website_version_id as "versionId",
                dpo_email as "dpoEmail",
                created_at as "createdAt",
                updated_at as "updatedAt"`,
            [id, data.dpoEmail]
        );
        return result.rows[0] || null;
    },

    /**
     * Find notice by version ID with translations
     */
    async findByVersionId(versionId: string): Promise<WebsiteNoticeWithTranslations | null> {
        const noticeResult = await query<WebsiteNotice>(
            `SELECT 
                id, 
                website_version_id as "versionId",
                dpo_email as "dpoEmail",
                created_at as "createdAt",
                updated_at as "updatedAt"
            FROM website_notices 
            WHERE website_version_id = $1`,
            [versionId]
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
                website_version_id as "versionId",
                dpo_email as "dpoEmail",
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
                data_categories as "dataCategories",
                processing_purposes as "processingPurposes",
                rights_description as "rightsDescription",
                withdrawal_instruction as "withdrawalInstruction",
                complaint_instruction as "complaintInstruction",
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
            (website_notice_id, language_code, title, description, policy_url, data_categories, processing_purposes, rights_description, withdrawal_instruction, complaint_instruction)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (website_notice_id, language_code) 
            DO UPDATE SET 
                title = EXCLUDED.title,
                description = EXCLUDED.description,
                policy_url = EXCLUDED.policy_url,
                data_categories = EXCLUDED.data_categories,
                processing_purposes = EXCLUDED.processing_purposes,
                rights_description = EXCLUDED.rights_description,
                withdrawal_instruction = EXCLUDED.withdrawal_instruction,
                complaint_instruction = EXCLUDED.complaint_instruction,
                updated_at = NOW()
            RETURNING 
                id,
                website_notice_id as "websiteNoticeId",
                language_code as "languageCode",
                title,
                description,
                policy_url as "policyUrl",
                data_categories as "dataCategories",
                processing_purposes as "processingPurposes",
                rights_description as "rightsDescription",
                withdrawal_instruction as "withdrawalInstruction",
                complaint_instruction as "complaintInstruction",
                created_at as "createdAt",
                updated_at as "updatedAt"`,
            [noticeId, translation.languageCode, translation.title, translation.description, translation.policyUrl, translation.dataCategories, translation.processingPurposes, translation.rightsDescription, translation.withdrawalInstruction, translation.complaintInstruction]
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
     * Check if notice exists for version
     */
    async existsForVersion(versionId: string): Promise<boolean> {
        const result = await query<{ exists: boolean }>(
            `SELECT EXISTS (
                SELECT 1 FROM website_notices 
                WHERE website_version_id = $1
            ) as exists`,
            [versionId]
        );
        return result.rows[0].exists;
    },
};
