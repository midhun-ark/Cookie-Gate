import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { websiteService } from '../services';
import {
    createWebsiteSchema,
    updateWebsiteStatusSchema,
    websiteIdParamSchema
} from '../validators';
import {
    authMiddleware,
    requirePasswordReset,
    getRequestInfo,
    getCurrentUser
} from '../middleware';

/**
 * Website Routes
 */
export async function websiteRoutes(app: FastifyInstance): Promise<void> {
    // All routes require authentication and password reset completion
    app.addHook('preHandler', authMiddleware);
    app.addHook('preHandler', requirePasswordReset);

    /**
     * GET /tenant/websites
     * List all websites for the tenant
     */
    app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
        const { tenantId } = getCurrentUser(request);
        const websites = await websiteService.getAll(tenantId);

        return {
            success: true,
            data: websites,
        };
    });

    /**
     * POST /tenant/websites
     * Create a new website
     */
    app.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
        const input = createWebsiteSchema.parse(request.body);
        const { userId, tenantId } = getCurrentUser(request);
        const requestInfo = getRequestInfo(request);

        const website = await websiteService.create(tenantId, userId, input, requestInfo);

        return reply.status(201).send({
            success: true,
            data: website,
            message: 'Website created successfully',
        });
    });

    /**
     * GET /tenant/websites/:id
     * Get a single website
     */
    app.get<{ Params: { id: string } }>(
        '/:id',
        async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
            const { id } = websiteIdParamSchema.parse(request.params);
            const { tenantId } = getCurrentUser(request);

            const website = await websiteService.getById(id, tenantId);

            return {
                success: true,
                data: website,
            };
        }
    );

    /**
     * PATCH /tenant/websites/:id
     * Update website status (enable/disable)
     */
    app.patch<{ Params: { id: string } }>(
        '/:id',
        async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
            const { id } = websiteIdParamSchema.parse(request.params);
            const input = updateWebsiteStatusSchema.parse(request.body);
            const { userId, tenantId } = getCurrentUser(request);
            const requestInfo = getRequestInfo(request);

            const website = await websiteService.updateStatus(
                id,
                tenantId,
                userId,
                input,
                requestInfo
            );

            return {
                success: true,
                data: website,
                message: `Website ${input.status.toLowerCase()} successfully`,
            };
        }
    );

    /**
     * GET /tenant/websites/:id/can-activate
     * Check if website can be activated
     */
    app.get<{ Params: { id: string } }>(
        '/:id/can-activate',
        async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
            const { id } = websiteIdParamSchema.parse(request.params);
            const { tenantId } = getCurrentUser(request);

            const result = await websiteService.checkCanActivate(id, tenantId);

            return {
                success: true,
                data: result,
            };
        }
    );

    /**
     * DELETE /tenant/websites/:id
     * Delete a website (only DRAFT)
     */
    app.delete<{ Params: { id: string } }>(
        '/:id',
        async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
            const { id } = websiteIdParamSchema.parse(request.params);
            const { userId, tenantId } = getCurrentUser(request);
            const requestInfo = getRequestInfo(request);

            await websiteService.delete(id, tenantId, userId, requestInfo);

            return {
                success: true,
                message: 'Website deleted successfully',
            };
        }
    );
}
