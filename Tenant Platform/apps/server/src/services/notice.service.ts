import { noticeRepository, versionRepository, auditRepository } from '../repositories';
import { WebsiteNoticeWithTranslations, NoticeTranslation } from '../types';
import { CreateNoticeInput, NoticeTranslationInput } from '../validators';

/**
 * Notice Service.
 * Handles consent notice configuration with multi-language support.
 * Note: Notices now belong to website versions, not websites directly.
 */
export const noticeService = {
    /**
     * Create a notice for a version
     */
    async create(
        versionId: string,
        tenantId: string,
        actorId: string,
        input: CreateNoticeInput,
        requestInfo: { ipAddress?: string; userAgent?: string }
    ): Promise<WebsiteNoticeWithTranslations> {
        // Verify version ownership
        const version = await versionRepository.findByIdAndTenant(versionId, tenantId);
        if (!version) {
            throw new Error('Version not found');
        }

        // Check if notice already exists
        const existingNotice = await noticeRepository.existsForVersion(versionId);
        if (existingNotice) {
            throw new Error('Notice already exists for this version. Use update instead.');
        }

        // Create notice with translations
        const notice = await noticeRepository.createWithTranslations(
            versionId,
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
                    versionId,
                    languages: input.translations.map((t) => t.languageCode),
                },
                ipAddress: requestInfo.ipAddress,
                userAgent: requestInfo.userAgent,
            }
        );

        return notice;
    },

    /**
     * Get notice for a version
     */
    async getByVersionId(
        versionId: string,
        tenantId: string
    ): Promise<WebsiteNoticeWithTranslations | null> {
        // Verify version ownership
        const version = await versionRepository.findByIdAndTenant(versionId, tenantId);
        if (!version) {
            throw new Error('Version not found');
        }

        return noticeRepository.findByVersionId(versionId);
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

        const version = await versionRepository.findByIdAndTenant(notice.versionId, tenantId);
        if (!version) {
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
        dpoEmail: string | undefined,
        requestInfo: { ipAddress?: string; userAgent?: string }
    ): Promise<NoticeTranslation[]> {
        // Find notice and verify ownership
        const notice = await noticeRepository.findById(noticeId);
        if (!notice) {
            throw new Error('Notice not found');
        }

        const version = await versionRepository.findByIdAndTenant(notice.versionId, tenantId);
        if (!version) {
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
            // Allow update without english if it already exists
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

        const version = await versionRepository.findByIdAndTenant(notice.versionId, tenantId);
        if (!version) {
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

        const version = await versionRepository.findByIdAndTenant(notice.versionId, tenantId);
        if (!version) {
            throw new Error('Unauthorized access to notice');
        }

        return noticeRepository.getTranslations(noticeId);
    },
};
