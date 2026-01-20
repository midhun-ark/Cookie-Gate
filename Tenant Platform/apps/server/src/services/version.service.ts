import { versionRepository, websiteRepository, auditRepository } from '../repositories';
import { WebsiteVersion, WebsiteVersionWithStats } from '../types';
import { withTransaction } from '../db';

/**
 * Version Service.
 * Handles website version operations with business rule validation.
 */
export const versionService = {
    /**
     * Get all versions for a website
     */
    async getVersions(
        websiteId: string,
        tenantId: string
    ): Promise<WebsiteVersionWithStats[]> {
        // Verify website ownership
        const website = await websiteRepository.findByIdAndTenant(websiteId, tenantId);
        if (!website) {
            throw new Error('Website not found');
        }

        return versionRepository.findByWebsiteId(websiteId);
    },

    /**
     * Get active version for a website
     */
    async getActiveVersion(
        websiteId: string,
        tenantId: string
    ): Promise<WebsiteVersion | null> {
        // Verify website ownership
        const website = await websiteRepository.findByIdAndTenant(websiteId, tenantId);
        if (!website) {
            throw new Error('Website not found');
        }

        return versionRepository.findActiveByWebsiteId(websiteId);
    },

    /**
     * Get a single version by ID
     */
    async getVersion(
        versionId: string,
        tenantId: string
    ): Promise<WebsiteVersion> {
        const version = await versionRepository.findByIdAndTenant(versionId, tenantId);
        if (!version) {
            throw new Error('Version not found');
        }
        return version;
    },

    /**
     * Create a new version from the latest version
     * Copies all data from the latest version (or creates empty if first)
     */
    async createVersion(
        websiteId: string,
        tenantId: string,
        actorId: string,
        requestInfo: { ipAddress?: string; userAgent?: string }
    ): Promise<WebsiteVersion> {
        // Verify website ownership
        const website = await websiteRepository.findByIdAndTenant(websiteId, tenantId);
        if (!website) {
            throw new Error('Website not found');
        }

        return withTransaction(async (client) => {
            // Get next version number
            const nextNumber = await versionRepository.getNextVersionNumber(websiteId, client);

            // Create new version
            const newVersion = await versionRepository.create(websiteId, nextNumber, undefined, client);

            // Find the latest version to copy from (highest version number, excluding new one)
            const versions = await versionRepository.findByWebsiteId(websiteId);
            const sourceVersion = versions.find(v => v.id !== newVersion.id);

            if (sourceVersion) {
                // Copy data from latest version
                await versionRepository.copyVersionData(sourceVersion.id, newVersion.id, client);
            }

            // Audit log
            await auditRepository.create(
                tenantId,
                actorId,
                'VERSION_CREATED',
                {
                    resourceType: 'website_version',
                    resourceId: newVersion.id,
                    metadata: {
                        websiteId,
                        versionNumber: nextNumber,
                        copiedFromVersionId: sourceVersion?.id || null,
                    },
                    ipAddress: requestInfo.ipAddress,
                    userAgent: requestInfo.userAgent,
                }
            );

            return newVersion;
        });
    },

    /**
     * Update version name
     */
    async updateVersionName(
        versionId: string,
        tenantId: string,
        actorId: string,
        versionName: string,
        requestInfo: { ipAddress?: string; userAgent?: string }
    ): Promise<WebsiteVersion> {
        // Verify ownership
        const version = await versionRepository.findByIdAndTenant(versionId, tenantId);
        if (!version) {
            throw new Error('Version not found');
        }

        const updatedVersion = await versionRepository.updateName(versionId, versionName);
        if (!updatedVersion) {
            throw new Error('Failed to update version name');
        }

        // Audit log
        await auditRepository.create(
            tenantId,
            actorId,
            'VERSION_NAME_UPDATED',
            {
                resourceType: 'website_version',
                resourceId: versionId,
                metadata: {
                    previousName: version.versionName,
                    newName: versionName,
                },
                ipAddress: requestInfo.ipAddress,
                userAgent: requestInfo.userAgent,
            }
        );

        return updatedVersion;
    },

    /**
     * Activate a version (archives the current active version)
     */
    async activateVersion(
        versionId: string,
        tenantId: string,
        actorId: string,
        requestInfo: { ipAddress?: string; userAgent?: string }
    ): Promise<WebsiteVersion> {
        // Verify ownership
        const version = await versionRepository.findByIdAndTenant(versionId, tenantId);
        if (!version) {
            throw new Error('Version not found');
        }

        if (version.status === 'ACTIVE') {
            throw new Error('Version is already active');
        }

        if (version.status === 'ARCHIVED') {
            throw new Error('Cannot activate an archived version. Create a new version instead.');
        }

        return withTransaction(async (client) => {
            // Get current active version for logging
            const currentActive = await versionRepository.findActiveByWebsiteId(version.websiteId);

            // Archive all active versions
            await versionRepository.archiveActiveVersions(version.websiteId, client);

            // Activate the target version
            const activatedVersion = await versionRepository.updateStatus(versionId, 'ACTIVE', client);
            if (!activatedVersion) {
                throw new Error('Failed to activate version');
            }

            // Also update website status to ACTIVE when a version is activated
            await websiteRepository.updateStatus(version.websiteId, 'ACTIVE', client);

            // Audit log
            await auditRepository.create(
                tenantId,
                actorId,
                'VERSION_ACTIVATED',
                {
                    resourceType: 'website_version',
                    resourceId: versionId,
                    metadata: {
                        websiteId: version.websiteId,
                        versionNumber: version.versionNumber,
                        previousActiveVersionId: currentActive?.id || null,
                        previousActiveVersionNumber: currentActive?.versionNumber || null,
                    },
                    ipAddress: requestInfo.ipAddress,
                    userAgent: requestInfo.userAgent,
                }
            );

            return activatedVersion;
        });
    },

    /**
     * Archive a draft version (discard without activating)
     */
    async archiveVersion(
        versionId: string,
        tenantId: string,
        actorId: string,
        requestInfo: { ipAddress?: string; userAgent?: string }
    ): Promise<WebsiteVersion> {
        // Verify ownership
        const version = await versionRepository.findByIdAndTenant(versionId, tenantId);
        if (!version) {
            throw new Error('Version not found');
        }

        if (version.status !== 'DRAFT') {
            throw new Error('Only draft versions can be archived');
        }

        // Archive the draft
        const archivedVersion = await versionRepository.updateStatus(versionId, 'ARCHIVED');
        if (!archivedVersion) {
            throw new Error('Failed to archive version');
        }

        // Audit log
        await auditRepository.create(
            tenantId,
            actorId,
            'VERSION_ARCHIVED',
            {
                resourceType: 'website_version',
                resourceId: versionId,
                metadata: {
                    websiteId: version.websiteId,
                    versionNumber: version.versionNumber,
                },
                ipAddress: requestInfo.ipAddress,
                userAgent: requestInfo.userAgent,
            }
        );

        return archivedVersion;
    },
};
