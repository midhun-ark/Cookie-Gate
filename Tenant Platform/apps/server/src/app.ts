import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import sensible from '@fastify/sensible';

import { config } from './config';
import { errorHandler, notFoundHandler } from './middleware';
import {
    authRoutes,
    websiteRoutes,
    noticeRoutes,
    purposeRoutes,
    bannerRoutes,
    auditRoutes,
    languageRoutes,
} from './routes';
import { checkConnection } from './db';

/**
 * Build the Fastify application with all plugins and routes.
 */
export async function buildApp() {
    const app = Fastify({
        logger: {
            level: config.server.nodeEnv === 'development' ? 'info' : 'warn',
        },
    });

    // Register plugins
    await app.register(cors, {
        origin: config.cors.origins,
        credentials: true,
    });

    await app.register(cookie, {
        secret: config.session.secret,
    });

    await app.register(jwt, {
        secret: config.jwt.secret,
        cookie: {
            cookieName: 'tenant_token',
            signed: false,
        },
    });

    await app.register(sensible);

    // Global error handler
    app.setErrorHandler(errorHandler);
    app.setNotFoundHandler(notFoundHandler);

    // Health check
    app.get('/health', async () => {
        const dbConnected = await checkConnection();
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
            database: dbConnected ? 'connected' : 'disconnected',
        };
    });

    // API version prefix
    await app.register(async (api) => {
        // Auth routes (no /tenant prefix internally, but registered under /tenant/auth)
        await api.register(authRoutes, { prefix: '/auth' });

        // Website routes
        await api.register(websiteRoutes, { prefix: '/websites' });

        // Notice routes (mixed prefixes handled internally)
        await api.register(noticeRoutes, { prefix: '' });

        // Purpose routes (mixed prefixes handled internally)
        await api.register(purposeRoutes, { prefix: '' });

        // Banner routes
        await api.register(bannerRoutes, { prefix: '' });

        // Audit routes
        await api.register(auditRoutes, { prefix: '/audit-logs' });

        // Language routes
        await api.register(languageRoutes, { prefix: '/languages' });
    }, { prefix: '/tenant' });

    return app;
}

/**
 * Start the server if running directly
 */
async function main() {
    try {
        const app = await buildApp();

        // Check database connection
        const dbConnected = await checkConnection();
        if (!dbConnected) {
            console.error('❌ Failed to connect to database');
            process.exit(1);
        }
        console.log('✅ Database connected');

        // Start server
        await app.listen({
            port: config.server.port,
            host: '0.0.0.0',
        });

        console.log(`🚀 Tenant Platform server running on port ${config.server.port}`);
        console.log(`📝 Environment: ${config.server.nodeEnv}`);
        console.log(`🔗 Health check: http://localhost:${config.server.port}/health`);
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

// Run if main module
if (require.main === module) {
    main();
}
