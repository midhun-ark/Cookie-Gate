import { db } from './db';
import { logAuditAction } from './audit';

export interface Tenant {
    id: string;
    name: string;
    status: 'ACTIVE' | 'SUSPENDED';
    created_at: Date;
    suspended_at: Date | null;
}

/**
 * Creates a new tenant.
 * 
 * AUDIT: Logs 'CREATE_TENANT' action.
 */
export async function createTenant(actorId: string, name: string): Promise<Tenant> {
    if (!name || name.trim().length === 0) {
        throw new Error('Tenant name is required');
    }

    // Check for duplicates
    const existing = await db.query('SELECT id FROM tenants WHERE name = $1', [name]);
    if ((existing.rowCount ?? 0) > 0) {
        throw new Error('Tenant with this name already exists');
    }

    const res = await db.query(
        `INSERT INTO tenants (name, status) VALUES ($1, 'ACTIVE') RETURNING *`,
        [name]
    );
    const tenant = res.rows[0];

    await logAuditAction({
        actorId,
        action: 'CREATE_TENANT',
        metadata: { tenantId: tenant.id, name: tenant.name }
    });

    return tenant;
}

/**
 * Suspends a tenant.
 * 
 * AUDIT: Logs 'SUSPEND_TENANT' action.
 */
export async function suspendTenant(actorId: string, tenantId: string): Promise<Tenant> {
    const res = await db.query(
        `UPDATE tenants 
     SET status = 'SUSPENDED', suspended_at = NOW() 
     WHERE id = $1 
     RETURNING *`,
        [tenantId]
    );

    if (res.rowCount === 0) {
        throw new Error('Tenant not found');
    }

    const tenant = res.rows[0];

    await logAuditAction({
        actorId,
        action: 'SUSPEND_TENANT',
        metadata: { tenantId: tenant.id, previousStatus: 'ACTIVE' }
    });

    return tenant;
}

/**
 * Reactivates a suspended tenant.
 * 
 * AUDIT: Logs 'REACTIVATE_TENANT' action.
 */
export async function reactivateTenant(actorId: string, tenantId: string): Promise<Tenant> {
    const res = await db.query(
        `UPDATE tenants 
     SET status = 'ACTIVE', suspended_at = NULL 
     WHERE id = $1 
     RETURNING *`,
        [tenantId]
    );

    if (res.rowCount === 0) {
        throw new Error('Tenant not found');
    }

    const tenant = res.rows[0];

    await logAuditAction({
        actorId,
        action: 'REACTIVATE_TENANT',
        metadata: { tenantId: tenant.id, previousStatus: 'SUSPENDED' }
    });

    return tenant;
}

/**
 * Lists all active tenants.
 */
export async function listTenants(): Promise<Tenant[]> {
    const res = await db.query('SELECT * FROM tenants ORDER BY created_at DESC');
    return res.rows;
}
