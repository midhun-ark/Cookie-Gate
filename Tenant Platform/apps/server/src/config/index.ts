import * as dotenv from 'dotenv';
dotenv.config();

/**
 * Configuration object for the Tenant Platform.
 * All settings are loaded from environment variables with sensible defaults.
 */
export const config = {
    // Database
    db: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5433', 10),
        name: process.env.DB_NAME || 'ark_db',
        user: process.env.DB_USER || 'ark',
        password: process.env.DB_PASSWORD || 'arkpass',
    },

    // JWT Authentication
    jwt: {
        secret: process.env.JWT_SECRET || 'tenant-platform-jwt-secret-change-in-production',
        expiresIn: process.env.JWT_EXPIRES_IN || '1h',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    },

    // Server
    server: {
        port: parseInt(process.env.PORT || '3001', 10),
        nodeEnv: process.env.NODE_ENV || 'development',
    },

    // CORS
    cors: {
        origins: (process.env.CORS_ORIGINS || 'http://localhost:5174,http://localhost:5173').split(','),
    },

    // Cookie/Session
    session: {
        secret: process.env.SESSION_SECRET || 'tenant-session-secret-change-in-production',
        secure: process.env.COOKIE_SECURE === 'true',
        sameSite: (process.env.COOKIE_SAME_SITE || 'lax') as 'lax' | 'strict' | 'none',
    },

    // Compliance Settings
    compliance: {
        // Default supported languages
        defaultLanguage: 'en',
        requiredLanguages: ['en'], // English is always required

        // Dark pattern prevention settings
        darkPatternPrevention: {
            requireEqualButtonProminence: true,
            maxButtonSizeDifference: 0, // 0 = must be identical
            preventPreCheckedNonEssential: true,
        },
    },
};
