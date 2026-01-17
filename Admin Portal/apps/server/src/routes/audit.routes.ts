import { FastifyInstance } from 'fastify';
import { requireAuth } from '../middleware/require-auth';
import { db } from '../db';

export async function auditRoutes(app: FastifyInstance) {
    app.addHook('preHandler', requireAuth);

    // List Audit Logs
    app.get('/', async (req, reply) => {
        // Simple pagination/limit can be added later, currently fetching last 100 for governance UI
        const limit = 100;
        const res = await db.query(
            'SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT $1',
            [limit]
        );
        return { logs: res.rows };
    });
}
