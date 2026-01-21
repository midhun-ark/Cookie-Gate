/**
 * Privacy Team Routes
 * 
 * API endpoints for managing privacy team members
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { privacyTeamService } from '../services/privacy-team.service';
import { createTeamMemberSchema, updateTeamMemberSchema, updateStatusSchema } from '../validators/privacy-team.validator';
import { authMiddleware, requirePasswordReset, getCurrentUser, getRequestInfo } from '../middleware';

/**
 * Privacy Team Routes
 */
export async function privacyTeamRoutes(app: FastifyInstance): Promise<void> {
    // All routes require authentication
    app.addHook('preHandler', authMiddleware);
    app.addHook('preHandler', requirePasswordReset);

    /**
     * GET /tenant/privacy-team
     * List all privacy team members
     */
    app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
        const { tenantId } = getCurrentUser(request);
        const members = await privacyTeamService.listMembers(tenantId);
        return { success: true, data: members };
    });

    /**
     * GET /tenant/privacy-team/active
     * List active team members (for assignment dropdowns)
     */
    app.get('/active', async (request: FastifyRequest, reply: FastifyReply) => {
        const { tenantId } = getCurrentUser(request);
        const members = await privacyTeamService.listActiveMembers(tenantId);
        return { success: true, data: members };
    });

    /**
     * GET /tenant/privacy-team/:id
     * Get a specific team member
     */
    app.get<{ Params: { id: string } }>(
        '/:id',
        async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
            const { tenantId } = getCurrentUser(request);
            const member = await privacyTeamService.getMember(request.params.id, tenantId);

            if (!member) {
                return reply.status(404).send({
                    success: false,
                    message: 'Team member not found',
                });
            }

            return { success: true, data: member };
        }
    );

    /**
     * POST /tenant/privacy-team
     * Add a new team member
     */
    app.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
        const validation = createTeamMemberSchema.safeParse(request.body);
        if (!validation.success) {
            return reply.status(400).send({
                success: false,
                errors: validation.error.errors.map(e => ({
                    field: e.path.join('.'),
                    message: e.message,
                })),
            });
        }

        try {
            const { userId, tenantId, email } = getCurrentUser(request);
            const { ipAddress } = getRequestInfo(request);

            const member = await privacyTeamService.addMember(
                { ...validation.data, tenantId },
                userId,
                email,
                ipAddress
            );

            return reply.status(201).send({ success: true, data: member });
        } catch (error: any) {
            return reply.status(400).send({
                success: false,
                message: error.message,
            });
        }
    });

    /**
     * PUT /tenant/privacy-team/:id
     * Update a team member
     */
    app.put<{ Params: { id: string } }>(
        '/:id',
        async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
            const validation = updateTeamMemberSchema.safeParse(request.body);
            if (!validation.success) {
                return reply.status(400).send({
                    success: false,
                    errors: validation.error.errors.map(e => ({
                        field: e.path.join('.'),
                        message: e.message,
                    })),
                });
            }

            try {
                const { userId, tenantId, email } = getCurrentUser(request);
                const { ipAddress } = getRequestInfo(request);

                const member = await privacyTeamService.updateMember(
                    request.params.id,
                    tenantId,
                    validation.data,
                    userId,
                    email,
                    ipAddress
                );

                return { success: true, data: member };
            } catch (error: any) {
                if (error.message === 'Team member not found') {
                    return reply.status(404).send({
                        success: false,
                        message: error.message,
                    });
                }
                return reply.status(400).send({
                    success: false,
                    message: error.message,
                });
            }
        }
    );

    /**
     * PATCH /tenant/privacy-team/:id/status
     * Toggle team member status (active/inactive)
     */
    app.patch<{ Params: { id: string } }>(
        '/:id/status',
        async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
            const validation = updateStatusSchema.safeParse(request.body);
            if (!validation.success) {
                return reply.status(400).send({
                    success: false,
                    errors: validation.error.errors.map(e => ({
                        field: e.path.join('.'),
                        message: e.message,
                    })),
                });
            }

            try {
                const { userId, tenantId, email } = getCurrentUser(request);
                const { ipAddress } = getRequestInfo(request);

                const member = await privacyTeamService.toggleStatus(
                    request.params.id,
                    tenantId,
                    validation.data.status,
                    userId,
                    email,
                    ipAddress
                );

                return { success: true, data: member };
            } catch (error: any) {
                if (error.message === 'Team member not found') {
                    return reply.status(404).send({
                        success: false,
                        message: error.message,
                    });
                }
                return reply.status(400).send({
                    success: false,
                    message: error.message,
                });
            }
        }
    );

    /**
     * DELETE /tenant/privacy-team/:id
     * Delete a team member
     */
    app.delete<{ Params: { id: string } }>(
        '/:id',
        async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
            try {
                const { userId, tenantId, email } = getCurrentUser(request);
                const { ipAddress } = getRequestInfo(request);

                await privacyTeamService.deleteMember(
                    request.params.id,
                    tenantId,
                    userId,
                    email,
                    ipAddress
                );

                return { success: true, message: 'Team member deleted' };
            } catch (error: any) {
                if (error.message === 'Team member not found') {
                    return reply.status(404).send({
                        success: false,
                        message: error.message,
                    });
                }
                return reply.status(400).send({
                    success: false,
                    message: error.message,
                });
            }
        }
    );
}
