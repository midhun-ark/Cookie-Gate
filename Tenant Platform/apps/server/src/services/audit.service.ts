import { auditRepository } from '../repositories';
import { TenantAuditLogWithActor, PaginatedResponse } from '../types';
import { AuditLogFiltersInput } from '../validators';

/**
 * Tenant Audit Service.
 * Handles reading and filtering audit logs.
 * Note: Writing is handled directly in other services.
 */
export const auditService = {
    /**
     * Get audit logs with pagination and filters
     */
    async getLogs(
        tenantId: string,
        filters: AuditLogFiltersInput
    ): Promise<PaginatedResponse<TenantAuditLogWithActor>> {
        return auditRepository.findByTenantId(tenantId, filters);
    },

    /**
     * Get distinct actions for filter dropdown
     */
    async getDistinctActions(tenantId: string): Promise<string[]> {
        return auditRepository.getDistinctActions(tenantId);
    },

    /**
     * Get distinct resource types for filter dropdown
     */
    async getDistinctResourceTypes(tenantId: string): Promise<string[]> {
        return auditRepository.getDistinctResourceTypes(tenantId);
    },

    /**
     * Export audit logs (for compliance reporting)
     */
    async exportLogs(
        tenantId: string,
        filters: Omit<AuditLogFiltersInput, 'page' | 'limit'>
    ): Promise<TenantAuditLogWithActor[]> {
        // Get all logs without pagination
        const result = await auditRepository.findByTenantId(tenantId, {
            ...filters,
            page: 1,
            limit: 10000, // Max export limit
        });
        return result.items;
    },
};
