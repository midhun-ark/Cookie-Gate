import { query } from '../db';
import { BannerCustomization, BannerTranslation } from '../types';
import { BannerCustomizationInput, UpdateBannerCustomizationInput } from '../validators';

/**
 * Repository for banner customization operations.
 */
export const bannerRepository = {
    /**
     * Get banner customization for a website
     */
    async findByWebsiteId(websiteId: string): Promise<BannerCustomization | null> {
        const result = await query<BannerCustomization>(
            `SELECT 
                id,
                website_id as "websiteId",
                primary_color as "primaryColor",
                secondary_color as "secondaryColor",
                background_color as "backgroundColor",
                text_color as "textColor",
                accept_button_color as "acceptButtonColor",
                reject_button_color as "rejectButtonColor",
                accept_button_text as "acceptButtonText",
                reject_button_text as "rejectButtonText",
                customize_button_text as "customizeButtonText",
                position,
                layout,
                font_family as "fontFamily",
                font_size as "fontSize",
                focus_outline_color as "focusOutlineColor",
                created_at as "createdAt",
                updated_at as "updatedAt"
            FROM banner_customizations
            WHERE website_id = $1`,
            [websiteId]
        );
        return result.rows[0] || null;
    },

    /**
     * Create or update banner customization (upsert)
     */
    async upsert(
        websiteId: string,
        input: BannerCustomizationInput
    ): Promise<BannerCustomization> {
        const result = await query<BannerCustomization>(
            `INSERT INTO banner_customizations (
                website_id,
                primary_color,
                secondary_color,
                background_color,
                text_color,
                accept_button_color,
                reject_button_color,
                accept_button_text,
                reject_button_text,
                customize_button_text,
                position,
                layout,
                font_family,
                font_size,
                focus_outline_color
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            ON CONFLICT (website_id) 
            DO UPDATE SET 
                primary_color = EXCLUDED.primary_color,
                secondary_color = EXCLUDED.secondary_color,
                background_color = EXCLUDED.background_color,
                text_color = EXCLUDED.text_color,
                accept_button_color = EXCLUDED.accept_button_color,
                reject_button_color = EXCLUDED.reject_button_color,
                accept_button_text = EXCLUDED.accept_button_text,
                reject_button_text = EXCLUDED.reject_button_text,
                customize_button_text = EXCLUDED.customize_button_text,
                position = EXCLUDED.position,
                layout = EXCLUDED.layout,
                font_family = EXCLUDED.font_family,
                font_size = EXCLUDED.font_size,
                focus_outline_color = EXCLUDED.focus_outline_color,
                updated_at = NOW()
            RETURNING 
                id,
                website_id as "websiteId",
                primary_color as "primaryColor",
                secondary_color as "secondaryColor",
                background_color as "backgroundColor",
                text_color as "textColor",
                accept_button_color as "acceptButtonColor",
                reject_button_color as "rejectButtonColor",
                accept_button_text as "acceptButtonText",
                reject_button_text as "rejectButtonText",
                customize_button_text as "customizeButtonText",
                position,
                layout,
                font_family as "fontFamily",
                font_size as "fontSize",
                focus_outline_color as "focusOutlineColor",
                created_at as "createdAt",
                updated_at as "updatedAt"`,
            [
                websiteId,
                input.primaryColor,
                input.secondaryColor,
                input.backgroundColor,
                input.textColor,
                input.acceptButtonColor,
                input.rejectButtonColor,
                input.acceptButtonText,
                input.rejectButtonText,
                input.customizeButtonText,
                input.position,
                input.layout,
                input.fontFamily,
                input.fontSize,
                input.focusOutlineColor,
            ]
        );
        return result.rows[0];
    },

    /**
     * Partial update banner customization
     */
    async update(
        websiteId: string,
        input: UpdateBannerCustomizationInput
    ): Promise<BannerCustomization | null> {
        // Build dynamic update query
        const updates: string[] = ['updated_at = NOW()'];
        const values: any[] = [];
        let paramIndex = 1;

        const fieldMappings: Record<string, string> = {
            primaryColor: 'primary_color',
            secondaryColor: 'secondary_color',
            backgroundColor: 'background_color',
            textColor: 'text_color',
            acceptButtonColor: 'accept_button_color',
            rejectButtonColor: 'reject_button_color',
            acceptButtonText: 'accept_button_text',
            rejectButtonText: 'reject_button_text',
            customizeButtonText: 'customize_button_text',
            position: 'position',
            layout: 'layout',
            fontFamily: 'font_family',
            fontSize: 'font_size',
            focusOutlineColor: 'focus_outline_color',
        };

        for (const [key, dbColumn] of Object.entries(fieldMappings)) {
            const value = (input as any)[key];
            if (value !== undefined) {
                updates.push(`${dbColumn} = $${paramIndex++}`);
                values.push(value);
            }
        }

        if (updates.length === 1) {
            // Only updated_at, nothing to update
            return this.findByWebsiteId(websiteId);
        }

        values.push(websiteId);

        const result = await query<BannerCustomization>(
            `UPDATE banner_customizations 
            SET ${updates.join(', ')}
            WHERE website_id = $${paramIndex}
            RETURNING 
                id,
                website_id as "websiteId",
                primary_color as "primaryColor",
                secondary_color as "secondaryColor",
                background_color as "backgroundColor",
                text_color as "textColor",
                accept_button_color as "acceptButtonColor",
                reject_button_color as "rejectButtonColor",
                accept_button_text as "acceptButtonText",
                reject_button_text as "rejectButtonText",
                customize_button_text as "customizeButtonText",
                position,
                layout,
                font_family as "fontFamily",
                font_size as "fontSize",
                focus_outline_color as "focusOutlineColor",
                created_at as "createdAt",
                updated_at as "updatedAt"`,
            values
        );
        return result.rows[0] || null;
    },

    /**
     * Get default banner configuration
     */
    getDefaults(): BannerCustomizationInput {
        return {
            primaryColor: '#0066CC',
            secondaryColor: '#666666',
            backgroundColor: '#FFFFFF',
            textColor: '#333333',
            acceptButtonColor: '#0066CC',
            rejectButtonColor: '#0066CC',
            acceptButtonText: 'Accept All',
            rejectButtonText: 'Reject All',
            customizeButtonText: 'Customize',
            position: 'bottom',
            layout: 'banner',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize: '14px',
            focusOutlineColor: '#005299',
        };
    },

    // ==================== Translation Methods ====================

    /**
     * Get all translations for a website's banner
     */
    async getTranslations(websiteId: string): Promise<BannerTranslation[]> {
        const result = await query<BannerTranslation>(
            `SELECT 
                id,
                website_id as "websiteId",
                language_code as "languageCode",
                headline_text as "headlineText",
                description_text as "descriptionText",
                accept_button_text as "acceptButtonText",
                reject_button_text as "rejectButtonText",
                preferences_button_text as "preferencesButtonText",
                created_at as "createdAt",
                updated_at as "updatedAt"
            FROM website_banner_translations
            WHERE website_id = $1
            ORDER BY CASE WHEN language_code = 'en' THEN 0 ELSE 1 END, language_code`,
            [websiteId]
        );
        return result.rows;
    },

    /**
     * Get translation for a specific language
     */
    async getTranslation(websiteId: string, languageCode: string): Promise<BannerTranslation | null> {
        const result = await query<BannerTranslation>(
            `SELECT 
                id,
                website_id as "websiteId",
                language_code as "languageCode",
                headline_text as "headlineText",
                description_text as "descriptionText",
                accept_button_text as "acceptButtonText",
                reject_button_text as "rejectButtonText",
                preferences_button_text as "preferencesButtonText",
                created_at as "createdAt",
                updated_at as "updatedAt"
            FROM website_banner_translations
            WHERE website_id = $1 AND language_code = $2`,
            [websiteId, languageCode]
        );
        return result.rows[0] || null;
    },

    /**
     * Upsert a banner translation
     */
    async upsertTranslation(
        websiteId: string,
        languageCode: string,
        input: {
            headlineText: string;
            descriptionText: string;
            acceptButtonText: string;
            rejectButtonText: string;
            preferencesButtonText: string;
        }
    ): Promise<BannerTranslation> {
        const result = await query<BannerTranslation>(
            `INSERT INTO website_banner_translations (
                website_id, language_code, headline_text, description_text,
                accept_button_text, reject_button_text, preferences_button_text
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (website_id, language_code)
            DO UPDATE SET
                headline_text = EXCLUDED.headline_text,
                description_text = EXCLUDED.description_text,
                accept_button_text = EXCLUDED.accept_button_text,
                reject_button_text = EXCLUDED.reject_button_text,
                preferences_button_text = EXCLUDED.preferences_button_text,
                updated_at = NOW()
            RETURNING 
                id,
                website_id as "websiteId",
                language_code as "languageCode",
                headline_text as "headlineText",
                description_text as "descriptionText",
                accept_button_text as "acceptButtonText",
                reject_button_text as "rejectButtonText",
                preferences_button_text as "preferencesButtonText",
                created_at as "createdAt",
                updated_at as "updatedAt"`,
            [
                websiteId,
                languageCode,
                input.headlineText,
                input.descriptionText,
                input.acceptButtonText,
                input.rejectButtonText,
                input.preferencesButtonText,
            ]
        );
        return result.rows[0];
    },

    /**
     * Get default banner text translations
     */
    getDefaultTranslation(): {
        headlineText: string;
        descriptionText: string;
        acceptButtonText: string;
        rejectButtonText: string;
        preferencesButtonText: string;
    } {
        return {
            headlineText: 'We use cookies',
            descriptionText: 'This website uses cookies to ensure you get the best experience.',
            acceptButtonText: 'Accept All',
            rejectButtonText: 'Reject All',
            preferencesButtonText: 'Settings',
        };
    },
};
