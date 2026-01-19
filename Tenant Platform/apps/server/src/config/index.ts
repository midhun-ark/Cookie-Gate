import * as dotenv from 'dotenv';
dotenv.config();

/**
 * Helper to get required environment variable.
 * Throws if not set.
 */
function requireEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}

/**
 * Configuration object for the Tenant Platform.
 * Critical settings MUST be set via environment variables (no defaults).
 */
export const config = {
    // Database - ALL REQUIRED
    db: {
        host: requireEnv('DB_HOST'),
        port: parseInt(requireEnv('DB_PORT'), 10),
        name: requireEnv('DB_NAME'),
        user: requireEnv('DB_USER'),
        password: requireEnv('DB_PASSWORD'),
        ssl: process.env.DB_SSL === 'true',
    },

    // JWT Authentication - SECRET REQUIRED
    jwt: {
        secret: requireEnv('JWT_SECRET'),
        expiresIn: process.env.JWT_EXPIRES_IN || '1h',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    },

    // Server
    server: {
        port: parseInt(process.env.PORT || '3001', 10),
        nodeEnv: process.env.NODE_ENV || 'development',
    },

    // CORS - REQUIRED for production
    cors: {
        origins: requireEnv('CORS_ORIGINS').split(','),
    },

    // Cookie/Session - SECRET REQUIRED
    session: {
        secret: requireEnv('SESSION_SECRET'),
        secure: process.env.COOKIE_SECURE === 'true',
        sameSite: (process.env.COOKIE_SAME_SITE || 'lax') as 'lax' | 'strict' | 'none',
    },

    // Compliance Settings (hardcoded is OK - these are app defaults)
    compliance: {
        defaultLanguage: 'en',
        requiredLanguages: ['en'],
        darkPatternPrevention: {
            requireEqualButtonProminence: true,
            maxButtonSizeDifference: 0,
            preventPreCheckedNonEssential: true,
        },
    },
};
