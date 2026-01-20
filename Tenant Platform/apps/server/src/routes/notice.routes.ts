import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { noticeService } from '../services';
import {
    createNoticeSchema,
    updateNoticeTranslationSchema,
    batchUpdateTranslationsSchema,
    noticeIdParamSchema
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
 * Notice Routes
 * Note: Notices now belong to website versions, not websites directly.
 */
export async function noticeRoutes(app: FastifyInstance): Promise<void> {
    // All routes require authentication
    app.addHook('preHandler', authMiddleware);
    app.addHook('preHandler', requirePasswordReset);

    /**
     * GET /tenant/versions/:versionId/notices
     * Get notice for a version
     */
    app.get<{ Params: { versionId: string } }>(
        '/versions/:versionId/notices',
        async (request: FastifyRequest<{ Params: { versionId: string } }>, reply: FastifyReply) => {
            const { versionId } = versionIdParamSchema.parse(request.params);
            const { tenantId } = getCurrentUser(request);

            const notice = await noticeService.getByVersionId(versionId, tenantId);

            return {
                success: true,
                data: notice,
            };
        }
    );

    /**
     * POST /tenant/versions/:versionId/notices
     * Create notice for a version
     */
    app.post<{ Params: { versionId: string } }>(
        '/versions/:versionId/notices',
        async (request: FastifyRequest<{ Params: { versionId: string } }>, reply: FastifyReply) => {
            const { versionId } = versionIdParamSchema.parse(request.params);
            const input = createNoticeSchema.parse(request.body);
            const { userId, tenantId } = getCurrentUser(request);
            const requestInfo = getRequestInfo(request);

            const notice = await noticeService.create(
                versionId,
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
}
