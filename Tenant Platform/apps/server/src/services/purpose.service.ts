import { purposeRepository, websiteRepository, auditRepository } from '../repositories';
import { PurposeWithTranslations, Purpose, PurposeTranslation } from '../types';
import { CreatePurposeInput, UpdatePurposeInput, PurposeTranslationInput } from '../validators';

/**
 * Purpose Service.
 * Handles data processing purpose configuration with DPDPA compliance.
 */
export const purposeService = {
    /**
     * Create a purpose for a website
     */
    async create(
        websiteId: string,
        tenantId: string,
        actorId: string,
        input: CreatePurposeInput,
        requestInfo: { ipAddress?: string; userAgent?: string }
    ): Promise<PurposeWithTranslations> {
        // Verify website ownership
        const website = await websiteRepository.findByIdAndTenant(websiteId, tenantId);
        if (!website) {
            throw new Error('Website not found');
        }

        // Create purpose with translations
        const purpose = await purposeRepository.createWithTranslations(websiteId, input);

        // Audit log
        await auditRepository.create(
            tenantId,
            actorId,
            'PURPOSE_CREATED',
            {
                resourceType: 'purpose',
                resourceId: purpose.id,
                metadata: {
                    websiteId,
                    isEssential: input.isEssential,
                    languages: input.translations.map((t) => t.languageCode),
                },
                ipAddress: requestInfo.ipAddress,
                userAgent: requestInfo.userAgent,
            }
        );

        return purpose;
    },

    /**
     * Get all purposes for a website
     */
    async getByWebsiteId(
        websiteId: string,
        tenantId: string
    ): Promise<PurposeWithTranslations[]> {
        // Verify website ownership
        const website = await websiteRepository.findByIdAndTenant(websiteId, tenantId);
        if (!website) {
            throw new Error('Website not found');
        }

        return purposeRepository.findByWebsiteId(websiteId);
    },

    /**
     * Get a single purpose by ID
     */
    async getById(
        purposeId: string,
        tenantId: string
    ): Promise<PurposeWithTranslations> {
        const purpose = await purposeRepository.findByIdWithTranslations(purposeId);
        if (!purpose) {
            throw new Error('Purpose not found');
        }

        // Verify website ownership
        const website = await websiteRepository.findByIdAndTenant(purpose.websiteId, tenantId);
        if (!website) {
            throw new Error('Unauthorized access to purpose');
        }

        return purpose;
    },

    /**
     * Update a purpose
     */
    async update(
        purposeId: string,
        tenantId: string,
        actorId: string,
        input: UpdatePurposeInput,
        requestInfo: { ipAddress?: string; userAgent?: string }
    ): Promise<Purpose> {
        // Find purpose
        const purpose = await purposeRepository.findById(purposeId);
        if (!purpose) {
            throw new Error('Purpose not found');
        }

        // Verify website ownership
        const website = await websiteRepository.findByIdAndTenant(purpose.websiteId, tenantId);
        if (!website) {
            throw new Error('Unauthorized access to purpose');
        }

        // DPDPA: Cannot change essential status once website is active
        if (input.isEssential !== undefined && input.isEssential !== purpose.isEssential) {
            if (website.status === 'ACTIVE') {
                throw new Error('Cannot change essential status while website is active');
            }
        }

        // DPDPA: Essential purposes cannot be deactivated
        if (input.status === 'INACTIVE' && purpose.isEssential) {
            throw new Error('Essential purposes cannot be deactivated');
        }

        const previousState = {
            isEssential: purpose.isEssential,
            status: purpose.status,
            displayOrder: purpose.displayOrder,
        };

        const updatedPurpose = await purposeRepository.update(purposeId, input);
        if (!updatedPurpose) {
            throw new Error('Failed to update purpose');
        }

        // Audit log
        await auditRepository.create(
            tenantId,
            actorId,
            'PURPOSE_UPDATED',
            {
                resourceType: 'purpose',
                resourceId: purposeId,
                metadata: {
                    previousState,
                    newState: input,
                },
                ipAddress: requestInfo.ipAddress,
                userAgent: requestInfo.userAgent,
            }
        );

        return updatedPurpose;
    },

    /**
     * Update purpose translations
     */
    async updateTranslations(
        purposeId: string,
        tenantId: string,
        actorId: string,
        translations: PurposeTranslationInput[],
        requestInfo: { ipAddress?: string; userAgent?: string }
    ): Promise<PurposeTranslation[]> {
        // Find purpose
        const purpose = await purposeRepository.findById(purposeId);
        if (!purpose) {
            throw new Error('Purpose not found');
        }

        // Verify website ownership
        const website = await websiteRepository.findByIdAndTenant(purpose.websiteId, tenantId);
        if (!website) {
            throw new Error('Unauthorized access to purpose');
        }

        // Essential purposes must have English translation
        if (purpose.isEssential) {
            const hasEnglish = await purposeRepository.hasEnglishTranslation(purposeId);
            const hasEnglishInInput = translations.some((t) => t.languageCode === 'en');

            if (!hasEnglish && !hasEnglishInInput) {
                throw new Error('Essential purposes must have English translation');
            }
        }

        // Upsert translations
        const results = await purposeRepository.upsertTranslations(purposeId, translations);

        // Audit log
        await auditRepository.create(
            tenantId,
            actorId,
            'PURPOSE_TRANSLATIONS_UPDATED',
            {
                resourceType: 'purpose',
                resourceId: purposeId,
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
     * Delete a purpose (only inactive, non-essential)
     */
    async delete(
        purposeId: string,
        tenantId: string,
        actorId: string,
        requestInfo: { ipAddress?: string; userAgent?: string }
    ): Promise<void> {
        // Find purpose
        const purpose = await purposeRepository.findById(purposeId);
        if (!purpose) {
            throw new Error('Purpose not found');
        }

        // Verify website ownership
        const website = await websiteRepository.findByIdAndTenant(purpose.websiteId, tenantId);
        if (!website) {
            throw new Error('Unauthorized access to purpose');
        }

        // Cannot delete essential purposes
        if (purpose.isEssential) {
            throw new Error('Cannot delete essential purposes');
        }

        // Cannot delete if website is active
        if (website.status === 'ACTIVE') {
            throw new Error('Cannot delete purposes while website is active. Disable the website first.');
        }

        // Note: Actual deletion would require a new repository method
        // For now, we just deactivate it
        await purposeRepository.update(purposeId, { status: 'INACTIVE' });

        // Audit log
        await auditRepository.create(
            tenantId,
            actorId,
            'PURPOSE_DELETED',
            {
                resourceType: 'purpose',
                resourceId: purposeId,
                metadata: {
                    websiteId: purpose.websiteId,
                },
                ipAddress: requestInfo.ipAddress,
                userAgent: requestInfo.userAgent,
            }
        );
    },

    /**
     * Reorder purposes
     */
    async reorder(
        websiteId: string,
        tenantId: string,
        actorId: string,
        purposeOrders: Array<{ id: string; displayOrder: number }>,
        requestInfo: { ipAddress?: string; userAgent?: string }
    ): Promise<void> {
        // Verify website ownership
        const website = await websiteRepository.findByIdAndTenant(websiteId, tenantId);
        if (!website) {
            throw new Error('Website not found');
        }

        // Update each purpose's display order
        for (const { id, displayOrder } of purposeOrders) {
            const purpose = await purposeRepository.findById(id);
            if (purpose && purpose.websiteId === websiteId) {
                await purposeRepository.update(id, { displayOrder });
            }
        }

        // Audit log
        await auditRepository.create(
            tenantId,
            actorId,
            'PURPOSES_REORDERED',
            {
                resourceType: 'website',
                resourceId: websiteId,
                metadata: {
                    purposeOrders,
                },
                ipAddress: requestInfo.ipAddress,
                userAgent: requestInfo.userAgent,
            }
        );
    },
};
