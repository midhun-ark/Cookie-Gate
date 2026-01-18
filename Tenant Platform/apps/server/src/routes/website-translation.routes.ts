import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { websiteTranslationService } from '../services/website-translation.service';
import { websiteIdParamSchema } from '../validators';
import {
    authMiddleware,
    requirePasswordReset,
    getRequestInfo,
    getCurrentUser
} from '../middleware';
import z from 'zod';

const bulkTranslateSchema = z.object({
    targetLangs: z.array(z.string()).min(1, 'At least one target language is required')
});

/**
 * Website Translation Routes
 */
export async function websiteTranslationRoutes(app: FastifyInstance): Promise<void> {
    // All routes require authentication
    app.addHook('preHandler', authMiddleware);
    app.addHook('preHandler', requirePasswordReset);

    /**
     * POST /tenant/websites/:id/translate-all
     * Bulk translate all content for a website
     */
    app.post<{ Params: { id: string } }>(
        '/websites/:id/translate-all',
        async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
            const { id: websiteId } = websiteIdParamSchema.parse(request.params);
            const { targetLangs } = bulkTranslateSchema.parse(request.body);
            const { userId, tenantId } = getCurrentUser(request);
            const requestInfo = {
                ipAddress: getRequestInfo(request).ipAddress || '',
                userAgent: getRequestInfo(request).userAgent || ''
            };

            const result = await websiteTranslationService.translateAll(
                websiteId,
                targetLangs,
                tenantId,
                userId,
                requestInfo
            );

            return {
                success: true,
                data: result,
                message: 'Translation completed successfully'
            };
        }
    );
}
