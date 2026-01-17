import { query } from '../db';
import { SupportedLanguage } from '../types';

/**
 * Repository for language operations.
 */
export const languageRepository = {
    /**
     * Get all active supported languages
     */
    async findAll(): Promise<SupportedLanguage[]> {
        const result = await query<SupportedLanguage>(
            `SELECT 
                code,
                name,
                native_name as "nativeName",
                is_rtl as "isRtl",
                is_active as "isActive",
                created_at as "createdAt"
            FROM supported_languages
            WHERE is_active = TRUE
            ORDER BY 
                CASE WHEN code = 'en' THEN 0 ELSE 1 END,
                name`,
            []
        );
        return result.rows;
    },

    /**
     * Get language by code
     */
    async findByCode(code: string): Promise<SupportedLanguage | null> {
        const result = await query<SupportedLanguage>(
            `SELECT 
                code,
                name,
                native_name as "nativeName",
                is_rtl as "isRtl",
                is_active as "isActive",
                created_at as "createdAt"
            FROM supported_languages
            WHERE code = $1`,
            [code]
        );
        return result.rows[0] || null;
    },

    /**
     * Check if language code is valid
     */
    async isValidLanguageCode(code: string): Promise<boolean> {
        const result = await query<{ exists: boolean }>(
            `SELECT EXISTS (
                SELECT 1 FROM supported_languages 
                WHERE code = $1 AND is_active = TRUE
            ) as exists`,
            [code]
        );
        return result.rows[0].exists;
    },
};
