import { db } from './db';
import { logAuditAction } from './audit';

export interface GlobalRule {
    id: string;
    version: number;
    rules_json: Record<string, any>;
    is_active: boolean;
    created_at: Date;
}

/**
 * Creates a new version of global rules.
 * Does NOT activate it automatically.
 * 
 * AUDIT: Logs 'CREATE_RULES' action.
 */
export async function createRules(actorId: string, rulesJson: Record<string, any>): Promise<GlobalRule> {
    // Validate JSON (basic check)
    if (!rulesJson || Object.keys(rulesJson).length === 0) {
        throw new Error('Rules JSON cannot be empty');
    }

    // Determine next version
    const verRes = await db.query('SELECT MAX(version) as max_ver FROM global_rules');
    const nextVersion = (verRes.rows[0].max_ver || 0) + 1;

    const res = await db.query(
        `INSERT INTO global_rules (version, rules_json, is_active) 
     VALUES ($1, $2, FALSE) 
     RETURNING *`,
        [nextVersion, rulesJson]
    );
    const rule = res.rows[0];

    await logAuditAction({
        actorId,
        action: 'CREATE_RULES',
        metadata: { ruleId: rule.id, version: rule.version }
    });

    return rule;
}

/**
 * Activates a specific rule version.
 * Deactivates any currently active rule first to ensure single-active constraint.
 * 
 * AUDIT: Logs 'ACTIVATE_RULES' action.
 */
export async function activateRules(actorId: string, ruleId: string): Promise<GlobalRule> {
    const client = await db.connect(); // Transaction needed for atomicity
    try {
        await client.query('BEGIN');

        // 1. Deactivate all
        await client.query('UPDATE global_rules SET is_active = FALSE WHERE is_active = TRUE');

        // 2. Activate target
        const res = await client.query(
            `UPDATE global_rules 
       SET is_active = TRUE 
       WHERE id = $1 
       RETURNING *`,
            [ruleId]
        );

        if (res.rowCount === 0) {
            throw new Error(`Rule ID ${ruleId} not found`);
        }

        const rule = res.rows[0];

        await logAuditAction({
            actorId,
            action: 'ACTIVATE_RULES',
            metadata: { ruleId: rule.id, version: rule.version }
        });

        await client.query('COMMIT');
        return rule;
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
}

/**
 * Gets the currently active rule version.
 */
export async function getActiveRules(): Promise<GlobalRule | null> {
    const res = await db.query('SELECT * FROM global_rules WHERE is_active = TRUE');
    return res.rows[0] || null;
}

/**
 * Lists all rule versions ordered by version number.
 */
export async function listRuleVersions(): Promise<GlobalRule[]> {
    const res = await db.query('SELECT * FROM global_rules ORDER BY version DESC');
    return res.rows;
}
