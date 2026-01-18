import { query, withTransaction } from '../db';
import { Purpose, PurposeTranslation, PurposeWithTranslations, PurposeStatus } from '../types';
import { PurposeTranslationInput, CreatePurposeInput, UpdatePurposeInput } from '../validators';
import { PoolClient } from 'pg';

/**
 * Repository for purpose operations.
 */
export const purposeRepository = {
    /**
     * Create purpose with translations in a transaction
     */
    async createWithTranslations(
        websiteId: string,
        input: CreatePurposeInput
    ): Promise<PurposeWithTranslations> {
        return withTransaction(async (client: PoolClient) => {
            // Create the purpose
            const purposeResult = await client.query<Purpose>(
                `INSERT INTO purposes (website_id, is_essential, tag, display_order)
                VALUES ($1, $2, $3, $4)
                RETURNING 
                    id, 
                    website_id as "websiteId",
                    is_essential as "isEssential",
                    tag,
                    status,
                    display_order as "displayOrder",
                    created_at as "createdAt",
                    updated_at as "updatedAt"`,
                [websiteId, input.isEssential, input.tag, input.displayOrder]
            );
            const purpose = purposeResult.rows[0];

            // Create translations
            const translationResults: PurposeTranslation[] = [];
            for (const t of input.translations) {
                const result = await client.query<PurposeTranslation>(
                    `INSERT INTO purpose_translations 
                    (purpose_id, language_code, name, description)
                    VALUES ($1, $2, $3, $4)
                    RETURNING 
                        id,
                        purpose_id as "purposeId",
                        language_code as "languageCode",
                        name,
                        description,
                        created_at as "createdAt",
                        updated_at as "updatedAt"`,
                    [purpose.id, t.languageCode, t.name, t.description]
                );
                translationResults.push(result.rows[0]);
            }

            return {
                ...purpose,
                translations: translationResults,
            };
        });
    },

    /**
     * Find all purposes for a website with translations
     */
    async findByWebsiteId(websiteId: string): Promise<PurposeWithTranslations[]> {
        const purposeResult = await query<Purpose>(
            `SELECT 
                id, 
                website_id as "websiteId",
                is_essential as "isEssential",
                tag,
                status,
                display_order as "displayOrder",
                created_at as "createdAt",
                updated_at as "updatedAt"
            FROM purposes 
            WHERE website_id = $1
            ORDER BY display_order, created_at`,
            [websiteId]
        );

        const purposes: PurposeWithTranslations[] = [];
        for (const purpose of purposeResult.rows) {
            const translations = await this.getTranslations(purpose.id);
            purposes.push({ ...purpose, translations });
        }

        return purposes;
    },

    /**
     * Find purpose by ID
     */
    async findById(id: string): Promise<Purpose | null> {
        const result = await query<Purpose>(
            `SELECT 
                id, 
                website_id as "websiteId",
                is_essential as "isEssential",
                tag,
                status,
                display_order as "displayOrder",
                created_at as "createdAt",
                updated_at as "updatedAt"
            FROM purposes 
            WHERE id = $1`,
            [id]
        );
        return result.rows[0] || null;
    },

    /**
     * Find purpose by ID with translations
     */
    async findByIdWithTranslations(id: string): Promise<PurposeWithTranslations | null> {
        const purpose = await this.findById(id);
        if (!purpose) return null;

        const translations = await this.getTranslations(id);
        return { ...purpose, translations };
    },

    /**
     * Get all translations for a purpose
     */
    async getTranslations(purposeId: string): Promise<PurposeTranslation[]> {
        const result = await query<PurposeTranslation>(
            `SELECT 
                id,
                purpose_id as "purposeId",
                language_code as "languageCode",
                name,
                description,
                created_at as "createdAt",
                updated_at as "updatedAt"
            FROM purpose_translations
            WHERE purpose_id = $1
            ORDER BY language_code`,
            [purposeId]
        );
        return result.rows;
    },

    /**
     * Update purpose
     */
    async update(id: string, input: UpdatePurposeInput): Promise<Purpose | null> {
        // Build dynamic update query
        const updates: string[] = ['updated_at = NOW()'];
        const values: any[] = [];
        let paramIndex = 1;

        if (input.isEssential !== undefined) {
            updates.push(`is_essential = $${paramIndex++}`);
            values.push(input.isEssential);
        }
        if (input.status !== undefined) {
            updates.push(`status = $${paramIndex++}`);
            values.push(input.status);
        }
        if (input.displayOrder !== undefined) {
            updates.push(`display_order = $${paramIndex++}`);
            values.push(input.displayOrder);
        }

        values.push(id);

        const result = await query<Purpose>(
            `UPDATE purposes 
            SET ${updates.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING 
                id, 
                website_id as "websiteId",
                is_essential as "isEssential",
                status,
                display_order as "displayOrder",
                created_at as "createdAt",
                updated_at as "updatedAt"`,
            values
        );
        return result.rows[0] || null;
    },

    /**
     * Upsert (insert or update) a translation
     */
    async upsertTranslation(
        purposeId: string,
        translation: PurposeTranslationInput
    ): Promise<PurposeTranslation> {
        const result = await query<PurposeTranslation>(
            `INSERT INTO purpose_translations 
            (purpose_id, language_code, name, description)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (purpose_id, language_code) 
            DO UPDATE SET 
                name = EXCLUDED.name,
                description = EXCLUDED.description,
                updated_at = NOW()
            RETURNING 
                id,
                purpose_id as "purposeId",
                language_code as "languageCode",
                name,
                description,
                created_at as "createdAt",
                updated_at as "updatedAt"`,
            [purposeId, translation.languageCode, translation.name, translation.description]
        );
        return result.rows[0];
    },

    /**
     * Batch upsert translations
     */
    async upsertTranslations(
        purposeId: string,
        translations: PurposeTranslationInput[]
    ): Promise<PurposeTranslation[]> {
        const results: PurposeTranslation[] = [];
        for (const t of translations) {
            const result = await this.upsertTranslation(purposeId, t);
            results.push(result);
        }
        return results;
    },

    /**
     * Delete a translation (cannot delete English for essential purposes)
     */
    async deleteTranslation(purposeId: string, languageCode: string): Promise<boolean> {
        if (languageCode === 'en') {
            // Check if purpose is essential
            const purpose = await this.findById(purposeId);
            if (purpose?.isEssential) {
                throw new Error('Cannot delete English translation for essential purposes');
            }
        }
        const result = await query(
            `DELETE FROM purpose_translations 
            WHERE purpose_id = $1 AND language_code = $2`,
            [purposeId, languageCode]
        );
        return (result.rowCount ?? 0) > 0;
    },

    /**
     * Check if purpose has English translation
     */
    async hasEnglishTranslation(purposeId: string): Promise<boolean> {
        const result = await query<{ exists: boolean }>(
            `SELECT EXISTS (
                SELECT 1 FROM purpose_translations 
                WHERE purpose_id = $1 AND language_code = 'en'
            ) as exists`,
            [purposeId]
        );
        return result.rows[0].exists;
    },

    /**
     * Get website ID for a purpose
     */
    async getWebsiteId(purposeId: string): Promise<string | null> {
        const result = await query<{ websiteId: string }>(
            `SELECT website_id as "websiteId" FROM purposes WHERE id = $1`,
            [purposeId]
        );
        return result.rows[0]?.websiteId || null;
    },
};
