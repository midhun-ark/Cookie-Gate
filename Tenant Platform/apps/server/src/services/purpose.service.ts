import { purposeRepository, versionRepository, websiteRepository, auditRepository } from '../repositories';
import { PurposeWithTranslations, Purpose, PurposeTranslation } from '../types';
import { CreatePurposeInput, UpdatePurposeInput, PurposeTranslationInput } from '../validators';

/**
 * Purpose Service.
 * Handles data processing purpose configuration with DPDPA compliance.
 * Note: Purposes now belong to website versions, not websites directly.
 */
export const purposeService = {
    /**
     * Create a purpose for a version
     */
    async create(
        versionId: string,
        tenantId: string,
        actorId: string,
        input: CreatePurposeInput,
        requestInfo: { ipAddress?: string; userAgent?: string }
    ): Promise<PurposeWithTranslations> {
        // Verify version ownership
        const version = await versionRepository.findByIdAndTenant(versionId, tenantId);
        if (!version) {
            throw new Error('Version not found');
        }

        // Create purpose with translations
        const purpose = await purposeRepository.createWithTranslations(versionId, input);

        // Audit log
        await auditRepository.create(
            tenantId,
            actorId,
            'PURPOSE_CREATED',
            {
                resourceType: 'purpose',
                resourceId: purpose.id,
                metadata: {
                    versionId,
                    isEssential: input.isEssential,
                    tag: input.tag,
                    languages: input.translations.map((t) => t.languageCode),
                },
                ipAddress: requestInfo.ipAddress,
                userAgent: requestInfo.userAgent,
            }
        );

        return purpose;
    },

    /**
     * Get all purposes for a version
     */
    async getByVersionId(
        versionId: string,
        tenantId: string
    ): Promise<PurposeWithTranslations[]> {
        // Verify version ownership
        const version = await versionRepository.findByIdAndTenant(versionId, tenantId);
        if (!version) {
            throw new Error('Version not found');
        }

        return purposeRepository.findByVersionId(versionId);
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

        // Verify version ownership
        const version = await versionRepository.findByIdAndTenant(purpose.versionId, tenantId);
        if (!version) {
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

        // Verify version ownership
        const version = await versionRepository.findByIdAndTenant(purpose.versionId, tenantId);
        if (!version) {
            throw new Error('Unauthorized access to purpose');
        }

        // Get website to check status
        const website = await websiteRepository.findById(version.websiteId);

        // DPDPA: Cannot change essential status once website is active
        if (input.isEssential !== undefined && input.isEssential !== purpose.isEssential) {
            if (website && website.status === 'ACTIVE') {
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

        // Verify version ownership
        const version = await versionRepository.findByIdAndTenant(purpose.versionId, tenantId);
        if (!version) {
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

        // Verify version ownership
        const version = await versionRepository.findByIdAndTenant(purpose.versionId, tenantId);
        if (!version) {
            throw new Error('Unauthorized access to purpose');
        }

        // Get website to check status
        const website = await websiteRepository.findById(version.websiteId);

        // Cannot delete essential purposes
        if (purpose.isEssential) {
            throw new Error('Cannot delete essential purposes');
        }

        // Cannot delete if website is active
        if (website && website.status === 'ACTIVE') {
            throw new Error('Cannot delete purposes while website is active. Disable the website first.');
        }

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
                    versionId: purpose.versionId,
                },
                ipAddress: requestInfo.ipAddress,
                userAgent: requestInfo.userAgent,
            }
        );
    },

    /**
     * Reorder purposes within a version
     */
    async reorder(
        versionId: string,
        tenantId: string,
        actorId: string,
        purposeOrders: Array<{ id: string; displayOrder: number }>,
        requestInfo: { ipAddress?: string; userAgent?: string }
    ): Promise<void> {
        // Verify version ownership
        const version = await versionRepository.findByIdAndTenant(versionId, tenantId);
        if (!version) {
            throw new Error('Version not found');
        }

        // Update each purpose's display order
        for (const { id, displayOrder } of purposeOrders) {
            const purpose = await purposeRepository.findById(id);
            if (purpose && purpose.versionId === versionId) {
                await purposeRepository.update(id, { displayOrder });
            }
        }

        // Audit log
        await auditRepository.create(
            tenantId,
            actorId,
            'PURPOSES_REORDERED',
            {
                resourceType: 'version',
                resourceId: versionId,
                metadata: {
                    purposeOrders,
                },
                ipAddress: requestInfo.ipAddress,
                userAgent: requestInfo.userAgent,
            }
        );
    },
};
