import { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { ZodError } from 'zod';

/**
 * Custom API Error class
 */
export class ApiError extends Error {
    statusCode: number;
    code?: string;

    constructor(message: string, statusCode: number = 400, code?: string) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.name = 'ApiError';
    }
}

/**
 * Global error handler for the application.
 * Standardizes error responses across all endpoints.
 */
export function errorHandler(
    error: FastifyError | Error | ZodError,
    request: FastifyRequest,
    reply: FastifyReply
): void {
    // Log error
    console.error('[ERROR]', {
        url: request.url,
        method: request.method,
        error: error.message,
        stack: error.stack,
    });

    // Handle Zod validation errors
    if (error instanceof ZodError) {
        reply.status(400).send({
            success: false,
            message: 'Validation failed',
            errors: error.errors.map((e) => ({
                field: e.path.join('.'),
                message: e.message,
            })),
        });
        return;
    }

    // Handle custom API errors
    if (error instanceof ApiError) {
        reply.status(error.statusCode).send({
            success: false,
            message: error.message,
            code: error.code,
        });
        return;
    }

    // Handle Fastify errors
    if ('statusCode' in error) {
        const fastifyError = error as FastifyError;
        reply.status(fastifyError.statusCode || 500).send({
            success: false,
            message: fastifyError.message,
            code: fastifyError.code,
        });
        return;
    }

    // Handle known error messages
    const errorMessage = error.message.toLowerCase();

    if (errorMessage.includes('not found')) {
        reply.status(404).send({
            success: false,
            message: error.message,
        });
        return;
    }

    if (errorMessage.includes('unauthorized') ||
        errorMessage.includes('authentication') ||
        errorMessage.includes('invalid email or password')) {
        reply.status(401).send({
            success: false,
            message: error.message,
        });
        return;
    }

    if (errorMessage.includes('forbidden') ||
        errorMessage.includes('not allowed') ||
        errorMessage.includes('cannot')) {
        reply.status(403).send({
            success: false,
            message: error.message,
        });
        return;
    }

    if (errorMessage.includes('already exists') ||
        errorMessage.includes('duplicate')) {
        reply.status(409).send({
            success: false,
            message: error.message,
        });
        return;
    }

    // Default to internal server error
    // In production, don't expose internal error details
    const isProduction = process.env.NODE_ENV === 'production';
    reply.status(500).send({
        success: false,
        message: isProduction ? 'Internal server error' : error.message,
    });
}

/**
 * Not found handler for undefined routes
 */
export function notFoundHandler(
    request: FastifyRequest,
    reply: FastifyReply
): void {
    reply.status(404).send({
        success: false,
        message: `Route ${request.method} ${request.url} not found`,
    });
}
