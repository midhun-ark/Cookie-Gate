import { FastifyInstance } from 'fastify';
import { loginSuperAdmin } from '../auth';

export async function authRoutes(app: FastifyInstance) {

    app.post('/login', async (req: any, reply) => {
        const { email, password } = req.body || {};

        if (!email || !password) {
            return reply.badRequest('Email and password required');
        }

        try {
            // Calls service -> Verifies pwd -> Logs audit -> Returns context
            const admin = await loginSuperAdmin(email, password);
            return { success: true, admin };
        } catch (err: any) {
            if (err.message === 'Invalid credentials') {
                return reply.unauthorized('Invalid credentials');
            }
            throw err;
        }
    });

}
