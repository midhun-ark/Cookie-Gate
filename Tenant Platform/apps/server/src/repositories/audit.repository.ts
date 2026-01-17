import { query } from '../db';
import { TenantAuditLog, TenantAuditLogWithActor, PaginatedResponse } from '../types';
import { AuditLogFiltersInput } from '../validators';

/**
 * Repository for tenant audit log operations.
 * Note: Audit logs are APPEND-ONLY (enforced by database trigger)
 */
export const auditRepository = {
    /**
     * Create an audit log entry
     */
    async create(
        tenantId: string,
        actorId: string,
        action: string,
        options: {
            resourceType?: string;
            resourceId?: string;
            metadata?: Record<string, any>;
            ipAddress?: string;
            userAgent?: string;
        } = {}
    ): Promise<TenantAuditLog> {
        const result = await query<TenantAuditLog>(
            `INSERT INTO tenant_audit_logs 
            (tenant_id, actor_id, action, resource_type, resource_id, metadata, ip_address, user_agent)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING 
                id,
                tenant_id as "tenantId",
                actor_id as "actorId",
                action,
                resource_type as "resourceType",
                resource_id as "resourceId",
                metadata,
                ip_address as "ipAddress",
                user_agent as "userAgent",
                created_at as "createdAt"`,
            [
                tenantId,
                actorId,
                action,
                options.resourceType || null,
                options.resourceId || null,
                options.metadata || {},
                options.ipAddress || null,
                options.userAgent || null,
            ]
        );
        return result.rows[0];
    },

    /**
     * Find audit logs with pagination and filters
     */
    async findByTenantId(
        tenantId: string,
        filters: AuditLogFiltersInput
    ): Promise<PaginatedResponse<TenantAuditLogWithActor>> {
        // Build WHERE conditions
        const conditions: string[] = ['al.tenant_id = $1'];
        const values: any[] = [tenantId];
        let paramIndex = 2;

        if (filters.action) {
            conditions.push(`al.action = $${paramIndex++}`);
            values.push(filters.action);
        }
        if (filters.resourceType) {
            conditions.push(`al.resource_type = $${paramIndex++}`);
            values.push(filters.resourceType);
        }
        if (filters.resourceId) {
            conditions.push(`al.resource_id = $${paramIndex++}`);
            values.push(filters.resourceId);
        }
        if (filters.startDate) {
            conditions.push(`al.created_at >= $${paramIndex++}`);
            values.push(filters.startDate);
        }
        if (filters.endDate) {
            conditions.push(`al.created_at <= $${paramIndex++}`);
            values.push(filters.endDate);
        }

        const whereClause = conditions.join(' AND ');
        const offset = (filters.page - 1) * filters.limit;

        // Get total count
        const countResult = await query<{ count: string }>(
            `SELECT COUNT(*) as count 
            FROM tenant_audit_logs al 
            WHERE ${whereClause}`,
            values
        );
        const total = parseInt(countResult.rows[0].count, 10);

        // Get paginated results
        values.push(filters.limit, offset);
        const result = await query<TenantAuditLogWithActor>(
            `SELECT 
                al.id,
                al.tenant_id as "tenantId",
                al.actor_id as "actorId",
                tu.email as "actorEmail",
                al.action,
                al.resource_type as "resourceType",
                al.resource_id as "resourceId",
                al.metadata,
                al.ip_address as "ipAddress",
                al.user_agent as "userAgent",
                al.created_at as "createdAt"
            FROM tenant_audit_logs al
            LEFT JOIN tenant_users tu ON al.actor_id = tu.id
            WHERE ${whereClause}
            ORDER BY al.created_at DESC
            LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
            values
        );

        return {
            items: result.rows,
            pagination: {
                page: filters.page,
                limit: filters.limit,
                total,
                totalPages: Math.ceil(total / filters.limit),
            },
        };
    },

    /**
     * Get distinct actions for filtering
     */
    async getDistinctActions(tenantId: string): Promise<string[]> {
        const result = await query<{ action: string }>(
            `SELECT DISTINCT action 
            FROM tenant_audit_logs 
            WHERE tenant_id = $1 
            ORDER BY action`,
            [tenantId]
        );
        return result.rows.map((r) => r.action);
    },

    /**
     * Get distinct resource types for filtering
     */
    async getDistinctResourceTypes(tenantId: string): Promise<string[]> {
        const result = await query<{ resourceType: string }>(
            `SELECT DISTINCT resource_type as "resourceType"
            FROM tenant_audit_logs 
            WHERE tenant_id = $1 AND resource_type IS NOT NULL
            ORDER BY resource_type`,
            [tenantId]
        );
        return result.rows.map((r) => r.resourceType);
    },
};
