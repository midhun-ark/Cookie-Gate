import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { versionService } from '../services';
import {
    authMiddleware,
    requirePasswordReset,
    getRequestInfo,
    getCurrentUser
} from '../middleware';
import { z } from 'zod';

// Validation schemas
const websiteIdParamSchema = z.object({
    websiteId: z.string().uuid('Invalid website ID'),
});

const versionIdParamSchema = z.object({
    versionId: z.string().uuid('Invalid version ID'),
});

const updateVersionNameSchema = z.object({
    versionName: z.string().min(1, 'Version name is required').max(100, 'Version name must be 100 characters or less'),
});

/**
 * Version Routes
 */
export async function versionRoutes(app: FastifyInstance): Promise<void> {
    // All routes require authentication and password reset completion
    app.addHook('preHandler', authMiddleware);
    app.addHook('preHandler', requirePasswordReset);

    /**
     * GET /tenant/websites/:websiteId/versions
     * List all versions for a website
     */
    app.get<{ Params: { websiteId: string } }>(
        '/websites/:websiteId/versions',
        async (request: FastifyRequest<{ Params: { websiteId: string } }>, reply: FastifyReply) => {
            const { websiteId } = websiteIdParamSchema.parse(request.params);
            const { tenantId } = getCurrentUser(request);

            const versions = await versionService.getVersions(websiteId, tenantId);

            return {
                success: true,
                data: versions,
            };
        }
    );

    /**
     * GET /tenant/websites/:websiteId/versions/active
     * Get the active version for a website
     */
    app.get<{ Params: { websiteId: string } }>(
        '/websites/:websiteId/versions/active',
        async (request: FastifyRequest<{ Params: { websiteId: string } }>, reply: FastifyReply) => {
            const { websiteId } = websiteIdParamSchema.parse(request.params);
            const { tenantId } = getCurrentUser(request);

            const version = await versionService.getActiveVersion(websiteId, tenantId);

            return {
                success: true,
                data: version,
            };
        }
    );

    /**
     * POST /tenant/websites/:websiteId/versions
     * Create a new version (copies from latest)
     */
    app.post<{ Params: { websiteId: string } }>(
        '/websites/:websiteId/versions',
        async (request: FastifyRequest<{ Params: { websiteId: string } }>, reply: FastifyReply) => {
            const { websiteId } = websiteIdParamSchema.parse(request.params);
            const { userId, tenantId } = getCurrentUser(request);
            const requestInfo = getRequestInfo(request);

            const version = await versionService.createVersion(
                websiteId,
                tenantId,
                userId,
                requestInfo
            );

            return reply.status(201).send({
                success: true,
                data: version,
                message: 'Version created successfully',
            });
        }
    );

    /**
     * GET /tenant/versions/:versionId
     * Get a single version by ID
     */
    app.get<{ Params: { versionId: string } }>(
        '/versions/:versionId',
        async (request: FastifyRequest<{ Params: { versionId: string } }>, reply: FastifyReply) => {
            const { versionId } = versionIdParamSchema.parse(request.params);
            const { tenantId } = getCurrentUser(request);

            const version = await versionService.getVersion(versionId, tenantId);

            return {
                success: true,
                data: version,
            };
        }
    );

    /**
     * PATCH /tenant/versions/:versionId
     * Update version name
     */
    app.patch<{ Params: { versionId: string } }>(
        '/versions/:versionId',
        async (request: FastifyRequest<{ Params: { versionId: string } }>, reply: FastifyReply) => {
            const { versionId } = versionIdParamSchema.parse(request.params);
            const { versionName } = updateVersionNameSchema.parse(request.body);
            const { userId, tenantId } = getCurrentUser(request);
            const requestInfo = getRequestInfo(request);

            const version = await versionService.updateVersionName(
                versionId,
                tenantId,
                userId,
                versionName,
                requestInfo
            );

            return {
                success: true,
                data: version,
                message: 'Version name updated',
            };
        }
    );

    /**
     * POST /tenant/versions/:versionId/activate
     * Activate a version (archives current active)
     */
    app.post<{ Params: { versionId: string } }>(
        '/versions/:versionId/activate',
        async (request: FastifyRequest<{ Params: { versionId: string } }>, reply: FastifyReply) => {
            const { versionId } = versionIdParamSchema.parse(request.params);
            const { userId, tenantId } = getCurrentUser(request);
            const requestInfo = getRequestInfo(request);

            const version = await versionService.activateVersion(
                versionId,
                tenantId,
                userId,
                requestInfo
            );

            return {
                success: true,
                data: version,
                message: 'Version activated successfully',
            };
        }
    );

    /**
     * POST /tenant/versions/:versionId/archive
     * Archive a draft version (discard without activating)
     */
    app.post<{ Params: { versionId: string } }>(
        '/versions/:versionId/archive',
        async (request: FastifyRequest<{ Params: { versionId: string } }>, reply: FastifyReply) => {
            const { versionId } = versionIdParamSchema.parse(request.params);
            const { userId, tenantId } = getCurrentUser(request);
            const requestInfo = getRequestInfo(request);

            const version = await versionService.archiveVersion(
                versionId,
                tenantId,
                userId,
                requestInfo
            );

            return {
                success: true,
                data: version,
                message: 'Draft version archived successfully',
            };
        }
    );
}
