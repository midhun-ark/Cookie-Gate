/**
 * DPR Admin Routes (Authenticated)
 * 
 * API endpoints for tenant admin to manage Data Principal Requests
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { dprService } from '../services/dpr.service';
import {
    assignRequestSchema,
    updateSlaSchema,
    respondSchema,
    listFiltersSchema,
    updateSlaConfigSchema,
} from '../validators/dpr.validator';
import { authMiddleware, requirePasswordReset, getCurrentUser, getRequestInfo } from '../middleware';

/**
 * DPR Admin Routes
 */
export async function dprRoutes(app: FastifyInstance): Promise<void> {
    // All routes require authentication
    app.addHook('preHandler', authMiddleware);
    app.addHook('preHandler', requirePasswordReset);

    /**
     * GET /tenant/data-principal-requests
     * List all requests with filters
     */
    app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
        const { tenantId } = getCurrentUser(request);
        const queryParams = listFiltersSchema.safeParse(request.query);
        const filters = queryParams.success ? queryParams.data : {};

        const requests = await dprService.listRequests({
            tenantId,
            ...filters,
        });

        // Add SLA state to each request
        const slaConfig = await dprService.getSlaConfig(tenantId);
        const requestsWithSlaState = requests.map(req => ({
            ...req,
            slaState: dprService.getSlaState(
                req.slaDueDate,
                req.status,
                slaConfig.warningThresholdDays
            ),
        }));

        return { success: true, data: requestsWithSlaState };
    });

    /**
     * GET /tenant/data-principal-requests/sla-config
     * Get SLA configuration
     */
    app.get('/sla-config', async (request: FastifyRequest, reply: FastifyReply) => {
        const { tenantId } = getCurrentUser(request);
        const config = await dprService.getSlaConfig(tenantId);
        return { success: true, data: config };
    });

    /**
     * PUT /tenant/data-principal-requests/sla-config
     * Update SLA configuration
     */
    app.put('/sla-config', async (request: FastifyRequest, reply: FastifyReply) => {
        const validation = updateSlaConfigSchema.safeParse(request.body);
        if (!validation.success) {
            return reply.status(400).send({
                success: false,
                errors: validation.error.errors.map(e => ({
                    field: e.path.join('.'),
                    message: e.message,
                })),
            });
        }

        const { userId, tenantId, email } = getCurrentUser(request);
        const config = await dprService.updateSlaConfig(
            tenantId,
            validation.data,
            userId,
            email
        );

        return { success: true, data: config };
    });

    /**
     * GET /tenant/data-principal-requests/:id
     * Get request details
     */
    app.get<{ Params: { id: string } }>(
        '/:id',
        async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
            const { tenantId } = getCurrentUser(request);
            const dpr = await dprService.getRequest(request.params.id, tenantId);

            if (!dpr) {
                return reply.status(404).send({
                    success: false,
                    message: 'Request not found',
                });
            }

            // Add SLA state
            const slaConfig = await dprService.getSlaConfig(tenantId);
            const slaState = dprService.getSlaState(
                dpr.slaDueDate,
                dpr.status,
                slaConfig.warningThresholdDays
            );

            return { success: true, data: { ...dpr, slaState } };
        }
    );

    /**
     * GET /tenant/data-principal-requests/:id/communications
     * Get request communication timeline
     */
    app.get<{ Params: { id: string } }>(
        '/:id/communications',
        async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
            try {
                const { tenantId } = getCurrentUser(request);
                const communications = await dprService.getCommunications(
                    request.params.id,
                    tenantId
                );
                return { success: true, data: communications };
            } catch (error: any) {
                return reply.status(404).send({
                    success: false,
                    message: error.message,
                });
            }
        }
    );

    /**
     * GET /tenant/data-principal-requests/:id/audit
     * Get request audit log
     */
    app.get<{ Params: { id: string } }>(
        '/:id/audit',
        async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
            try {
                const { tenantId } = getCurrentUser(request);
                const audit = await dprService.getAuditLog(request.params.id, tenantId);
                return { success: true, data: audit };
            } catch (error: any) {
                return reply.status(404).send({
                    success: false,
                    message: error.message,
                });
            }
        }
    );

    /**
     * PUT /tenant/data-principal-requests/:id/assign
     * Assign request to team member
     */
    app.put<{ Params: { id: string } }>(
        '/:id/assign',
        async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
            const validation = assignRequestSchema.safeParse(request.body);
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

                const updated = await dprService.assignRequest(
                    request.params.id,
                    tenantId,
                    validation.data.assignedTo,
                    userId,
                    email,
                    ipAddress
                );
                return { success: true, data: updated };
            } catch (error: any) {
                const status = error.message === 'Request not found' ? 404 : 400;
                return reply.status(status).send({
                    success: false,
                    message: error.message,
                });
            }
        }
    );

    /**
     * PUT /tenant/data-principal-requests/:id/sla
     * Update SLA for request
     */
    app.put<{ Params: { id: string } }>(
        '/:id/sla',
        async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
            const validation = updateSlaSchema.safeParse(request.body);
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

                const updated = await dprService.updateSla(
                    request.params.id,
                    tenantId,
                    validation.data.slaDays,
                    userId,
                    email,
                    ipAddress
                );
                return { success: true, data: updated };
            } catch (error: any) {
                const status = error.message === 'Request not found' ? 404 : 400;
                return reply.status(status).send({
                    success: false,
                    message: error.message,
                });
            }
        }
    );

    /**
     * POST /tenant/data-principal-requests/:id/start
     * Start work on request (SUBMITTED -> WORK_IN_PROGRESS)
     */
    app.post<{ Params: { id: string } }>(
        '/:id/start',
        async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
            try {
                const { userId, tenantId, email } = getCurrentUser(request);
                const { ipAddress } = getRequestInfo(request);

                const updated = await dprService.startWork(
                    request.params.id,
                    tenantId,
                    userId,
                    email,
                    ipAddress
                );
                return { success: true, data: updated };
            } catch (error: any) {
                const status = error.message === 'Request not found' ? 404 : 400;
                return reply.status(status).send({
                    success: false,
                    message: error.message,
                });
            }
        }
    );

    /**
     * POST /tenant/data-principal-requests/:id/respond
     * Respond to request (WORK_IN_PROGRESS -> RESPONDED)
     */
    app.post<{ Params: { id: string } }>(
        '/:id/respond',
        async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
            const validation = respondSchema.safeParse(request.body);
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

                const updated = await dprService.respond(
                    request.params.id,
                    tenantId,
                    validation.data.outcome,
                    validation.data.reason,
                    validation.data.attachments,
                    userId,
                    email,
                    ipAddress
                );
                return { success: true, data: updated };
            } catch (error: any) {
                const status = error.message === 'Request not found' ? 404 : 400;
                return reply.status(status).send({
                    success: false,
                    message: error.message,
                });
            }
        }
    );

    /**
     * POST /tenant/data-principal-requests/:id/close
     * Close request (RESPONDED -> RESOLVED)
     */
    app.post<{ Params: { id: string } }>(
        '/:id/close',
        async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
            try {
                const { userId, tenantId, email } = getCurrentUser(request);
                const { ipAddress } = getRequestInfo(request);

                const updated = await dprService.closeRequest(
                    request.params.id,
                    tenantId,
                    userId,
                    email,
                    ipAddress
                );
                return { success: true, data: updated };
            } catch (error: any) {
                const status = error.message === 'Request not found' ? 404 : 400;
                return reply.status(status).send({
                    success: false,
                    message: error.message,
                });
            }
        }
    );
}
