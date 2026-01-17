import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { purposeService } from '../services';
import {
    createPurposeSchema,
    updatePurposeSchema,
    updatePurposeTranslationSchema,
    websiteIdParamSchema,
    purposeIdParamSchema
} from '../validators';
import {
    authMiddleware,
    requirePasswordReset,
    getRequestInfo,
    getCurrentUser
} from '../middleware';
import { z } from 'zod';

/**
 * Purpose Routes
 */
export async function purposeRoutes(app: FastifyInstance): Promise<void> {
    // All routes require authentication
    app.addHook('preHandler', authMiddleware);
    app.addHook('preHandler', requirePasswordReset);

    /**
     * GET /tenant/websites/:id/purposes
     * Get all purposes for a website
     */
    app.get<{ Params: { id: string } }>(
        '/websites/:id/purposes',
        async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
            const { id: websiteId } = websiteIdParamSchema.parse(request.params);
            const { tenantId } = getCurrentUser(request);

            const purposes = await purposeService.getByWebsiteId(websiteId, tenantId);

            return {
                success: true,
                data: purposes,
            };
        }
    );

    /**
     * POST /tenant/websites/:id/purposes
     * Create a purpose for a website
     */
    app.post<{ Params: { id: string } }>(
        '/websites/:id/purposes',
        async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
            const { id: websiteId } = websiteIdParamSchema.parse(request.params);
            const input = createPurposeSchema.parse(request.body);
            const { userId, tenantId } = getCurrentUser(request);
            const requestInfo = getRequestInfo(request);

            const purpose = await purposeService.create(
                websiteId,
                tenantId,
                userId,
                input,
                requestInfo
            );

            return reply.status(201).send({
                success: true,
                data: purpose,
                message: 'Purpose created successfully',
            });
        }
    );

    /**
     * GET /tenant/purposes/:purposeId
     * Get a single purpose
     */
    app.get<{ Params: { purposeId: string } }>(
        '/purposes/:purposeId',
        async (request: FastifyRequest<{ Params: { purposeId: string } }>, reply: FastifyReply) => {
            const { purposeId } = purposeIdParamSchema.parse(request.params);
            const { tenantId } = getCurrentUser(request);

            const purpose = await purposeService.getById(purposeId, tenantId);

            return {
                success: true,
                data: purpose,
            };
        }
    );

    /**
     * PATCH /tenant/purposes/:purposeId
     * Update a purpose
     */
    app.patch<{ Params: { purposeId: string } }>(
        '/purposes/:purposeId',
        async (request: FastifyRequest<{ Params: { purposeId: string } }>, reply: FastifyReply) => {
            const { purposeId } = purposeIdParamSchema.parse(request.params);
            const input = updatePurposeSchema.parse(request.body);
            const { userId, tenantId } = getCurrentUser(request);
            const requestInfo = getRequestInfo(request);

            const purpose = await purposeService.update(
                purposeId,
                tenantId,
                userId,
                input,
                requestInfo
            );

            return {
                success: true,
                data: purpose,
                message: 'Purpose updated successfully',
            };
        }
    );

    /**
     * PATCH /tenant/purposes/:purposeId/translations
     * Update purpose translations
     */
    app.patch<{ Params: { purposeId: string } }>(
        '/purposes/:purposeId/translations',
        async (request: FastifyRequest<{ Params: { purposeId: string } }>, reply: FastifyReply) => {
            const { purposeId } = purposeIdParamSchema.parse(request.params);
            const input = updatePurposeTranslationSchema.parse(request.body);
            const { userId, tenantId } = getCurrentUser(request);
            const requestInfo = getRequestInfo(request);

            const translations = await purposeService.updateTranslations(
                purposeId,
                tenantId,
                userId,
                input.translations,
                requestInfo
            );

            return {
                success: true,
                data: translations,
                message: 'Translations updated successfully',
            };
        }
    );

    /**
     * DELETE /tenant/purposes/:purposeId
     * Delete a purpose (deactivate)
     */
    app.delete<{ Params: { purposeId: string } }>(
        '/purposes/:purposeId',
        async (request: FastifyRequest<{ Params: { purposeId: string } }>, reply: FastifyReply) => {
            const { purposeId } = purposeIdParamSchema.parse(request.params);
            const { userId, tenantId } = getCurrentUser(request);
            const requestInfo = getRequestInfo(request);

            await purposeService.delete(purposeId, tenantId, userId, requestInfo);

            return {
                success: true,
                message: 'Purpose deleted successfully',
            };
        }
    );

    /**
     * POST /tenant/websites/:id/purposes/reorder
     * Reorder purposes
     */
    app.post<{ Params: { id: string } }>(
        '/websites/:id/purposes/reorder',
        async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
            const { id: websiteId } = websiteIdParamSchema.parse(request.params);
            const input = z.object({
                orders: z.array(z.object({
                    id: z.string().uuid(),
                    displayOrder: z.number().int().min(0),
                })),
            }).parse(request.body);
            const { userId, tenantId } = getCurrentUser(request);
            const requestInfo = getRequestInfo(request);

            await purposeService.reorder(
                websiteId,
                tenantId,
                userId,
                input.orders,
                requestInfo
            );

            return {
                success: true,
                message: 'Purposes reordered successfully',
            };
        }
    );
}
