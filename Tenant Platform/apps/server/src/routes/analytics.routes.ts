import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { analyticsService } from '../services';
import { authMiddleware, getCurrentUser } from '../middleware';

/**
 * Analytics Routes
 */
export async function analyticsRoutes(app: FastifyInstance): Promise<void> {
    // All routes require authentication
    app.addHook('preHandler', authMiddleware);

    /**
     * GET /tenant/analytics/consent-logs
     * Get paginated consent logs (optionally filtered by website)
     */
    app.get('/consent-logs', async (request: FastifyRequest, reply: FastifyReply) => {
        const { tenantId } = getCurrentUser(request);
        const query = request.query as { websiteId?: string, page?: string, limit?: string };
        const page = parseInt(query.page || '1', 10);
        const limit = parseInt(query.limit || '10', 10);

        try {
            const result = await analyticsService.getConsentLogs(tenantId, query.websiteId, page, limit);
            return {
                success: true,
                data: result.items,
                pagination: result.pagination
            };
        } catch (error) {
            console.error('Failed to fetch consent logs:', error);
            return reply.status(500).send({
                success: false,
                message: 'Failed to fetch consent logs'
            });
        }
    });

    /**
     * GET /tenant/analytics/stats
     * Get aggregated stats (optionally filtered by website)
     */
    app.get('/stats', async (request: FastifyRequest, reply: FastifyReply) => {
        const { tenantId } = getCurrentUser(request);
        const query = request.query as { websiteId?: string };

        try {
            const stats = await analyticsService.getStats(tenantId, query.websiteId);
            return {
                success: true,
                data: stats
            };
        } catch (error) {
            console.error('Failed to fetch analytics stats:', error);
            return reply.status(500).send({
                success: false,
                message: 'Failed to fetch analytics'
            });
        }
    });
}
