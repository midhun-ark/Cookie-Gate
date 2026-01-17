import { FastifyInstance } from 'fastify';
import { requireAuth } from '../middleware/require-auth';
import {
    createTenant,
    listTenants,
    suspendTenant,
    reactivateTenant
} from '../tenant';

export async function tenantRoutes(app: FastifyInstance) {
    // Apply auth guard to all routes in this prefix
    app.addHook('preHandler', requireAuth);

    // List Tenants
    app.get('/', async (req, reply) => {
        const tenants = await listTenants();
        return { tenants };
    });

    // Create Tenant
    app.post('/', async (req: any, reply) => {
        const { name } = req.body || {};
        try {
            const tenant = await createTenant(req.admin!.id, name);
            return { success: true, tenant };
        } catch (err: any) {
            return reply.badRequest(err.message);
        }
    });

    // Suspend Tenant
    app.post('/:id/suspend', async (req: any, reply) => {
        const { id } = req.params;
        try {
            const tenant = await suspendTenant(req.admin!.id, id);
            return { success: true, tenant };
        } catch (err: any) {
            return reply.badRequest(err.message);
        }
    });

    // Reactivate Tenant
    app.post('/:id/reactivate', async (req: any, reply) => {
        const { id } = req.params;
        try {
            const tenant = await reactivateTenant(req.admin!.id, id);
            return { success: true, tenant };
        } catch (err: any) {
            return reply.badRequest(err.message);
        }
    });
}
