import { FastifyInstance } from 'fastify';
import { runtimeService } from '../services/runtime.service';

/**
 * Runtime Routes.
 * Public endpoints for client-side loader to fetch website configuration.
 * These endpoints do NOT require authentication.
 */
export async function runtimeRoutes(app: FastifyInstance) {
    /**
     * GET /runtime/websites/:siteId
     * 
     * Fetches the complete website configuration for the consent banner.
     * This endpoint is called by the loader.js at runtime.
     * 
     * Response format:
     * {
     *   "defaultLanguage": "en",
     *   "supportedLanguages": ["en", "hi", "ml"],
     *   "notice": {
     *     "en": { "title": "...", "description": "..." },
     *     "hi": { "title": "...", "description": "..." }
     *   },
     *   "purposes": [
     *     {
     *       "key": "purpose-uuid",
     *       "required": true,
     *       "labels": {
     *         "en": { "title": "...", "description": "..." }
     *       }
     *     }
     *   ],
     *   "banner": { ... banner customization ... }
     * }
     */
    app.get('/runtime/websites/:siteId', async (request, reply) => {
        const { siteId } = request.params as { siteId: string };

        try {
            const config = await runtimeService.getWebsiteConfig(siteId);

            if (!config) {
                return reply.status(404).send({
                    success: false,
                    message: 'Website not found or not active',
                });
            }

            // Add CORS headers for cross-origin loader requests
            reply.header('Access-Control-Allow-Origin', '*');
            reply.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
            reply.header('Access-Control-Allow-Headers', 'Content-Type');
            reply.header('Cache-Control', 'public, max-age=60'); // 1 minute cache

            return reply.send(config);
        } catch (error) {
            console.error('Runtime config fetch error:', error);
            return reply.status(500).send({
                success: false,
                message: 'Failed to fetch website configuration',
            });
        }
    });

    /**
     * OPTIONS /runtime/websites/:siteId
     * Handle CORS preflight requests
     */
    app.options('/runtime/websites/:siteId', async (request, reply) => {
        reply.header('Access-Control-Allow-Origin', '*');
        reply.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
        reply.header('Access-Control-Allow-Headers', 'Content-Type');
        return reply.status(204).send();
    });

    /**
     * POST /runtime/consent
     * 
     * Receives consent choices from the loader.js and stores them in the database.
     * This creates an audit log for DPDPA/GDPR compliance.
     * 
     * Request body:
     * {
     *   "siteId": "uuid",
     *   "versionId": "uuid",
     *   "anonymousId": "uuid",
     *   "preferences": { "analytics": true, "marketing": false }
     * }
     */
    app.post('/runtime/consent', async (request, reply) => {
        // Add CORS headers
        reply.header('Access-Control-Allow-Origin', '*');
        reply.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
        reply.header('Access-Control-Allow-Headers', 'Content-Type');

        const body = request.body as {
            siteId: string;
            versionId: string;
            anonymousId: string;
            preferences: Record<string, boolean>;
        };

        // Validate required fields
        if (!body.siteId || !body.versionId || !body.anonymousId || !body.preferences) {
            return reply.status(400).send({
                success: false,
                message: 'Missing required fields: siteId, versionId, anonymousId, preferences',
            });
        }

        try {
            const result = await runtimeService.saveConsentLog({
                websiteId: body.siteId,
                websiteVersionId: body.versionId,
                anonymousId: body.anonymousId,
                preferences: body.preferences,
                userAgent: request.headers['user-agent'],
                ipAddress: request.ip,
            });

            if (result.success) {
                return reply.send({ success: true, id: result.id });
            } else {
                return reply.status(500).send({ success: false, message: result.error });
            }
        } catch (error) {
            console.error('Consent log error:', error);
            return reply.status(500).send({
                success: false,
                message: 'Failed to save consent',
            });
        }
    });

    /**
     * OPTIONS /runtime/consent
     * Handle CORS preflight for consent endpoint
     */
    app.options('/runtime/consent', async (request, reply) => {
        reply.header('Access-Control-Allow-Origin', '*');
        reply.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
        reply.header('Access-Control-Allow-Headers', 'Content-Type');
        return reply.status(204).send();
    });
}
