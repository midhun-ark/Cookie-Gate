import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { auditService } from '../services';
import { auditLogFiltersSchema } from '../validators';
import { authMiddleware, requirePasswordReset, getCurrentUser } from '../middleware';

/**
 * Audit Log Routes
 */
export async function auditRoutes(app: FastifyInstance): Promise<void> {
    // All routes require authentication
    app.addHook('preHandler', authMiddleware);
    app.addHook('preHandler', requirePasswordReset);

    /**
     * GET /tenant/audit-logs
     * Get audit logs with pagination and filters
     */
    app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
        const filters = auditLogFiltersSchema.parse(request.query);
        const { tenantId } = getCurrentUser(request);

        const result = await auditService.getLogs(tenantId, filters);

        return {
            success: true,
            data: result.items,
            pagination: result.pagination,
        };
    });

    /**
     * GET /tenant/audit-logs/filters
     * Get available filter options
     */
    app.get('/filters', async (request: FastifyRequest, reply: FastifyReply) => {
        const { tenantId } = getCurrentUser(request);

        const [actions, resourceTypes] = await Promise.all([
            auditService.getDistinctActions(tenantId),
            auditService.getDistinctResourceTypes(tenantId),
        ]);

        return {
            success: true,
            data: {
                actions,
                resourceTypes,
            },
        };
    });

    /**
     * GET /tenant/audit-logs/export
     * Export audit logs (for compliance)
     */
    app.get('/export', async (request: FastifyRequest, reply: FastifyReply) => {
        const filters = auditLogFiltersSchema.parse({
            ...request.query as object,
            page: 1,
            limit: 10000,
        });
        const { tenantId } = getCurrentUser(request);

        const logs = await auditService.exportLogs(tenantId, filters);

        // Set headers for CSV download
        reply.header('Content-Type', 'text/csv');
        reply.header('Content-Disposition', 'attachment; filename=audit-logs.csv');

        // Generate CSV
        const headers = ['ID', 'Timestamp', 'Actor', 'Action', 'Resource Type', 'Resource ID', 'Details'];
        const rows = logs.map((log) => [
            log.id,
            log.createdAt.toISOString(),
            log.actorEmail || log.actorId,
            log.action,
            log.resourceType || '',
            log.resourceId || '',
            JSON.stringify(log.metadata),
        ]);

        const csv = [
            headers.join(','),
            ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
        ].join('\n');

        return csv;
    });
}
