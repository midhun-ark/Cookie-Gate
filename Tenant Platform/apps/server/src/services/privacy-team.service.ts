/**
 * Privacy Team Service
 * 
 * Business logic for managing privacy team members
 */

import { privacyTeamRepository, CreateTeamMemberInput, UpdateTeamMemberInput, PrivacyTeamMember } from '../repositories/privacy-team.repository';
import { auditRepository } from '../repositories/audit.repository';

export const privacyTeamService = {
    /**
     * Get all team members for a tenant
     */
    async listMembers(tenantId: string): Promise<PrivacyTeamMember[]> {
        return privacyTeamRepository.findByTenant(tenantId);
    },

    /**
     * Get active team members (for assignment dropdowns)
     */
    async listActiveMembers(tenantId: string): Promise<PrivacyTeamMember[]> {
        return privacyTeamRepository.findActiveByTenant(tenantId);
    },

    /**
     * Get a team member by ID
     */
    async getMember(id: string, tenantId: string): Promise<PrivacyTeamMember | null> {
        return privacyTeamRepository.findById(id, tenantId);
    },

    /**
     * Add a new team member
     */
    async addMember(
        input: CreateTeamMemberInput,
        actorId: string,
        actorEmail: string,
        ipAddress?: string
    ): Promise<PrivacyTeamMember> {
        // Check for duplicate email
        const exists = await privacyTeamRepository.emailExists(input.tenantId, input.email);
        if (exists) {
            throw new Error('A team member with this email already exists');
        }

        const member = await privacyTeamRepository.create(input);

        // Log audit
        await auditRepository.create(input.tenantId, actorId, 'PRIVACY_TEAM_MEMBER_ADDED', {
            resourceType: 'privacy_team_member',
            resourceId: member.id,
            metadata: {
                fullName: member.fullName,
                email: member.email,
                role: member.role,
            },
            ipAddress,
        });

        return member;
    },

    /**
     * Update a team member
     */
    async updateMember(
        id: string,
        tenantId: string,
        input: UpdateTeamMemberInput,
        actorId: string,
        actorEmail: string,
        ipAddress?: string
    ): Promise<PrivacyTeamMember> {
        // Check member exists
        const existing = await privacyTeamRepository.findById(id, tenantId);
        if (!existing) {
            throw new Error('Team member not found');
        }

        // Check for duplicate email if email is being updated
        if (input.email && input.email !== existing.email) {
            const exists = await privacyTeamRepository.emailExists(tenantId, input.email, id);
            if (exists) {
                throw new Error('A team member with this email already exists');
            }
        }

        const updated = await privacyTeamRepository.update(id, tenantId, input);
        if (!updated) {
            throw new Error('Failed to update team member');
        }

        // Log audit
        await auditRepository.create(tenantId, actorId, 'PRIVACY_TEAM_MEMBER_UPDATED', {
            resourceType: 'privacy_team_member',
            resourceId: id,
            metadata: {
                changes: input,
                previous: {
                    fullName: existing.fullName,
                    email: existing.email,
                    role: existing.role,
                },
            },
            ipAddress,
        });

        return updated;
    },

    /**
     * Toggle team member status
     */
    async toggleStatus(
        id: string,
        tenantId: string,
        status: 'ACTIVE' | 'INACTIVE',
        actorId: string,
        actorEmail: string,
        ipAddress?: string
    ): Promise<PrivacyTeamMember> {
        const existing = await privacyTeamRepository.findById(id, tenantId);
        if (!existing) {
            throw new Error('Team member not found');
        }

        const updated = await privacyTeamRepository.updateStatus(id, tenantId, status);
        if (!updated) {
            throw new Error('Failed to update status');
        }

        // Log audit
        await auditRepository.create(tenantId, actorId, status === 'ACTIVE' ? 'PRIVACY_TEAM_MEMBER_ACTIVATED' : 'PRIVACY_TEAM_MEMBER_DEACTIVATED', {
            resourceType: 'privacy_team_member',
            resourceId: id,
            metadata: {
                fullName: existing.fullName,
                previousStatus: existing.status,
                newStatus: status,
            },
            ipAddress,
        });

        return updated;
    },

    /**
     * Delete a team member
     */
    async deleteMember(
        id: string,
        tenantId: string,
        actorId: string,
        actorEmail: string,
        ipAddress?: string
    ): Promise<void> {
        const existing = await privacyTeamRepository.findById(id, tenantId);
        if (!existing) {
            throw new Error('Team member not found');
        }

        const deleted = await privacyTeamRepository.delete(id, tenantId);
        if (!deleted) {
            throw new Error('Failed to delete team member');
        }

        // Log audit
        await auditRepository.create(tenantId, actorId, 'PRIVACY_TEAM_MEMBER_DELETED', {
            resourceType: 'privacy_team_member',
            resourceId: id,
            metadata: {
                fullName: existing.fullName,
                email: existing.email,
            },
            ipAddress,
        });
    },
};
