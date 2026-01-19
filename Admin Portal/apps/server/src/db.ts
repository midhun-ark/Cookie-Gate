import * as dotenv from 'dotenv';
dotenv.config();

import { Pool } from 'pg';

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
 * Centralized database connection pool.
 * All values MUST be set via environment variables.
 */
const dbConfig = {
    user: requireEnv('DB_USER'),
    password: requireEnv('DB_PASSWORD'),
    host: requireEnv('DB_HOST'),
    database: requireEnv('DB_NAME'),
    port: parseInt(requireEnv('DB_PORT'), 10),
    // Enable SSL for RDS connections
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
};

console.log('🔌 DB Config:', { ...dbConfig, password: '*****' });

export const db = new Pool(dbConfig);

// Test connection on startup (optional but recommended for debugging)
db.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});
