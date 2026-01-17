import { query } from '../db';
import { BannerCustomization } from '../types';

/**
 * Runtime Configuration Response Types
 */
export interface RuntimeNoticeTranslation {
    title: string;
    description: string;
    policyUrl?: string;
}

export interface RuntimePurpose {
    key: string;
    required: boolean;
    displayOrder: number;
    labels: Record<string, { title: string; description: string }>;
}

export interface RuntimeBannerConfig {
    position: string;
    layout: string;
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
    textColor: string;
    acceptButtonColor: string;
    rejectButtonColor: string;
    acceptButtonText: string;
    rejectButtonText: string;
    customizeButtonText: string;
    fontFamily?: string;
    fontSize?: string;
    focusOutlineColor?: string;
}

export interface RuntimeWebsiteConfig {
    siteId: string;
    defaultLanguage: string;
    supportedLanguages: string[];
    notice: Record<string, RuntimeNoticeTranslation>;
    purposes: RuntimePurpose[];
    banner: RuntimeBannerConfig;
}

/**
 * Runtime Service.
 * Provides read-only configuration for the client-side consent loader.
 * NO BACKEND WRITES - All operations are read-only.
 */
export const runtimeService = {
    /**
     * Get complete website configuration for the loader.
     * Returns null if website doesn't exist or is not ACTIVE.
     * 
     * IMPORTANT: This is a PUBLIC endpoint - no auth required.
     * Only ACTIVE websites should be returned.
     */
    async getWebsiteConfig(siteId: string): Promise<RuntimeWebsiteConfig | null> {
        // 1. Verify website exists and is ACTIVE
        const websiteResult = await query<{ id: string; domain: string; status: string }>(
            `SELECT id, domain, status FROM websites WHERE id = $1`,
            [siteId]
        );

        if (websiteResult.rows.length === 0) {
            console.warn(`[Runtime] Website not found: ${siteId}`);
            return null;
        }

        const website = websiteResult.rows[0];
        if (website.status !== 'ACTIVE') {
            console.warn(`[Runtime] Website not active: ${siteId} (status: ${website.status})`);
            return null;
        }

        // 2. Get notice with all translations
        const notice = await this.getNoticeTranslations(siteId);

        // CRITICAL: English translation MUST exist for fail-safe behavior
        if (!notice || !notice['en']) {
            console.error(`[Runtime] English notice missing for website: ${siteId}. Failing closed.`);
            return null;
        }

        // 3. Get purposes with translations
        const purposes = await this.getPurposesWithTranslations(siteId);

        // CRITICAL: All purposes must have English labels
        for (const purpose of purposes) {
            if (!purpose.labels['en']) {
                console.error(`[Runtime] English label missing for purpose: ${purpose.key}. Failing closed.`);
                return null;
            }
        }

        // 4. Get banner customization
        const banner = await this.getBannerConfig(siteId);

        // 5. Determine supported languages (union of all available translations)
        const supportedLanguages = this.extractSupportedLanguages(notice, purposes);

        return {
            siteId,
            defaultLanguage: 'en', // English is always the default
            supportedLanguages,
            notice,
            purposes,
            banner,
        };
    },

    /**
     * Get notice translations indexed by language code.
     */
    async getNoticeTranslations(siteId: string): Promise<Record<string, RuntimeNoticeTranslation> | null> {
        const result = await query<{
            languageCode: string;
            title: string;
            description: string;
            policyUrl?: string;
        }>(
            `SELECT 
                wnt.language_code as "languageCode",
                wnt.title,
                wnt.description,
                wnt.policy_url as "policyUrl"
            FROM website_notices wn
            JOIN website_notice_translations wnt ON wn.id = wnt.website_notice_id
            WHERE wn.website_id = $1`,
            [siteId]
        );

        if (result.rows.length === 0) {
            return null;
        }

        const translations: Record<string, RuntimeNoticeTranslation> = {};
        for (const row of result.rows) {
            translations[row.languageCode] = {
                title: row.title,
                description: row.description,
                policyUrl: row.policyUrl,
            };
        }

        return translations;
    },

    /**
     * Get purposes with translations indexed by language code.
     */
    async getPurposesWithTranslations(siteId: string): Promise<RuntimePurpose[]> {
        // Get all active purposes
        const purposesResult = await query<{
            id: string;
            isEssential: boolean;
            displayOrder: number;
        }>(
            `SELECT 
                id,
                is_essential as "isEssential",
                display_order as "displayOrder"
            FROM purposes
            WHERE website_id = $1 AND status = 'ACTIVE'
            ORDER BY display_order, created_at`,
            [siteId]
        );

        const purposes: RuntimePurpose[] = [];

        for (const purpose of purposesResult.rows) {
            // Get translations for this purpose
            const translationsResult = await query<{
                languageCode: string;
                name: string;
                description: string;
            }>(
                `SELECT 
                    language_code as "languageCode",
                    name,
                    description
                FROM purpose_translations
                WHERE purpose_id = $1`,
                [purpose.id]
            );

            const labels: Record<string, { title: string; description: string }> = {};
            for (const t of translationsResult.rows) {
                labels[t.languageCode] = {
                    title: t.name,
                    description: t.description,
                };
            }

            purposes.push({
                key: purpose.id,
                required: purpose.isEssential,
                displayOrder: purpose.displayOrder,
                labels,
            });
        }

        return purposes;
    },

    /**
     * Get banner configuration with defaults.
     */
    async getBannerConfig(siteId: string): Promise<RuntimeBannerConfig> {
        const result = await query<BannerCustomization>(
            `SELECT 
                position,
                layout,
                primary_color as "primaryColor",
                secondary_color as "secondaryColor",
                background_color as "backgroundColor",
                text_color as "textColor",
                accept_button_color as "acceptButtonColor",
                reject_button_color as "rejectButtonColor",
                accept_button_text as "acceptButtonText",
                reject_button_text as "rejectButtonText",
                customize_button_text as "customizeButtonText",
                font_family as "fontFamily",
                font_size as "fontSize",
                focus_outline_color as "focusOutlineColor"
            FROM banner_customizations
            WHERE website_id = $1`,
            [siteId]
        );

        // Return custom or default banner config
        if (result.rows.length > 0) {
            const banner = result.rows[0];
            return {
                position: banner.position,
                layout: banner.layout,
                primaryColor: banner.primaryColor,
                secondaryColor: banner.secondaryColor,
                backgroundColor: banner.backgroundColor,
                textColor: banner.textColor,
                acceptButtonColor: banner.acceptButtonColor,
                rejectButtonColor: banner.rejectButtonColor,
                acceptButtonText: banner.acceptButtonText,
                rejectButtonText: banner.rejectButtonText,
                customizeButtonText: banner.customizeButtonText,
                fontFamily: banner.fontFamily,
                fontSize: banner.fontSize,
                focusOutlineColor: banner.focusOutlineColor,
            };
        }

        // Default banner config
        return {
            position: 'bottom',
            layout: 'banner',
            primaryColor: '#0066CC',
            secondaryColor: '#666666',
            backgroundColor: '#FFFFFF',
            textColor: '#333333',
            acceptButtonColor: '#0066CC',
            rejectButtonColor: '#666666',
            acceptButtonText: 'Accept All',
            rejectButtonText: 'Reject All',
            customizeButtonText: 'Settings',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize: '14px',
            focusOutlineColor: '#005299',
        };
    },

    /**
     * Extract supported languages from notice and purposes.
     * A language is supported if it has both notice AND all purpose translations.
     */
    extractSupportedLanguages(
        notice: Record<string, RuntimeNoticeTranslation>,
        purposes: RuntimePurpose[]
    ): string[] {
        // Start with languages that have notice translations
        const noticeLanguages = new Set(Object.keys(notice));

        // A language is fully supported only if ALL essential purposes have translations
        const essentialPurposes = purposes.filter(p => p.required);

        const supportedLanguages: string[] = [];

        for (const lang of noticeLanguages) {
            // Check if all essential purposes have this language
            const allEssentialHaveLang = essentialPurposes.every(
                p => p.labels[lang] !== undefined
            );

            if (allEssentialHaveLang) {
                supportedLanguages.push(lang);
            }
        }

        // English MUST always be included
        if (!supportedLanguages.includes('en')) {
            supportedLanguages.unshift('en');
        }

        // Sort with 'en' first
        return supportedLanguages.sort((a, b) => {
            if (a === 'en') return -1;
            if (b === 'en') return 1;
            return a.localeCompare(b);
        });
    },
};
