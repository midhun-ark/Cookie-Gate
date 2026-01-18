import * as dotenv from 'dotenv';
dotenv.config();

import { Pool } from 'pg';

/**
 * Centralized database connection pool.
 * Uses configuration matching docker-compose.yml (port 5445).
 */
const dbConfig = {
    user: process.env.DB_USER || 'ark',
    password: process.env.DB_PASSWORD || 'arkpass',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'ark_db',
    port: parseInt(process.env.DB_PORT || '5433', 10),
};

console.log('🔌 DB Config:', { ...dbConfig, password: '*****' });

export const db = new Pool(dbConfig);

// Test connection on startup (optional but recommended for debugging)
db.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});
