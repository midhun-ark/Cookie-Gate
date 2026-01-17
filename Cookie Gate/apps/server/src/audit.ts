import { db } from './db';

/**
 * Interface for Audit Log payload.
 */
interface AuditLogPayload {
    actorId: string;
    action: string;
    metadata?: Record<string, any>;
}

/**
 * Logs an action to the audit_logs table.
 * 
 * CRITICAL RULE:
 * This function enforces `actor_type = 'SUPER_ADMIN'`.
 * This layer exists ONLY to make audit logging unavoidable and standardized.
 * 
 * @param payload - The details of the action to log.
 */
export async function logAuditAction(payload: AuditLogPayload): Promise<void> {
    const query = `
    INSERT INTO audit_logs (actor_type, actor_id, action, metadata)
    VALUES ($1, $2, $3, $4)
  `;

    // Hardcoded as SUPER_ADMIN per strict governance rules.
    // No other actor type is allowed.
    const values = ['SUPER_ADMIN', payload.actorId, payload.action, payload.metadata || {}];

    try {
        await db.query(query, values);
        console.log(`[AUDIT] Action logged: ${payload.action} by ${payload.actorId}`);
    } catch (error) {
        console.error(`[AUDIT ERROR] Failed to log action: ${payload.action}`, error);
        // In a strict compliance environment, failed audit log should probably crash the process
        // or rollback the transaction. For this phase, we log the error.
        throw error;
    }
}
