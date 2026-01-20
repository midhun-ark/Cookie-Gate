import { query } from '../db';
import { BannerCustomization } from '../types';

/**
 * Runtime Configuration Response Types
 */
export interface RuntimeNoticeTranslation {
    title: string;
    description: string;
    policyLink?: string;
    dpoEmail?: string;
    userRights?: string;
    withdrawalInstructions?: string;
    complaintInstructions?: string;
}

export interface RuntimePurpose {
    key: string;
    required: boolean;
    displayOrder: number;
    labels: Record<string, { title: string; description: string; dataCategoryInfo?: string }>;
}

export interface RuntimeBannerConfig {
    // Styles (language-agnostic)
    position: string;
    layout: string;
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
    textColor: string;
    acceptButtonColor: string;
    rejectButtonColor: string;
    fontFamily?: string;
    fontSize?: string;
    focusOutlineColor?: string;
    // Translations (per language)
    text: Record<string, {
        headline: string;
        description: string;
        acceptButton: string;
        rejectButton: string;
        preferencesButton: string;
    }>;
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
        // 1. Verify website exists and has an ACTIVE version
        const websiteResult = await query<{ id: string; domain: string; status: string; versionId: string }>(
            `SELECT w.id, w.domain, w.status, wv.id as "versionId"
             FROM websites w
             JOIN website_versions wv ON w.id = wv.website_id AND wv.status = 'ACTIVE'
             WHERE w.id = $1`,
            [siteId]
        );

        if (websiteResult.rows.length === 0) {
            console.warn(`[Runtime] Website not found or no active version: ${siteId}`);
            return null;
        }

        const website = websiteResult.rows[0];
        if (website.status !== 'ACTIVE') {
            console.warn(`[Runtime] Website not active: ${siteId} (status: ${website.status})`);
            return null;
        }

        const activeVersionId = website.versionId;
        console.log(`[Runtime] Using active version ${activeVersionId} for website ${siteId}`);

        // 2. Get notice with all translations (from active version)
        const notice = await this.getNoticeTranslations(activeVersionId);

        // CRITICAL: English translation MUST exist for fail-safe behavior
        if (!notice || !notice['en']) {
            console.error(`[Runtime] English notice missing for website: ${siteId}. Failing closed.`);
            return null;
        }

        // 3. Get purposes with translations (from active version)
        const purposes = await this.getPurposesWithTranslations(activeVersionId);

        // CRITICAL: All purposes must have English labels
        for (const purpose of purposes) {
            if (!purpose.labels['en']) {
                console.error(`[Runtime] English label missing for purpose: ${purpose.key}. Failing closed.`);
                return null;
            }
        }

        // 4. Get banner customization (from active version)
        const banner = await this.getBannerConfig(activeVersionId);

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
     * @param versionId - The active website version ID
     */
    async getNoticeTranslations(versionId: string): Promise<Record<string, RuntimeNoticeTranslation> | null> {
        const result = await query<{
            languageCode: string;
            title: string;
            description: string;
            policyUrl?: string;
            dpoEmail?: string;
            rightsDescription?: string;
            withdrawalInstruction?: string;
            complaintInstruction?: string;
        }>(
            `SELECT 
                wnt.language_code as "languageCode",
                wnt.title,
                wnt.description,
                wnt.policy_url as "policyUrl",
                wn.dpo_email as "dpoEmail",
                wnt.rights_description as "rightsDescription",
                wnt.withdrawal_instruction as "withdrawalInstruction",
                wnt.complaint_instruction as "complaintInstruction"
            FROM website_notices wn
            JOIN website_notice_translations wnt ON wn.id = wnt.website_notice_id
            WHERE wn.website_version_id = $1`,
            [versionId]
        );

        if (result.rows.length === 0) {
            return null;
        }

        const translations: Record<string, RuntimeNoticeTranslation> = {};
        for (const row of result.rows) {
            translations[row.languageCode] = {
                title: row.title,
                description: row.description,
                policyLink: row.policyUrl, // Map to policyLink
                dpoEmail: row.dpoEmail,
                userRights: row.rightsDescription,
                withdrawalInstructions: row.withdrawalInstruction,
                complaintInstructions: row.complaintInstruction,
            };
        }

        return translations;
    },

