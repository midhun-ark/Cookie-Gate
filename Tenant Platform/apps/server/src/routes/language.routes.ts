import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { languageService } from '../services';
import { authMiddleware, requirePasswordReset } from '../middleware';

/**
 * Language Routes
 */
export async function languageRoutes(app: FastifyInstance): Promise<void> {
    // All routes require authentication
    app.addHook('preHandler', authMiddleware);
    app.addHook('preHandler', requirePasswordReset);

    /**
     * GET /tenant/languages
     * Get all supported languages
     */
    app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
        const languages = await languageService.getAll();

        return {
            success: true,
            data: languages,
        };
    });

    /**
     * GET /tenant/languages/:code
     * Get language by code
     */
    app.get<{ Params: { code: string } }>(
        '/:code',
        async (request: FastifyRequest<{ Params: { code: string } }>, reply: FastifyReply) => {
            const { code } = request.params;
            const language = await languageService.getByCode(code);

            if (!language) {
                return reply.status(404).send({
                    success: false,
                    message: 'Language not found',
                });
            }

            return {
                success: true,
                data: language,
            };
        }
    );
}
