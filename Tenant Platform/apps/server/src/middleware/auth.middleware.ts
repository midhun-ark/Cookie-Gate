import { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import { config } from '../config';
import { authService } from '../services';
import { AuthContext, JWTPayload } from '../types';

/**
 * Extend FastifyRequest to include auth context
 */
declare module 'fastify' {
    interface FastifyRequest {
        authContext?: AuthContext;
        jwtPayload?: JWTPayload;
    }
}

/**
 * Authentication middleware.
 * Verifies JWT token and attaches user context to request.
 */
export async function authMiddleware(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    try {
        // Get token from Authorization header or cookie
        const authHeader = request.headers.authorization;
        let token: string | undefined;

        if (authHeader?.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        } else if (request.cookies?.['tenant_token']) {
            token = request.cookies['tenant_token'];
        }

        if (!token) {
            return reply.status(401).send({
                success: false,
                message: 'Authentication required',
            });
        }

        // Verify JWT
        const app = request.server as FastifyInstance;
        const payload = app.jwt.verify<JWTPayload>(token);

        // Get full user context
        const context = await authService.getUserContext(payload.userId);

        if (!context) {
            return reply.status(401).send({
                success: false,
                message: 'User not found or inactive',
            });
        }

        // Attach to request
        request.jwtPayload = payload;
        request.authContext = context;
    } catch (error: any) {
        if (error.code === 'FST_JWT_NO_AUTHORIZATION_IN_HEADER' ||
            error.code === 'FST_JWT_AUTHORIZATION_TOKEN_INVALID' ||
            error.code === 'FST_JWT_AUTHORIZATION_TOKEN_EXPIRED') {
            return reply.status(401).send({
                success: false,
                message: 'Invalid or expired token',
            });
        }
        console.error('[AUTH] Middleware error:', error);
        return reply.status(401).send({
            success: false,
            message: 'Authentication failed',
        });
    }
}

/**
 * Middleware to check if password reset is required.
 * Blocks access to most endpoints until password is reset.
 */
export async function requirePasswordReset(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    if (request.authContext?.user.mustResetPassword) {
        return reply.status(403).send({
            success: false,
            message: 'Password reset required',
            code: 'PASSWORD_RESET_REQUIRED',
        });
    }
}

/**
 * Helper to get request info for audit logging
 */
export function getRequestInfo(request: FastifyRequest): {
    ipAddress?: string;
    userAgent?: string;
} {
    return {
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
    };
}

/**
 * Helper to get current user from request
 */
export function getCurrentUser(request: FastifyRequest): {
    userId: string;
    tenantId: string;
    email: string;
} {
    if (!request.authContext) {
        throw new Error('Authentication context not found');
    }
    return {
        userId: request.authContext.user.id,
        tenantId: request.authContext.tenant.id,
        email: request.authContext.user.email,
    };
}
