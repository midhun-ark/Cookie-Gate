import * as dotenv from 'dotenv';
dotenv.config();

import { Pool } from 'pg';

/**
 * Centralized database connection pool.
 * Uses configuration matching docker-compose.yml (port 5445).
 */
export const db = new Pool({
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'complyark',
    port: parseInt(process.env.DB_PORT || '5445', 10),
});

// Test connection on startup (optional but recommended for debugging)
db.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});
