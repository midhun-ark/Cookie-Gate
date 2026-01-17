import { FastifyInstance } from 'fastify';
import { requireAuth } from '../middleware/require-auth';
import {
    createRules,
    activateRules,
    getActiveRules,
    listRuleVersions
} from '../global-rules';

export async function rulesRoutes(app: FastifyInstance) {
    // Apply auth guard
    app.addHook('preHandler', requireAuth);

    // List Versions
    app.get('/', async (req, reply) => {
        const versions = await listRuleVersions();
        return { versions };
    });

    // Get Active
    app.get('/active', async (req, reply) => {
        const rule = await getActiveRules();
        return { activeRule: rule };
    });

    // Create Rules (Draft)
    app.post('/', async (req: any, reply) => {
        const body = req.body || {};
        try {
            const rule = await createRules(req.admin!.id, body);
            return { success: true, rule };
        } catch (err: any) {
            return reply.badRequest(err.message);
        }
    });

    // Activate Rules
    app.post('/:id/activate', async (req: any, reply) => {
        const { id } = req.params;
        try {
            const rule = await activateRules(req.admin!.id, id);
            return { success: true, rule };
        } catch (err: any) {
            return reply.badRequest(err.message);
        }
    });
}
