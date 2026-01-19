/**
 * Environment-aware logger utility.
 * In production, only errors are logged.
 * In development, all levels are logged.
 */
const isDev = process.env.NODE_ENV !== 'production';

export const logger = {
    /**
     * Log informational messages (dev only)
     */
    info: (...args: unknown[]): void => {
        if (isDev) {
            console.log('[INFO]', new Date().toISOString(), ...args);
        }
    },

    /**
     * Log debug messages (dev only)
     */
    debug: (...args: unknown[]): void => {
        if (isDev) {
            console.log('[DEBUG]', new Date().toISOString(), ...args);
        }
    },

    /**
     * Log warning messages (always)
     */
    warn: (...args: unknown[]): void => {
        console.warn('[WARN]', new Date().toISOString(), ...args);
    },

    /**
     * Log error messages (always)
     */
    error: (...args: unknown[]): void => {
        console.error('[ERROR]', new Date().toISOString(), ...args);
    },
};
