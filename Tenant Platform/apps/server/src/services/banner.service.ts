import { bannerRepository, websiteRepository, auditRepository } from '../repositories';
import { BannerCustomization } from '../types';
import { BannerCustomizationInput, UpdateBannerCustomizationInput } from '../validators';

/**
 * Banner Customization Service.
 * Handles guarded banner customization with dark pattern prevention.
 */
export const bannerService = {
    /**
     * Get banner customization for a website
     * Returns defaults if not customized
     */
    async getByWebsiteId(
        websiteId: string,
        tenantId: string
    ): Promise<BannerCustomization | null> {
        // Verify website ownership
        const website = await websiteRepository.findByIdAndTenant(websiteId, tenantId);
        if (!website) {
            throw new Error('Website not found');
        }

        const banner = await bannerRepository.findByWebsiteId(websiteId);
        return banner;
    },

    /**
     * Get banner with defaults merged
     */
    async getWithDefaults(
        websiteId: string,
        tenantId: string
    ): Promise<BannerCustomizationInput> {
        const banner = await this.getByWebsiteId(websiteId, tenantId);
        const defaults = bannerRepository.getDefaults();

        if (!banner) {
            return defaults;
        }

        // Merge with defaults for any missing optional fields
        return {
            primaryColor: banner.primaryColor,
            secondaryColor: banner.secondaryColor,
            backgroundColor: banner.backgroundColor,
            textColor: banner.textColor,
            acceptButtonColor: banner.acceptButtonColor,
            rejectButtonColor: banner.rejectButtonColor,
            acceptButtonText: banner.acceptButtonText,
            rejectButtonText: banner.rejectButtonText,
            customizeButtonText: banner.customizeButtonText,
            position: banner.position,
            layout: banner.layout,
            fontFamily: banner.fontFamily || defaults.fontFamily,
            fontSize: banner.fontSize || defaults.fontSize,
            focusOutlineColor: banner.focusOutlineColor || defaults.focusOutlineColor,
        };
    },

    /**
     * Create or update banner customization
     */
    async upsert(
        websiteId: string,
        tenantId: string,
        actorId: string,
        input: BannerCustomizationInput,
        requestInfo: { ipAddress?: string; userAgent?: string }
    ): Promise<BannerCustomization> {
        // Verify website ownership
        const website = await websiteRepository.findByIdAndTenant(websiteId, tenantId);
        if (!website) {
            throw new Error('Website not found');
        }

        // Additional dark pattern prevention checks (beyond Zod validation)
        this.validateDarkPatternPrevention(input);

        // Get existing banner to determine if create or update
        const existing = await bannerRepository.findByWebsiteId(websiteId);
        const isCreate = !existing;

        // Upsert banner
        const banner = await bannerRepository.upsert(websiteId, input);

        // Audit log
        await auditRepository.create(
            tenantId,
            actorId,
            isCreate ? 'BANNER_CREATED' : 'BANNER_UPDATED',
            {
                resourceType: 'banner',
                resourceId: banner.id,
                metadata: {
                    websiteId,
                    changes: input,
                },
                ipAddress: requestInfo.ipAddress,
                userAgent: requestInfo.userAgent,
            }
        );

        return banner;
    },

    /**
     * Partial update banner customization
     */
    async update(
        websiteId: string,
        tenantId: string,
        actorId: string,
        input: UpdateBannerCustomizationInput,
        requestInfo: { ipAddress?: string; userAgent?: string }
    ): Promise<BannerCustomization> {
        // Verify website ownership
        const website = await websiteRepository.findByIdAndTenant(websiteId, tenantId);
        if (!website) {
            throw new Error('Website not found');
        }

        // Get current banner to merge for validation
        const current = await bannerRepository.findByWebsiteId(websiteId);
        if (!current) {
            throw new Error('Banner not found. Create a banner first.');
        }

        // Merge with current values for validation
        const merged: BannerCustomizationInput = {
            primaryColor: input.primaryColor ?? current.primaryColor,
            secondaryColor: input.secondaryColor ?? current.secondaryColor,
            backgroundColor: input.backgroundColor ?? current.backgroundColor,
            textColor: input.textColor ?? current.textColor,
            acceptButtonColor: input.acceptButtonColor ?? current.acceptButtonColor,
            rejectButtonColor: input.rejectButtonColor ?? current.rejectButtonColor,
            acceptButtonText: input.acceptButtonText ?? current.acceptButtonText,
            rejectButtonText: input.rejectButtonText ?? current.rejectButtonText,
            customizeButtonText: input.customizeButtonText ?? current.customizeButtonText,
            position: input.position ?? current.position,
            layout: input.layout ?? current.layout,
            fontFamily: input.fontFamily ?? current.fontFamily,
            fontSize: input.fontSize ?? current.fontSize,
            focusOutlineColor: input.focusOutlineColor ?? current.focusOutlineColor,
        };

        // Validate merged result against dark pattern rules
        this.validateDarkPatternPrevention(merged);

        // Update banner
        const banner = await bannerRepository.update(websiteId, input);
        if (!banner) {
            throw new Error('Failed to update banner');
        }

        // Audit log
        await auditRepository.create(
            tenantId,
            actorId,
            'BANNER_UPDATED',
            {
                resourceType: 'banner',
                resourceId: banner.id,
                metadata: {
                    websiteId,
                    changes: input,
                },
                ipAddress: requestInfo.ipAddress,
                userAgent: requestInfo.userAgent,
            }
        );

        return banner;
    },

    /**
     * Reset banner to defaults
     */
    async resetToDefaults(
        websiteId: string,
        tenantId: string,
        actorId: string,
        requestInfo: { ipAddress?: string; userAgent?: string }
    ): Promise<BannerCustomization> {
        const defaults = bannerRepository.getDefaults();
        return this.upsert(websiteId, tenantId, actorId, defaults, requestInfo);
    },

    /**
     * Validate dark pattern prevention rules
     * DPDPA requires equal prominence for Accept and Reject
     */
    validateDarkPatternPrevention(input: BannerCustomizationInput): void {
        const errors: string[] = [];

        // 1. Button colors must be identical
        if (input.acceptButtonColor !== input.rejectButtonColor) {
            errors.push('Accept and Reject buttons must have the same color');
        }

        // 2. Button text length should be similar (within 50%)
        const acceptLen = input.acceptButtonText.length;
        const rejectLen = input.rejectButtonText.length;
        const diff = Math.abs(acceptLen - rejectLen);
        const avgLen = (acceptLen + rejectLen) / 2;

        if (avgLen > 0 && diff / avgLen > 0.5) {
            errors.push('Accept and Reject button text should be similar in length');
        }

        // 3. Reject button text cannot be dismissive
        const dismissivePatterns = [
            /maybe\s*later/i,
            /not\s*now/i,
            /skip/i,
            /close/i,
            /ignore/i,
            /remind\s*me/i,
        ];

        for (const pattern of dismissivePatterns) {
            if (pattern.test(input.rejectButtonText)) {
                errors.push('Reject button text cannot use dismissive language (e.g., "maybe later", "skip")');
                break;
            }
        }

        // 4. Accept button text cannot be overly persuasive
        const persuasivePatterns = [
            /get\s*started/i,
            /enable\s*all/i,
            /best\s*experience/i,
            /recommended/i,
            /continue/i,
        ];

        for (const pattern of persuasivePatterns) {
            if (pattern.test(input.acceptButtonText)) {
                errors.push('Accept button text cannot use persuasive language (e.g., "get started", "recommended")');
                break;
            }
        }

        if (errors.length > 0) {
            throw new Error(`DPDPA Dark Pattern Violation: ${errors.join('; ')}`);
        }
    },

    /**
     * Get preview HTML for banner
     */
    async getPreviewHtml(
        websiteId: string,
        tenantId: string
    ): Promise<string> {
        const banner = await this.getWithDefaults(websiteId, tenantId);

        return `
<!DOCTYPE html>
<html>
<head>
    <style>
        .consent-banner {
            position: fixed;
            ${banner.position}: 0;
            left: 0;
            right: 0;
            background: ${banner.backgroundColor};
            color: ${banner.textColor};
            padding: 20px;
            font-family: ${banner.fontFamily};
            font-size: ${banner.fontSize};
            box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
            z-index: 9999;
        }
        .consent-banner .buttons {
            display: flex;
            gap: 12px;
            margin-top: 16px;
        }
        .consent-banner button {
            padding: 12px 24px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: ${banner.fontSize};
            font-weight: 500;
        }
        .consent-banner button:focus {
            outline: 2px solid ${banner.focusOutlineColor};
            outline-offset: 2px;
        }
        .consent-banner .accept-btn {
            background: ${banner.acceptButtonColor};
            color: white;
        }
        .consent-banner .reject-btn {
            background: ${banner.rejectButtonColor};
            color: white;
        }
        .consent-banner .customize-btn {
            background: transparent;
            color: ${banner.primaryColor};
            border: 1px solid ${banner.primaryColor};
        }
    </style>
</head>
<body>
    <div class="consent-banner">
        <div class="content">
            <strong>Cookie Consent</strong>
            <p>We use cookies to enhance your experience. Please choose your preference.</p>
        </div>
        <div class="buttons">
            <button class="accept-btn">${banner.acceptButtonText}</button>
            <button class="reject-btn">${banner.rejectButtonText}</button>
            <button class="customize-btn">${banner.customizeButtonText}</button>
        </div>
    </div>
</body>
</html>`;
    },

    // ==================== TRANSLATION METHODS ====================

    /**
     * Get all banner translations for a website
     */
    async getTranslations(
        websiteId: string,
        tenantId: string
    ): Promise<Array<{
        languageCode: string;
        headlineText: string;
        descriptionText: string;
        acceptButtonText: string;
        rejectButtonText: string;
        preferencesButtonText: string;
    }>> {
        // Verify website ownership
        const website = await websiteRepository.findByIdAndTenant(websiteId, tenantId);
        if (!website) {
            throw new Error('Website not found');
        }

        const translations = await bannerRepository.getTranslations(websiteId);

        // If no translations exist, return default English
        if (translations.length === 0) {
            const defaults = bannerRepository.getDefaultTranslation();
            return [{
                languageCode: 'en',
                ...defaults,
            }];
        }

        return translations.map(t => ({
            languageCode: t.languageCode,
            headlineText: t.headlineText,
            descriptionText: t.descriptionText,
            acceptButtonText: t.acceptButtonText,
            rejectButtonText: t.rejectButtonText,
            preferencesButtonText: t.preferencesButtonText,
        }));
    },

    /**
     * Create or update banner translations
     */
    async upsertTranslations(
        websiteId: string,
        tenantId: string,
        actorId: string,
        translations: Array<{
            languageCode: string;
            headlineText: string;
            descriptionText: string;
            acceptButtonText: string;
            rejectButtonText: string;
            preferencesButtonText: string;
        }>,
        requestInfo: { ipAddress?: string; userAgent?: string }
    ): Promise<Array<{
        languageCode: string;
        headlineText: string;
        descriptionText: string;
        acceptButtonText: string;
        rejectButtonText: string;
        preferencesButtonText: string;
    }>> {
        // Verify website ownership
        const website = await websiteRepository.findByIdAndTenant(websiteId, tenantId);
        if (!website) {
            throw new Error('Website not found');
        }

        const results = [];

        for (const t of translations) {
            const saved = await bannerRepository.upsertTranslation(websiteId, t.languageCode, {
                headlineText: t.headlineText,
                descriptionText: t.descriptionText,
                acceptButtonText: t.acceptButtonText,
                rejectButtonText: t.rejectButtonText,
                preferencesButtonText: t.preferencesButtonText,
            });
            results.push({
                languageCode: saved.languageCode,
                headlineText: saved.headlineText,
                descriptionText: saved.descriptionText,
                acceptButtonText: saved.acceptButtonText,
                rejectButtonText: saved.rejectButtonText,
                preferencesButtonText: saved.preferencesButtonText,
            });
        }

        // Audit log
        await auditRepository.create(
            tenantId,
            actorId,
            'BANNER_TRANSLATIONS_UPDATED',
            {
                resourceType: 'banner',
                resourceId: websiteId,
                metadata: {
                    websiteId,
                    languages: translations.map(t => t.languageCode),
                },
                ipAddress: requestInfo.ipAddress,
                userAgent: requestInfo.userAgent,
            }
        );

        return results;
    },
};
