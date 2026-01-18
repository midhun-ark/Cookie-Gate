import { noticeRepository, websiteRepository, auditRepository } from '../repositories';
import { translationService } from './translation.service';
import { WebsiteNoticeWithTranslations, NoticeTranslation } from '../types';
import { CreateNoticeInput, NoticeTranslationInput } from '../validators';

/**
 * Notice Service.
 * Handles consent notice configuration with multi-language support.
 */
export const noticeService = {
    /**
     * Create a notice for a website
     */
    async create(
        websiteId: string,
        tenantId: string,
        actorId: string,
        input: CreateNoticeInput,
        requestInfo: { ipAddress?: string; userAgent?: string }
    ): Promise<WebsiteNoticeWithTranslations> {
        // Verify website ownership
        const website = await websiteRepository.findByIdAndTenant(websiteId, tenantId);
        if (!website) {
            throw new Error('Website not found');
        }

        // Check if notice already exists
        const existingNotice = await noticeRepository.existsForWebsite(websiteId);
        if (existingNotice) {
            throw new Error('Notice already exists for this website. Use update instead.');
        }

        // Create notice with translations
        const notice = await noticeRepository.createWithTranslations(
            websiteId,
            input.translations,
            input.dpoEmail
        );

        // Audit log
        await auditRepository.create(
            tenantId,
            actorId,
            'NOTICE_CREATED',
            {
                resourceType: 'notice',
                resourceId: notice.id,
                metadata: {
                    websiteId,
                    languages: input.translations.map((t) => t.languageCode),
                },
                ipAddress: requestInfo.ipAddress,
                userAgent: requestInfo.userAgent,
            }
        );

        return notice;
    },

    /**
     * Get notice for a website
     */
    async getByWebsiteId(
        websiteId: string,
        tenantId: string
    ): Promise<WebsiteNoticeWithTranslations | null> {
        // Verify website ownership
        const website = await websiteRepository.findByIdAndTenant(websiteId, tenantId);
        if (!website) {
            throw new Error('Website not found');
        }

        return noticeRepository.findByWebsiteId(websiteId);
    },

    /**
     * Add or update a translation
     */
    async upsertTranslation(
        noticeId: string,
        tenantId: string,
        actorId: string,
        translation: NoticeTranslationInput,
        requestInfo: { ipAddress?: string; userAgent?: string }
    ): Promise<NoticeTranslation> {
        // Find notice and verify ownership
        const notice = await noticeRepository.findById(noticeId);
        if (!notice) {
            throw new Error('Notice not found');
        }

        const website = await websiteRepository.findByIdAndTenant(notice.websiteId, tenantId);
        if (!website) {
            throw new Error('Unauthorized access to notice');
        }

        // Upsert translation
        const result = await noticeRepository.upsertTranslation(noticeId, translation);

        // Audit log
        await auditRepository.create(
            tenantId,
            actorId,
            'NOTICE_TRANSLATION_UPDATED',
            {
                resourceType: 'notice_translation',
                resourceId: result.id,
                metadata: {
                    noticeId,
                    languageCode: translation.languageCode,
                },
                ipAddress: requestInfo.ipAddress,
                userAgent: requestInfo.userAgent,
            }
        );

        return result;
    },

    /**
     * Batch update translations
     */
    async batchUpsertTranslations(
        noticeId: string,
        tenantId: string,
        actorId: string,
        translations: NoticeTranslationInput[],
        dpoEmail: string | undefined, // Added dpoEmail
        requestInfo: { ipAddress?: string; userAgent?: string }
    ): Promise<NoticeTranslation[]> {
        // Find notice and verify ownership
        const notice = await noticeRepository.findById(noticeId);
        if (!notice) {
            throw new Error('Notice not found');
        }

        const website = await websiteRepository.findByIdAndTenant(notice.websiteId, tenantId);
        if (!website) {
            throw new Error('Unauthorized access to notice');
        }

        // Update DPO Email if provided
        if (dpoEmail !== undefined) {
            await noticeRepository.update(noticeId, { dpoEmail });
        }

        // Ensure English translation is present if not already
        const hasEnglish = await noticeRepository.hasEnglishTranslation(noticeId);
        const hasEnglishInInput = translations.some((t) => t.languageCode === 'en');

        if (!hasEnglish && !hasEnglishInInput) {
            // throw new Error('English translation is mandatory');
            // Allow update without english if it already exists, but schema check catches it mostly.
            // If English exists in DB, we are good.
        }

        // Upsert all translations
        const results: NoticeTranslation[] = [];
        for (const translation of translations) {
            const result = await noticeRepository.upsertTranslation(noticeId, translation);
            results.push(result);
        }

        // Audit log
        await auditRepository.create(
            tenantId,
            actorId,
            'NOTICE_TRANSLATIONS_BATCH_UPDATED',
            {
                resourceType: 'notice',
                resourceId: noticeId,
                metadata: {
                    languages: translations.map((t) => t.languageCode),
                },
                ipAddress: requestInfo.ipAddress,
                userAgent: requestInfo.userAgent,
            }
        );

        return results;
    },

    /**
     * Delete a translation (cannot delete English)
     */
    async deleteTranslation(
        noticeId: string,
        languageCode: string,
        tenantId: string,
        actorId: string,
        requestInfo: { ipAddress?: string; userAgent?: string }
    ): Promise<void> {
        if (languageCode === 'en') {
            throw new Error('Cannot delete English translation');
        }

        // Find notice and verify ownership
        const notice = await noticeRepository.findById(noticeId);
        if (!notice) {
            throw new Error('Notice not found');
        }

        const website = await websiteRepository.findByIdAndTenant(notice.websiteId, tenantId);
        if (!website) {
            throw new Error('Unauthorized access to notice');
        }

        const deleted = await noticeRepository.deleteTranslation(noticeId, languageCode);
        if (!deleted) {
            throw new Error('Translation not found');
        }

        // Audit log
        await auditRepository.create(
            tenantId,
            actorId,
            'NOTICE_TRANSLATION_DELETED',
            {
                resourceType: 'notice_translation',
                metadata: {
                    noticeId,
                    languageCode,
                },
                ipAddress: requestInfo.ipAddress,
                userAgent: requestInfo.userAgent,
            }
        );
    },

    /**
     * Get all translations for a notice
     */
    async getTranslations(
        noticeId: string,
        tenantId: string
    ): Promise<NoticeTranslation[]> {
        // Find notice and verify ownership
        const notice = await noticeRepository.findById(noticeId);
        if (!notice) {
            throw new Error('Notice not found');
        }

        const website = await websiteRepository.findByIdAndTenant(notice.websiteId, tenantId);
        if (!website) {
            throw new Error('Unauthorized access to notice');
        }

        return noticeRepository.getTranslations(noticeId);
    },
    /**
     * Auto translate and persist
     */
    async autoTranslate(
        websiteId: string,
        targetLang: string,
        tenantId: string,
        actorId: string,
        requestInfo: { ipAddress?: string; userAgent?: string }
    ): Promise<NoticeTranslation> {
        // 1. Get existing notice and English translation
        const notice = await noticeRepository.findByWebsiteId(websiteId);
        if (!notice) {
            throw new Error('Notice not found. Please create an English notice first.');
        }

        const website = await websiteRepository.findByIdAndTenant(websiteId, tenantId);
        if (!website) {
            throw new Error('Website not found');
        }

        const enTranslation = notice.translations.find(t => t.languageCode === 'en');
        if (!enTranslation) {
            throw new Error('English content is missing. Cannot auto-translate.');
        }

        // 2. Translate DPDPA fields
        // We translate: Title, Description, Rights, Withdrawal, Complaint
        // Data Categories & Purposes are arrays, we iterate them.

        const translateText = (text?: string) =>
            text ? translationService.translate(text, 'en', targetLang) : Promise.resolve(undefined);

        const translateArray = (arr: string[]) =>
            Promise.all(arr.map(text => translationService.translate(text, 'en', targetLang)));

        const [
            title, description, rights, withdrawal, complaint,
            categories, purposes
        ] = await Promise.all([
            translateText(enTranslation.title),
            translateText(enTranslation.description),
            translateText(enTranslation.rightsDescription),
            translateText(enTranslation.withdrawalInstruction),
            translateText(enTranslation.complaintInstruction),
            translateArray(enTranslation.dataCategories || []),
            translateArray(enTranslation.processingPurposes || [])
        ]);

        // 3. Persist
        const translationInput: NoticeTranslationInput = {
            languageCode: targetLang,
            title: title || enTranslation.title,
            description: description || enTranslation.description,
            rightsDescription: rights,
            withdrawalInstruction: withdrawal,
            complaintInstruction: complaint,
            dataCategories: categories,
            processingPurposes: purposes,
            policyUrl: enTranslation.policyUrl
        };

        return this.upsertTranslation(
            notice.id,
            tenantId,
            actorId,
            translationInput,
            requestInfo
        );
    },

    /**
     * Batch Auto translate
     */
    async batchAutoTranslate(
        websiteId: string,
        targetLangs: string[],
        tenantId: string,
        actorId: string,
        requestInfo: { ipAddress?: string; userAgent?: string }
    ): Promise<NoticeTranslation[]> {
        const results: NoticeTranslation[] = [];
        // Process sequentially to avoid overwhelming the translation API if we have many languages
        for (const lang of targetLangs) {
            try {
                const result = await this.autoTranslate(websiteId, lang, tenantId, actorId, requestInfo);
                results.push(result);
            } catch (error) {
                console.error(`Failed to auto-translate to ${lang}:`, error);
                // We continue with other languages even if one fails
            }
        }
        return results;
    }
};
