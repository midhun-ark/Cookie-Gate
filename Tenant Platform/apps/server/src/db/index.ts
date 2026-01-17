import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { config } from '../config';

/**
 * Database connection pool for the Tenant Platform.
 * Uses shared PostgreSQL database with Admin Portal.
 */
export const pool = new Pool({
    host: config.db.host,
    port: config.db.port,
    database: config.db.name,
    user: config.db.user,
    password: config.db.password,
    max: 20, // Maximum pool size
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Handle connection errors
pool.on('error', (err) => {
    console.error('[DB] Unexpected error on idle client', err);
});

/**
 * Execute a database query with automatic connection management.
 */
export async function query<T extends QueryResultRow = any>(
    text: string,
    params?: any[]
): Promise<QueryResult<T>> {
    const start = Date.now();
    try {
        const result = await pool.query<T>(text, params);
        const duration = Date.now() - start;
        if (config.server.nodeEnv === 'development') {
            console.log('[DB] Query executed', { text: text.substring(0, 100), duration, rows: result.rowCount });
        }
        return result;
    } catch (error) {
        console.error('[DB] Query error', { text: text.substring(0, 100), error });
        throw error;
    }
}

/**
 * Get a client from the pool for transaction management.
 */
export async function getClient(): Promise<PoolClient> {
    return pool.connect();
}

/**
 * Execute a function within a database transaction.
 */
export async function withTransaction<T>(
    fn: (client: PoolClient) => Promise<T>
): Promise<T> {
    const client = await getClient();
    try {
        await client.query('BEGIN');
        const result = await fn(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Health check for database connection.
 */
export async function checkConnection(): Promise<boolean> {
    try {
        const result = await query('SELECT 1 as health');
        return result.rows.length > 0;
    } catch {
        return false;
    }
}

export default { pool, query, getClient, withTransaction, checkConnection };
