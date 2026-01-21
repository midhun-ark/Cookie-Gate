/**
 * DPR Intake Routes (Public - No Auth)
 * 
 * Endpoints for Data Principal to submit requests via cookie banner
 */

import { FastifyPluginAsync } from 'fastify';
import { dprIntakeService } from '../services/dpr.service';
import { sendOtpSchema, verifyOtpSchema } from '../validators/dpr.validator';

export const dprIntakeRoutes: FastifyPluginAsync = async (fastify) => {
    /**
     * POST /runtime/dpr/send-otp
     * Send OTP to data principal email for verification
     */
    fastify.post('/dpr/send-otp', async (request, reply) => {
        const validation = sendOtpSchema.safeParse(request.body);
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
            const result = await dprIntakeService.sendOtp({
                websiteId: validation.data.websiteId,
                email: validation.data.email,
                requestType: validation.data.requestType,
                requestPayload: validation.data.requestPayload,
                submissionLanguage: validation.data.submissionLanguage,
            });

            return { success: true, message: result.message };
        } catch (error: any) {
            return reply.status(400).send({
                success: false,
                message: error.message,
            });
        }
    });

    /**
     * POST /runtime/dpr/verify-otp
     * Verify OTP and create request
     */
    fastify.post('/dpr/verify-otp', async (request, reply) => {
        const validation = verifyOtpSchema.safeParse(request.body);
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
            const result = await dprIntakeService.verifyOtpAndCreateRequest(
                validation.data.email,
                validation.data.otp
            );

            return {
                success: true,
                data: {
                    requestId: result.requestId,
                    requestNumber: result.requestNumber,
                },
            };
        } catch (error: any) {
            return reply.status(400).send({
                success: false,
                message: error.message,
            });
        }
    });

    /**
     * GET /runtime/dpr/:id/status
     * Get public status of a request (for data principal)
     */
    fastify.get<{ Params: { id: string } }>('/dpr/:id/status', async (request, reply) => {
        const status = await dprIntakeService.getPublicStatus(request.params.id);

        if (!status) {
            return reply.status(404).send({
                success: false,
                message: 'Request not found',
            });
        }

        return { success: true, data: status };
    });
};
