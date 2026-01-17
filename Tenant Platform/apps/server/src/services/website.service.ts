import { websiteRepository, auditRepository } from '../repositories';
import { Website, WebsiteWithStats, WebsiteStatus } from '../types';
import { CreateWebsiteInput, UpdateWebsiteStatusInput } from '../validators';

/**
 * Website Service.
 * Handles website configuration with business rule validation.
 */
export const websiteService = {
    /**
     * Create a new website for a tenant
     */
    async create(
        tenantId: string,
        actorId: string,
        input: CreateWebsiteInput,
        requestInfo: { ipAddress?: string; userAgent?: string }
    ): Promise<Website> {
        // Check if domain already exists
        const exists = await websiteRepository.domainExists(tenantId, input.domain);
        if (exists) {
            throw new Error(`Domain "${input.domain}" is already registered`);
        }

        // Create website
        const website = await websiteRepository.create(tenantId, input.domain);

        // Audit log
        await auditRepository.create(
            tenantId,
            actorId,
            'WEBSITE_CREATED',
            {
                resourceType: 'website',
                resourceId: website.id,
                metadata: { domain: website.domain },
                ipAddress: requestInfo.ipAddress,
                userAgent: requestInfo.userAgent,
            }
        );

        return website;
    },

    /**
     * Get all websites for a tenant with stats
     */
    async getAll(tenantId: string): Promise<WebsiteWithStats[]> {
        return websiteRepository.findByTenantIdWithStats(tenantId);
    },

    /**
     * Get a single website by ID
     */
    async getById(
        websiteId: string,
        tenantId: string
    ): Promise<Website> {
        const website = await websiteRepository.findByIdAndTenant(websiteId, tenantId);
        if (!website) {
            throw new Error('Website not found');
        }
        return website;
    },

    /**
     * Get website with authorization check
     */
    async getAuthorized(
        websiteId: string,
        tenantId: string
    ): Promise<Website> {
        return this.getById(websiteId, tenantId);
    },

    /**
     * Update website status with validation
     */
    async updateStatus(
        websiteId: string,
        tenantId: string,
        actorId: string,
        input: UpdateWebsiteStatusInput,
        requestInfo: { ipAddress?: string; userAgent?: string }
    ): Promise<Website> {
        // Verify ownership
        const website = await websiteRepository.findByIdAndTenant(websiteId, tenantId);
        if (!website) {
            throw new Error('Website not found');
        }

        // If activating, validate requirements
        if (input.status === 'ACTIVE') {
            const validation = await websiteRepository.canActivate(websiteId);
            if (!validation.canActivate) {
                throw new Error(
                    `Cannot activate website: ${validation.reasons.join('; ')}`
                );
            }
        }

        const previousStatus = website.status;
        const updatedWebsite = await websiteRepository.updateStatus(websiteId, input.status);

        if (!updatedWebsite) {
            throw new Error('Failed to update website status');
        }

        // Audit log
        await auditRepository.create(
            tenantId,
            actorId,
            `WEBSITE_STATUS_${input.status}`,
            {
                resourceType: 'website',
                resourceId: websiteId,
                metadata: {
                    previousStatus,
                    newStatus: input.status,
                    domain: website.domain,
                },
                ipAddress: requestInfo.ipAddress,
                userAgent: requestInfo.userAgent,
            }
        );

        return updatedWebsite;
    },

    /**
     * Check if website can be activated
     */
    async checkCanActivate(websiteId: string, tenantId: string): Promise<{
        canActivate: boolean;
        reasons: string[];
    }> {
        // Verify ownership
        const website = await websiteRepository.findByIdAndTenant(websiteId, tenantId);
        if (!website) {
            throw new Error('Website not found');
        }

        return websiteRepository.canActivate(websiteId);
    },

    /**
     * Delete a website (only DRAFT status)
     */
    async delete(
        websiteId: string,
        tenantId: string,
        actorId: string,
        requestInfo: { ipAddress?: string; userAgent?: string }
    ): Promise<void> {
        // Verify ownership
        const website = await websiteRepository.findByIdAndTenant(websiteId, tenantId);
        if (!website) {
            throw new Error('Website not found');
        }

        if (website.status !== 'DRAFT') {
            throw new Error('Only websites in DRAFT status can be deleted');
        }

        const deleted = await websiteRepository.delete(websiteId);
        if (!deleted) {
            throw new Error('Failed to delete website');
        }

        // Audit log
        await auditRepository.create(
            tenantId,
            actorId,
            'WEBSITE_DELETED',
            {
                resourceType: 'website',
                resourceId: websiteId,
                metadata: { domain: website.domain },
                ipAddress: requestInfo.ipAddress,
                userAgent: requestInfo.userAgent,
            }
        );
    },
};
