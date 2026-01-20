import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { bannerService } from '../services';
import {
    bannerCustomizationSchema,
    updateBannerCustomizationSchema
} from '../validators';
import {
    authMiddleware,
    requirePasswordReset,
    getRequestInfo,
    getCurrentUser
} from '../middleware';
import { z } from 'zod';

// Version ID param schema
const versionIdParamSchema = z.object({
    versionId: z.string().uuid('Invalid version ID'),
});

/**
 * Banner Customization Routes
 * Note: Banners now belong to website versions, not websites directly.
 */
export async function bannerRoutes(app: FastifyInstance): Promise<void> {
    // All routes require authentication
    app.addHook('preHandler', authMiddleware);
    app.addHook('preHandler', requirePasswordReset);

    /**
     * GET /tenant/versions/:versionId/banner
     * Get banner customization for a version
     */
    app.get<{ Params: { versionId: string } }>(
        '/versions/:versionId/banner',
        async (request: FastifyRequest<{ Params: { versionId: string } }>, reply: FastifyReply) => {
            const { versionId } = versionIdParamSchema.parse(request.params);
            const { tenantId } = getCurrentUser(request);

            const banner = await bannerService.getWithDefaults(versionId, tenantId);

            return {
                success: true,
                data: banner,
            };
        }
    );

    /**
     * POST /tenant/versions/:versionId/banner
     * Create or update banner customization
     */
    app.post<{ Params: { versionId: string } }>(
        '/versions/:versionId/banner',
        async (request: FastifyRequest<{ Params: { versionId: string } }>, reply: FastifyReply) => {
            const { versionId } = versionIdParamSchema.parse(request.params);
            const input = bannerCustomizationSchema.parse(request.body);
            const { userId, tenantId } = getCurrentUser(request);
            const requestInfo = getRequestInfo(request);

            const banner = await bannerService.upsert(
                versionId,
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
     * PATCH /tenant/versions/:versionId/banner
     * Partial update banner customization
     */
    app.patch<{ Params: { versionId: string } }>(
        '/versions/:versionId/banner',
        async (request: FastifyRequest<{ Params: { versionId: string } }>, reply: FastifyReply) => {
            const { versionId } = versionIdParamSchema.parse(request.params);
            const input = updateBannerCustomizationSchema.parse(request.body);
            const { userId, tenantId } = getCurrentUser(request);
            const requestInfo = getRequestInfo(request);

            const banner = await bannerService.update(
                versionId,
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
     * POST /tenant/versions/:versionId/banner/reset
     * Reset banner to defaults
     */
    app.post<{ Params: { versionId: string } }>(
        '/versions/:versionId/banner/reset',
        async (request: FastifyRequest<{ Params: { versionId: string } }>, reply: FastifyReply) => {
            const { versionId } = versionIdParamSchema.parse(request.params);
            const { userId, tenantId } = getCurrentUser(request);
            const requestInfo = getRequestInfo(request);

            const banner = await bannerService.resetToDefaults(
                versionId,
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
     * GET /tenant/versions/:versionId/banner/preview
     * Get banner preview HTML
     */
    app.get<{ Params: { versionId: string } }>(
        '/versions/:versionId/banner/preview',
        async (request: FastifyRequest<{ Params: { versionId: string } }>, reply: FastifyReply) => {
            const { versionId } = versionIdParamSchema.parse(request.params);
            const { tenantId } = getCurrentUser(request);

            const html = await bannerService.getPreviewHtml(versionId, tenantId);

            reply.type('text/html').send(html);
        }
    );

    // ==================== TRANSLATION ROUTES ====================

    /**
     * GET /tenant/versions/:versionId/banner/translations
     * Get all banner translations for a version
     */
    app.get<{ Params: { versionId: string } }>(
        '/versions/:versionId/banner/translations',
        async (request: FastifyRequest<{ Params: { versionId: string } }>, reply: FastifyReply) => {
            const { versionId } = versionIdParamSchema.parse(request.params);
            const { tenantId } = getCurrentUser(request);

            const translations = await bannerService.getTranslations(versionId, tenantId);

            return {
                success: true,
                data: translations,
            };
        }
    );

    /**
     * POST /tenant/versions/:versionId/banner/translations
     * Create or update banner translations
     */
    app.post<{ Params: { versionId: string } }>(
        '/versions/:versionId/banner/translations',
        async (request: FastifyRequest<{ Params: { versionId: string } }>, reply: FastifyReply) => {
            const { versionId } = versionIdParamSchema.parse(request.params);
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
                versionId,
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