    /**
     * Get purposes with translations indexed by language code.
     * @param versionId - The active website version ID
     */
    async getPurposesWithTranslations(versionId: string): Promise<RuntimePurpose[]> {
        // Get all active purposes - include tag for human-readable purpose keys
        const purposesResult = await query<{
            id: string;
            tag: string;
            isEssential: boolean;
            displayOrder: number;
        }>(
            `SELECT 
                id,
                tag,
                is_essential as "isEssential",
                display_order as "displayOrder"
            FROM purposes
            WHERE website_version_id = $1 AND status = 'ACTIVE'
            ORDER BY display_order, created_at`,
            [versionId]
        );

        const purposes: RuntimePurpose[] = [];

        for (const purpose of purposesResult.rows) {
            // Get translations for this purpose
            const translationsResult = await query<{
                languageCode: string;
                name: string;
                description: string;
                dataCategoryInfo?: string;
            }>(
                `SELECT 
                    language_code as "languageCode",
                    name,
                    description,
                    data_category_info as "dataCategoryInfo"
                FROM purpose_translations
                WHERE purpose_id = $1`,
                [purpose.id]
            );

            const labels: Record<string, { title: string; description: string; dataCategoryInfo?: string }> = {};
            for (const t of translationsResult.rows) {
                labels[t.languageCode] = {
                    title: t.name,
                    description: t.description,
                    dataCategoryInfo: t.dataCategoryInfo,
                };
            }

            // Use human-readable tag as key for script marking (e.g., data-purpose="analytics")
            purposes.push({
                key: purpose.tag,
                required: purpose.isEssential,
                displayOrder: purpose.displayOrder,
                labels,
            });
        }

        return purposes;
    },

    /**
     * Get banner configuration with translations.
     * Styles come from banner_customizations, text from website_banner_translations.
     * @param versionId - The active website version ID
     */
    async getBannerConfig(versionId: string): Promise<RuntimeBannerConfig> {
        // 1. Get styles from banner_customizations
        const stylesResult = await query<{
            position: string;
            layout: string;
            primaryColor: string;
            secondaryColor: string;
            backgroundColor: string;
            textColor: string;
            acceptButtonColor: string;
            rejectButtonColor: string;
            fontFamily?: string;
            fontSize?: string;
            focusOutlineColor?: string;
        }>(
            `SELECT 
                position,
                layout,
                primary_color as "primaryColor",
                secondary_color as "secondaryColor",
                background_color as "backgroundColor",
                text_color as "textColor",
                accept_button_color as "acceptButtonColor",
                reject_button_color as "rejectButtonColor",
                font_family as "fontFamily",
                font_size as "fontSize",
                focus_outline_color as "focusOutlineColor"
            FROM banner_customizations
            WHERE website_version_id = $1`,
            [versionId]
        );

        // 2. Get translations from website_banner_translations
        const translationsResult = await query<{
            languageCode: string;
            headlineText: string;
            descriptionText: string;
            acceptButtonText: string;
            rejectButtonText: string;
            preferencesButtonText: string;
        }>(
            `SELECT 
                language_code as "languageCode",
                headline_text as "headlineText",
                description_text as "descriptionText",
                accept_button_text as "acceptButtonText",
                reject_button_text as "rejectButtonText",
                preferences_button_text as "preferencesButtonText"
            FROM website_banner_translations
            WHERE website_version_id = $1`,
            [versionId]
        );

        // Build text translations object
        const text: Record<string, {
            headline: string;
            description: string;
            acceptButton: string;
            rejectButton: string;
            preferencesButton: string;
        }> = {};

        for (const t of translationsResult.rows) {
            text[t.languageCode] = {
                headline: t.headlineText,
                description: t.descriptionText,
                acceptButton: t.acceptButtonText,
                rejectButton: t.rejectButtonText,
                preferencesButton: t.preferencesButtonText,
            };
        }

        // Default English if no translations exist
        if (!text['en']) {
            text['en'] = {
                headline: 'We use cookies',
                description: 'This website uses cookies to ensure you get the best experience.',
                acceptButton: 'Accept All',
                rejectButton: 'Reject All',
                preferencesButton: 'Settings',
            };
        }

        // Return styles + translations
        if (stylesResult.rows.length > 0) {
            const styles = stylesResult.rows[0];
            return {
                position: styles.position,
                layout: styles.layout,
                primaryColor: styles.primaryColor,
                secondaryColor: styles.secondaryColor,
                backgroundColor: styles.backgroundColor,
                textColor: styles.textColor,
                acceptButtonColor: styles.acceptButtonColor,
                rejectButtonColor: styles.rejectButtonColor,
                fontFamily: styles.fontFamily,
                fontSize: styles.fontSize,
                focusOutlineColor: styles.focusOutlineColor,
                text,
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
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize: '14px',
            focusOutlineColor: '#005299',
            text,
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
        // We relax the strict requirement that ALL essential purposes must be translated.
        // The frontend will fallback to English for missing purpose translations.
        const supportedLanguages = Object.keys(notice);

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
