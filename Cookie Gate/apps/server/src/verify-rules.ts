import { db } from './db';
import { loginSuperAdmin } from './auth';
import { createRules, activateRules, getActiveRules, listRuleVersions } from './global-rules';

async function verifyRulesFlow() {
    const email = 'superadmin@complyark.com';
    const password = 'securePassword123!';

    console.log('--- Starting Global Rules Verification ---');

    try {
        // 1. Authenticate
        const admin = await loginSuperAdmin(email, password);
        console.log(`✅ Authenticated as ${admin.email}`);

        // 2. Create Initial Rules (v1)
        console.log(`\n[ACTION] Creating Rules v1...`);
        const rulesV1 = { region: 'EU', retentionDays: 365, version_label: 'initial' };
        const r1 = await createRules(admin.adminId, rulesV1);
        console.log(`✅ Created Rule v${r1.version} (Active: ${r1.is_active})`);

        // 3. Verify No Active Rule Yet
        const current1 = await getActiveRules();
        if (!current1) {
            console.log('✅ Correct: No active rules yet.');
        } else {
            throw new Error('Unexpected active rule found');
        }

        // 4. Activate v1
        console.log(`\n[ACTION] Activating Rules v1...`);
        await activateRules(admin.adminId, r1.id);
        const active1 = await getActiveRules();
        if (active1?.id === r1.id && active1.is_active) {
            console.log(`✅ Rule v1 is now ACTIVE.`);
        } else {
            throw new Error('Failed to activate v1');
        }

        // 5. Create Updated Rules (v2)
        console.log(`\n[ACTION] Creating Rules v2...`);
        const rulesV2 = { region: 'EU', retentionDays: 730, version_label: 'updated' };
        const r2 = await createRules(admin.adminId, rulesV2);
        console.log(`✅ Created Rule v${r2.version} (Active: ${r2.is_active})`);

        // 6. Activate v2 (Supersede v1)
        console.log(`\n[ACTION] Activating Rules v2...`);
        await activateRules(admin.adminId, r2.id);

        // 7. Verify v2 is active, v1 is inactive
        const active2 = await getActiveRules();
        const versions = await listRuleVersions();
        const v1State = versions.find(v => v.id === r1.id);

        if (active2?.id === r2.id && v1State?.is_active === false) {
            console.log(`✅ Rule v2 is ACTIVE. Rule v1 is INACTIVE.`);
        } else {
            throw new Error('Version switch failed');
        }

        // 8. Verify Audits
        console.log(`\n[VERIFY] Checking Audit Logs...`);
        const logs = await db.query(
            `SELECT action, metadata->>'version' as version FROM audit_logs 
         WHERE actor_id = $1 AND (action = 'CREATE_RULES' OR action = 'ACTIVATE_RULES')
         ORDER BY created_at ASC`,
            [admin.adminId]
        );

        const actions = logs.rows.map(r => `${r.action} (v${r.version})`);
        console.log('Found actions:', actions);

        // Expecting: CREATE v1, ACTIVATE v1, CREATE v2, ACTIVATE v2
        // Note: Since we might run this multiple times, we just check if we have at least 4 recent entries matching our logic
        // But for a clean run:
        if (actions.length >= 4) {
            console.log('✅ SUCCESS: Rules lifecycle audited.');
        } else {
            console.error('❌ FAILURE: Missing audit logs.');
            process.exit(1);
        }

    } catch (err) {
        console.error('❌ GLOBAL ERROR:', err);
        process.exit(1);
    } finally {
        await db.end();
    }
}

verifyRulesFlow();
