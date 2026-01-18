import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { noticeService } from '../services';
import {
    createNoticeSchema,
    updateNoticeTranslationSchema,
    batchUpdateTranslationsSchema,
    websiteIdParamSchema,
    noticeIdParamSchema,
    autoTranslateNoticeSchema
} from '../validators';
import {
    authMiddleware,
    requirePasswordReset,
    getRequestInfo,
    getCurrentUser
} from '../middleware';

/**
 * Notice Routes
 */
export async function noticeRoutes(app: FastifyInstance): Promise<void> {
    // All routes require authentication
    app.addHook('preHandler', authMiddleware);
    app.addHook('preHandler', requirePasswordReset);

    /**
     * GET /tenant/websites/:id/notices
     * Get notice for a website
     */
    app.get<{ Params: { id: string } }>(
        '/websites/:id/notices',
        async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
            const { id: websiteId } = websiteIdParamSchema.parse(request.params);
            const { tenantId } = getCurrentUser(request);

            const notice = await noticeService.getByWebsiteId(websiteId, tenantId);

            return {
                success: true,
                data: notice,
            };
        }
    );

    /**
     * POST /tenant/websites/:id/notices
     * Create notice for a website
     */
    app.post<{ Params: { id: string } }>(
        '/websites/:id/notices',
        async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
            const { id: websiteId } = websiteIdParamSchema.parse(request.params);
            const input = createNoticeSchema.parse(request.body);
            const { userId, tenantId } = getCurrentUser(request);
            const requestInfo = getRequestInfo(request);

            const notice = await noticeService.create(
                websiteId,
                tenantId,
                userId,
                input,
                requestInfo
            );

            return reply.status(201).send({
                success: true,
                data: notice,
                message: 'Notice created successfully',
            });
        }
    );

    /**
     * PATCH /tenant/notices/:noticeId/translations
     * Update notice translations (batch)
     */
    app.patch<{ Params: { noticeId: string } }>(
        '/notices/:noticeId/translations',
        async (request: FastifyRequest<{ Params: { noticeId: string } }>, reply: FastifyReply) => {
            const { noticeId } = noticeIdParamSchema.parse(request.params);
            const input = batchUpdateTranslationsSchema.parse(request.body);
            const { userId, tenantId } = getCurrentUser(request);
            const requestInfo = getRequestInfo(request);

            const translations = await noticeService.batchUpsertTranslations(
                noticeId,
                tenantId,
                userId,
                input.translations,
                input.dpoEmail,
                requestInfo
            );

            return {
                success: true,
                data: translations,
                message: 'Translations updated successfully',
            };
        }
    );

    // ... (Put / Delete / Get methods remain same)

    /**
     * PUT /tenant/notices/:noticeId/translations/:languageCode
     * Add or update a single translation
     */
    app.put<{ Params: { noticeId: string; languageCode: string } }>(
        '/notices/:noticeId/translations/:languageCode',
        async (
            request: FastifyRequest<{ Params: { noticeId: string; languageCode: string } }>,
            reply: FastifyReply
        ) => {
            const { noticeId, languageCode } = request.params;
            const input = updateNoticeTranslationSchema.parse({
                ...request.body as object,
                languageCode,
            });
            const { userId, tenantId } = getCurrentUser(request);
            const requestInfo = getRequestInfo(request);

            const translation = await noticeService.upsertTranslation(
                noticeId,
                tenantId,
                userId,
                input,
                requestInfo
            );

            return {
                success: true,
                data: translation,
                message: 'Translation updated successfully',
            };
        }
    );

    /**
     * DELETE /tenant/notices/:noticeId/translations/:languageCode
     * Delete a translation (cannot delete English)
     */
    app.delete<{ Params: { noticeId: string; languageCode: string } }>(
        '/notices/:noticeId/translations/:languageCode',
        async (
            request: FastifyRequest<{ Params: { noticeId: string; languageCode: string } }>,
            reply: FastifyReply
        ) => {
            const { noticeId, languageCode } = request.params;
            const { userId, tenantId } = getCurrentUser(request);
            const requestInfo = getRequestInfo(request);

            await noticeService.deleteTranslation(
                noticeId,
                languageCode,
                tenantId,
                userId,
                requestInfo
            );

            return {
                success: true,
                message: 'Translation deleted successfully',
            };
        }
    );

    /**
     * GET /tenant/notices/:noticeId/translations
     * Get all translations for a notice
     */
    app.get<{ Params: { noticeId: string } }>(
        '/notices/:noticeId/translations',
        async (request: FastifyRequest<{ Params: { noticeId: string } }>, reply: FastifyReply) => {
            const { noticeId } = noticeIdParamSchema.parse(request.params);
            const { tenantId } = getCurrentUser(request);

            const translations = await noticeService.getTranslations(noticeId, tenantId);

            return {
                success: true,
                data: translations,
            };
        }
    );
    /**
     * POST /tenant/websites/:id/notices/auto-translate
     * Auto translate and persist notice
     */
    app.post<{ Params: { id: string } }>(
        '/websites/:id/notices/auto-translate',
        async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
            const { id: websiteId } = websiteIdParamSchema.parse(request.params);
            const { targetLang } = autoTranslateNoticeSchema.parse(request.body);
            const { userId, tenantId } = getCurrentUser(request);
            const requestInfo = getRequestInfo(request);

            const translation = await noticeService.autoTranslate(
                websiteId,
                targetLang,
                tenantId,
                userId,
                requestInfo
            );

            return {
                success: true,
                data: translation,
                message: 'Translation generated and saved successfully',
            };
        }
    );

    /**
     * POST /tenant/websites/:id/notices/auto-translate-batch
     * Auto translate batch
     */
    app.post<{ Params: { id: string } }>(
        '/websites/:id/notices/auto-translate-batch',
        async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
            const { id: websiteId } = websiteIdParamSchema.parse(request.params);
            // using cast to any for schema import if it fails below, but ideally it works
            const { targetLangs } = (require('../validators').batchAutoTranslateNoticeSchema).parse(request.body);
            const { userId, tenantId } = getCurrentUser(request);
            const requestInfo = getRequestInfo(request);

            const translations = await noticeService.batchAutoTranslate(
                websiteId,
                targetLangs,
                tenantId,
                userId,
                requestInfo
            );

            return {
                success: true,
                data: translations,
                message: `Successfully processed ${translations.length} translations`,
            };
        }
    );
}
