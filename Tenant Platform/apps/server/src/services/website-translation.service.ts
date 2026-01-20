import { translationService } from './translation.service';
import { noticeService } from './notice.service';
import { purposeService } from './purpose.service';
import { bannerService } from './banner.service';
import { auditRepository, versionRepository } from '../repositories';

export interface TranslationResult {
    notice: { translated: boolean; languages: string[] };
    purposes: { translated: number; languages: string[] };
    banner: { translated: boolean; languages: string[] };
}

export class WebsiteTranslationService {
    /**
     * Translate all content for a website to specified languages
     * This method finds the active version and translates its content
     */
    async translateAll(
        websiteId: string,
        targetLangs: string[],
        tenantId: string,
        userId: string,
        requestInfo: { ipAddress: string; userAgent: string }
    ): Promise<TranslationResult> {
        const result: TranslationResult = {
            notice: { translated: false, languages: [] },
            purposes: { translated: 0, languages: [] },
            banner: { translated: false, languages: [] }
        };

        // Filter out English - we translate FROM English
        const langsToTranslate = targetLangs.filter(l => l !== 'en');
        if (langsToTranslate.length === 0) {
            return result;
        }

        // Get the active version for this website
        const activeVersion = await versionRepository.findActiveByWebsiteId(websiteId);
        if (!activeVersion) {
            console.error('No active version found for website:', websiteId);
            return result;
        }
        const versionId = activeVersion.id;

        // 1. Translate Notice
        try {
            const notice = await noticeService.getByVersionId(versionId, tenantId);
            if (notice) {
                const enTranslation = notice.translations.find((t: { languageCode: string }) => t.languageCode === 'en');
                if (enTranslation) {
                    for (const targetLang of langsToTranslate) {
                        try {
                            const translatedFields = await this.translateNoticeFields(enTranslation, targetLang);
                            await noticeService.upsertTranslation(
                                notice.id,
                                tenantId,
                                userId,
                                {
                                    languageCode: targetLang,
                                    title: translatedFields.title,
                                    description: translatedFields.description,
                                    dataCategories: enTranslation.dataCategories || [],
                                    processingPurposes: enTranslation.processingPurposes || [],
                                    policyUrl: translatedFields.policyUrl,
                                    rightsDescription: translatedFields.rightsDescription,
                                    withdrawalInstruction: translatedFields.withdrawalInstruction,
                                    complaintInstruction: translatedFields.complaintInstruction
                                },
                                requestInfo
                            );
                            result.notice.languages.push(targetLang);
                        } catch (err) {
                            console.error(`Failed to translate notice to ${targetLang}:`, err);
                        }
                    }
                    result.notice.translated = result.notice.languages.length > 0;
                }
            }
        } catch (err) {
            console.error('Failed to translate notice:', err);
        }

        // 2. Translate Purposes
        try {
            const purposes = await purposeService.getByVersionId(versionId, tenantId);
            for (const purpose of purposes) {
                const enTranslation = purpose.translations?.find((t: { languageCode: string }) => t.languageCode === 'en');
                if (enTranslation) {
                    const newTranslations: Array<{ languageCode: string; name: string; description: string }> = [];
                    for (const targetLang of langsToTranslate) {
                        try {
                            const translatedName = await translationService.translate(enTranslation.name, 'en', targetLang);
                            const translatedDesc = await translationService.translate(enTranslation.description || '', 'en', targetLang);
                            newTranslations.push({
                                languageCode: targetLang,
                                name: translatedName,
                                description: translatedDesc
                            });
                        } catch (err) {
                            console.error(`Failed to translate purpose ${purpose.id} to ${targetLang}:`, err);
                        }
                    }
                    if (newTranslations.length > 0) {
                        // Merge with existing translations - only keep en and non-target languages
                        const existingTrans = (purpose.translations || [])
                            .filter((t: { languageCode: string }) => t.languageCode === 'en' || !langsToTranslate.includes(t.languageCode))
                            .map((t: { languageCode: string; name: string; description: string }) => ({ languageCode: t.languageCode, name: t.name, description: t.description }));
                        const mergedTranslations = [...existingTrans, ...newTranslations];
                        await purposeService.updateTranslations(purpose.id, tenantId, userId, mergedTranslations, requestInfo);
                        result.purposes.translated++;
                    }
                }
            }
            result.purposes.languages = langsToTranslate.filter(() => result.purposes.translated > 0);
        } catch (err) {
            console.error('Failed to translate purposes:', err);
        }

        // 3. Translate Banner
        try {
            const bannerTranslations = await bannerService.getTranslations(versionId, tenantId);
            const enBanner = bannerTranslations.find(t => t.languageCode === 'en');
            if (enBanner) {
                const newBannerTranslations: Array<{
                    languageCode: string;
                    headlineText: string;
                    descriptionText: string;
                    acceptButtonText: string;
                    rejectButtonText: string;
                    preferencesButtonText: string;
                }> = [];

                for (const targetLang of langsToTranslate) {
                    try {
                        const translatedHeadline = await translationService.translate(enBanner.headlineText, 'en', targetLang);
                        const translatedDesc = await translationService.translate(enBanner.descriptionText, 'en', targetLang);
                        const translatedAccept = await translationService.translate(enBanner.acceptButtonText, 'en', targetLang);
                        const translatedReject = await translationService.translate(enBanner.rejectButtonText, 'en', targetLang);
                        const translatedPrefs = await translationService.translate(enBanner.preferencesButtonText, 'en', targetLang);

                        newBannerTranslations.push({
                            languageCode: targetLang,
                            headlineText: translatedHeadline,
                            descriptionText: translatedDesc,
                            acceptButtonText: translatedAccept,
                            rejectButtonText: translatedReject,
                            preferencesButtonText: translatedPrefs
                        });
                        result.banner.languages.push(targetLang);
                    } catch (err) {
                        console.error(`Failed to translate banner to ${targetLang}:`, err);
                    }
                }

                if (newBannerTranslations.length > 0) {
                    // Merge and save
                    const mergedBanner = [
                        ...bannerTranslations.filter(t => t.languageCode === 'en' || !langsToTranslate.includes(t.languageCode)),
                        ...newBannerTranslations
                    ];
                    await bannerService.upsertTranslations(versionId, tenantId, userId, mergedBanner, requestInfo);
                    result.banner.translated = true;
                }
            }
        } catch (err) {
            console.error('Failed to translate banner:', err);
        }

        // Audit log
        await auditRepository.create(
            tenantId,
            userId,
            'BULK_TRANSLATE',
            {
                resourceType: 'website',
                resourceId: websiteId,
                metadata: {
                    versionId,
                    targetLanguages: langsToTranslate,
                    result
                },
                ipAddress: requestInfo.ipAddress,
                userAgent: requestInfo.userAgent
            }
        );

        return result;
    }

    private async translateNoticeFields(
        enTranslation: any,
        targetLang: string
    ): Promise<{
        title: string;
        description: string;
        policyUrl?: string;
        rightsDescription?: string;
        withdrawalInstruction?: string;
        complaintInstruction?: string;
    }> {
        const [title, description, rightsDescription, withdrawalInstruction, complaintInstruction] = await Promise.all([
            translationService.translate(enTranslation.title, 'en', targetLang),
            translationService.translate(enTranslation.description, 'en', targetLang),
            enTranslation.rightsDescription ? translationService.translate(enTranslation.rightsDescription, 'en', targetLang) : Promise.resolve(''),
            enTranslation.withdrawalInstruction ? translationService.translate(enTranslation.withdrawalInstruction, 'en', targetLang) : Promise.resolve(''),
            enTranslation.complaintInstruction ? translationService.translate(enTranslation.complaintInstruction, 'en', targetLang) : Promise.resolve('')
        ]);

        return {
            title,
            description,
            policyUrl: enTranslation.policyUrl,
            rightsDescription,
            withdrawalInstruction,
            complaintInstruction
        };
    }
}

export const websiteTranslationService = new WebsiteTranslationService();
