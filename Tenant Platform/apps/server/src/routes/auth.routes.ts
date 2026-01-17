import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authService } from '../services';
import { loginSchema, forceResetPasswordSchema, resetPasswordSchema } from '../validators';
import { authMiddleware, getRequestInfo, getCurrentUser, requirePasswordReset } from '../middleware';
import { config } from '../config';

/**
 * Authentication Routes
 */
export async function authRoutes(app: FastifyInstance): Promise<void> {
    /**
     * POST /tenant/auth/login
     * Authenticate tenant admin user
     */
    app.post('/login', async (request: FastifyRequest, reply: FastifyReply) => {
        const input = loginSchema.parse(request.body);
        const requestInfo = getRequestInfo(request);

        const result = await authService.login(input, requestInfo);

        // Generate JWT token
        const token = app.jwt.sign(
            {
                userId: result.user.id,
                tenantId: result.user.tenantId,
                email: result.user.email,
                mustResetPassword: result.user.mustResetPassword,
            },
            { expiresIn: config.jwt.expiresIn }
        );

        // Set cookie for web clients
        reply.setCookie('tenant_token', token, {
            httpOnly: true,
            secure: config.session.secure,
            sameSite: config.session.sameSite,
            path: '/',
            maxAge: 3600, // 1 hour
        });

        return {
            success: true,
            data: {
                user: result.user,
                tenant: result.tenant,
                token,
                mustResetPassword: result.user.mustResetPassword,
            },
        };
    });

    /**
     * POST /tenant/auth/logout
     * Logout tenant admin user
     */
    app.post(
        '/logout',
        { preHandler: [authMiddleware] },
        async (request: FastifyRequest, reply: FastifyReply) => {
            const { userId, tenantId } = getCurrentUser(request);
            const requestInfo = getRequestInfo(request);

            await authService.logout(userId, tenantId, requestInfo);

            // Clear cookie
            reply.clearCookie('tenant_token', { path: '/' });

            return {
                success: true,
                message: 'Logged out successfully',
            };
        }
    );

    /**
     * POST /tenant/auth/force-reset-password
     * Force password reset on first login
     */
    app.post(
        '/force-reset-password',
        { preHandler: [authMiddleware] },
        async (request: FastifyRequest, reply: FastifyReply) => {
            const input = forceResetPasswordSchema.parse(request.body);
            const { userId, tenantId } = getCurrentUser(request);
            const requestInfo = getRequestInfo(request);

            const user = await authService.forceResetPassword(
                userId,
                tenantId,
                input,
                requestInfo
            );

            // Generate new token without mustResetPassword flag
            const token = app.jwt.sign(
                {
                    userId: user.id,
                    tenantId: user.tenantId,
                    email: user.email,
                    mustResetPassword: false,
                },
                { expiresIn: config.jwt.expiresIn }
            );

            // Update cookie
            reply.setCookie('tenant_token', token, {
                httpOnly: true,
                secure: config.session.secure,
                sameSite: config.session.sameSite,
                path: '/',
                maxAge: 3600,
            });

            return {
                success: true,
                data: {
                    user,
                    token,
                },
                message: 'Password reset successfully',
            };
        }
    );

    /**
     * POST /tenant/auth/reset-password
     * Voluntary password reset
     */
    app.post(
        '/reset-password',
        { preHandler: [authMiddleware, requirePasswordReset] },
        async (request: FastifyRequest, reply: FastifyReply) => {
            const input = resetPasswordSchema.parse(request.body);
            const { userId, tenantId } = getCurrentUser(request);
            const requestInfo = getRequestInfo(request);

            await authService.resetPassword(userId, tenantId, input, requestInfo);

            return {
                success: true,
                message: 'Password changed successfully',
            };
        }
    );

    /**
     * GET /tenant/auth/me
     * Get current user info
     */
    app.get(
        '/me',
        { preHandler: [authMiddleware] },
        async (request: FastifyRequest, reply: FastifyReply) => {
            return {
                success: true,
                data: {
                    user: request.authContext!.user,
                    tenant: request.authContext!.tenant,
                },
            };
        }
    );
}
