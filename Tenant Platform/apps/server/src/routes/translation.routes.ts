import { FastifyInstance } from 'fastify';
import { translationService } from '../services/translation.service';
import z from 'zod';

const translateSchema = z.object({
    text: z.string().min(1),
    sourceLang: z.string().default('en'),
    targetLang: z.string()
});

export async function translationRoutes(fastify: FastifyInstance) {
    fastify.post('/translate', async (request, reply) => {
        try {
            const { text, sourceLang, targetLang } = translateSchema.parse(request.body);

            const translatedText = await translationService.translate(text, sourceLang, targetLang);

            return { translation: translatedText };
        } catch (error: any) {
            request.log.error(error);
            if (error instanceof z.ZodError) {
                return reply.status(400).send({ message: 'Invalid request data', errors: error.errors });
            }
            return reply.status(500).send({ message: error.message || 'Translation failed' });
        }
    });
}
