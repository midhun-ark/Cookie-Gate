import { FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db';

// Extend FastifyRequest to include admin context
declare module 'fastify' {
    interface FastifyRequest {
        admin?: {
            id: string;
            email: string;
        };
    }
}

/**
 * Middleware to require Super Admin authentication.
 * 
 * STRATEGY (Phase 1):
 * - Validates 'x-admin-id' header against the database.
 * - Simulates a session for internal governance use.
 */
export const requireAuth = async (req: FastifyRequest, reply: FastifyReply) => {
    const adminId = req.headers['x-admin-id'] as string;

    if (!adminId) {
        return reply.unauthorized('Missing authentication header');
    }

    // Validate existence in DB
    // This is cheap enough for internal tool volume
    const res = await db.query('SELECT id, email FROM super_admin WHERE id = $1', [adminId]);

    if (res.rowCount === 0) {
        return reply.unauthorized('Invalid authentication credentials');
    }

    // Decorate request
    req.admin = {
        id: res.rows[0].id,
        email: res.rows[0].email
    };
};
