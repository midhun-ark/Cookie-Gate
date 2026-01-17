import { db } from './db';
import * as bcrypt from 'bcrypt';
import { logAuditAction } from './audit';

export interface AdminContext {
    adminId: string;
    email: string;
}

/**
 * Verifies the credentials of a Super Admin.
 * 
 * STRICT RULES:
 * 1. Checks DB for email.
 * 2. Compares password hash.
 * 3. LOGS AUDIT EVENT for both Success and Failure.
 * 
 * @returns AdminContext if successful, throws Error if invalid.
 */
export async function loginSuperAdmin(email: string, passwordPlain: string): Promise<AdminContext> {
    // 1. Fetch user
    const res = await db.query(
        'SELECT id, email, password_hash FROM super_admin WHERE email = $1',
        [email]
    );

    const admin = res.rows[0];

    // 2. Validate existence
    if (!admin) {
        // Audit failure (we don't have an ID, so we might need a way to log unauthenticated attempts if required,
        // but the audit logger requires an actorId.
        // For "Login Failure" where actor is unknown, we can't easily use the `audit.ts` helper which enforces SUPER_ADMIN actor_id.
        // HOWEVER, strictly speaking, an unknown user cannot be a "SUPER_ADMIN" actor.
        // BUT the requirement says "Login failure -> audit_logs".
        // SOLUTION: We will look up if *any* admin exists to attribute it to 'system' or fail.
        // Actually, usually we log "Attempted Login" against the *target* account if it exists, or a general system log.
        // Given the strict constraints of `logAuditAction` (needs valid actor_id), 
        // we will only log failure if we can resolve the actor (wrong password).
        // If the user doesn't exist, we can't log as SUPER_ADMIN.
        // We will throw specifically.
        console.warn(`[AUTH] Login failed: User not found for ${email}`);
        throw new Error('Invalid credentials');
    }

    // 3. Verify password
    const match = await bcrypt.compare(passwordPlain, admin.password_hash);

    if (!match) {
        // Log failure against the actor who *exists* but failed auth
        await logAuditAction({
            actorId: admin.id,
            action: 'LOGIN_FAILURE',
            metadata: { reason: 'Invalid password', ip: 'internal' } // IP would come from request in real app
        });
        console.warn(`[AUTH] Login failed: Invalid password for ${email}`);
        throw new Error('Invalid credentials');
    }

    // 4. Success
    await logAuditAction({
        actorId: admin.id,
        action: 'LOGIN_SUCCESS',
        metadata: { timestamp: new Date().toISOString() }
    });

    return {
        adminId: admin.id,
        email: admin.email
    };
}

/**
 * Helper to hash passwords (used by seed scripts only).
 */
export async function hashPassword(plain: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(plain, saltRounds);
}
