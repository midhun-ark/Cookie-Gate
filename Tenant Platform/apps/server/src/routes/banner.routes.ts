import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { bannerService } from '../services';
import {
    bannerCustomizationSchema,
    updateBannerCustomizationSchema,
    websiteIdParamSchema
} from '../validators';
import {
    authMiddleware,
    requirePasswordReset,
    getRequestInfo,
    getCurrentUser
} from '../middleware';

/**
 * Banner Customization Routes
 */
export async function bannerRoutes(app: FastifyInstance): Promise<void> {
    // All routes require authentication
    app.addHook('preHandler', authMiddleware);
    app.addHook('preHandler', requirePasswordReset);

    /**
     * GET /tenant/websites/:id/banner
     * Get banner customization for a website
     */
    app.get<{ Params: { id: string } }>(
        '/websites/:id/banner',
        async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
            const { id: websiteId } = websiteIdParamSchema.parse(request.params);
            const { tenantId } = getCurrentUser(request);

            const banner = await bannerService.getWithDefaults(websiteId, tenantId);

            return {
                success: true,
                data: banner,
            };
        }
    );

    /**
     * POST /tenant/websites/:id/banner
     * Create or update banner customization
     */
    app.post<{ Params: { id: string } }>(
        '/websites/:id/banner',
        async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
            const { id: websiteId } = websiteIdParamSchema.parse(request.params);
            const input = bannerCustomizationSchema.parse(request.body);
            const { userId, tenantId } = getCurrentUser(request);
            const requestInfo = getRequestInfo(request);

            const banner = await bannerService.upsert(
                websiteId,
                tenantId,
                userId,
                input,
                requestInfo
            );

            return {
                success: true,
                data: banner,
                message: 'Banner customization saved successfully',
            };
        }
    );

    /**
     * PATCH /tenant/websites/:id/banner
     * Partial update banner customization
     */
    app.patch<{ Params: { id: string } }>(
        '/websites/:id/banner',
        async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
            const { id: websiteId } = websiteIdParamSchema.parse(request.params);
            const input = updateBannerCustomizationSchema.parse(request.body);
            const { userId, tenantId } = getCurrentUser(request);
            const requestInfo = getRequestInfo(request);

            const banner = await bannerService.update(
                websiteId,
                tenantId,
                userId,
                input,
                requestInfo
            );

            return {
                success: true,
                data: banner,
                message: 'Banner customization updated successfully',
            };
        }
    );

    /**
     * POST /tenant/websites/:id/banner/reset
     * Reset banner to defaults
     */
    app.post<{ Params: { id: string } }>(
        '/websites/:id/banner/reset',
        async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
            const { id: websiteId } = websiteIdParamSchema.parse(request.params);
            const { userId, tenantId } = getCurrentUser(request);
            const requestInfo = getRequestInfo(request);

            const banner = await bannerService.resetToDefaults(
                websiteId,
                tenantId,
                userId,
                requestInfo
            );

            return {
                success: true,
                data: banner,
                message: 'Banner reset to defaults',
            };
        }
    );

    /**
     * GET /tenant/websites/:id/banner/preview
     * Get banner preview HTML
     */
    app.get<{ Params: { id: string } }>(
        '/websites/:id/banner/preview',
        async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
            const { id: websiteId } = websiteIdParamSchema.parse(request.params);
            const { tenantId } = getCurrentUser(request);

            const html = await bannerService.getPreviewHtml(websiteId, tenantId);

            reply.type('text/html').send(html);
        }
    );

    // ==================== TRANSLATION ROUTES ====================

    /**
     * GET /tenant/websites/:id/banner/translations
     * Get all banner translations for a website
     */
    app.get<{ Params: { id: string } }>(
        '/websites/:id/banner/translations',
        async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
            const { id: websiteId } = websiteIdParamSchema.parse(request.params);
            const { tenantId } = getCurrentUser(request);

            // Verify website access
            const translations = await bannerService.getTranslations(websiteId, tenantId);

            return {
                success: true,
                data: translations,
            };
        }
    );

    /**
     * POST /tenant/websites/:id/banner/translations
     * Create or update banner translations
     */
    app.post<{ Params: { id: string } }>(
        '/websites/:id/banner/translations',
        async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
            const { id: websiteId } = websiteIdParamSchema.parse(request.params);
            const { userId, tenantId } = getCurrentUser(request);
            const requestInfo = getRequestInfo(request);
            const { translations } = request.body as {
                translations: Array<{
                    languageCode: string;
                    headlineText: string;
                    descriptionText: string;
                    acceptButtonText: string;
                    rejectButtonText: string;
                    preferencesButtonText: string;
                }>;
            };

            const result = await bannerService.upsertTranslations(
                websiteId,
                tenantId,
                userId,
                translations,
                requestInfo
            );

            return {
                success: true,
                data: result,
                message: 'Banner translations saved successfully',
            };
        }
    );
}
