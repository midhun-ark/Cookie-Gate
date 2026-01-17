import Fastify from 'fastify';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import { authRoutes } from './routes/auth.routes';
import { tenantRoutes } from './routes/tenant.routes';
import { rulesRoutes } from './routes/rules.routes';
import { auditRoutes } from './routes/audit.routes';
import { tenantAdminRoutes } from './routes/tenant-admin.routes';

export const buildApp = async () => {
    const app = Fastify({
        logger: true
    });

    await app.register(cors);
    await app.register(sensible);

    // Register Routes
    await app.register(authRoutes, { prefix: '/auth' });
    await app.register(tenantRoutes, { prefix: '/tenants' });
    await app.register(rulesRoutes, { prefix: '/rules' });
    await app.register(auditRoutes, { prefix: '/audit-logs' });
    await app.register(tenantAdminRoutes, { prefix: '/tenant-admins' });

    return app;
};

// Start server if main module
if (require.main === module) {
    const start = async () => {
        try {
            const app = await buildApp();
            const port = 3000;
            await app.listen({ port, host: '0.0.0.0' });
            console.log(`🚀 Server listening on port ${port}`);
        } catch (err) {
            console.error(err);
            process.exit(1);
        }
    };
    start();
}
