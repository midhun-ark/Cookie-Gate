import { db } from './db';
import { loginSuperAdmin } from './auth';

async function verifyAuthFlow() {
    const email = 'superadmin@complyark.com';
    const validPass = 'securePassword123!';
    const badPass = 'wrongPass';

    console.log('--- Starting Auth Verification ---');

    try {
        // 1. Test Failure
        console.log('\n[TEST 1] Attempting login with WRONG password...');
        try {
            await loginSuperAdmin(email, badPass);
            console.error('❌ FAILURE: Login success unexpected!');
        } catch (err: any) {
            if (err.message === 'Invalid credentials') {
                console.log('✅ SUCCESS: Login correctly rejected.');
            } else {
                throw err;
            }
        }

        // 2. Test Success
        console.log('\n[TEST 2] Attempting login with CORRECT password...');
        const context = await loginSuperAdmin(email, validPass);
        console.log('✅ SUCCESS: Authenticated context received:', context);

        // 3. Verify Audits
        console.log('\n[TEST 3] Verifying Audit Logs...');
        const logs = await db.query(
            `SELECT action, created_at FROM audit_logs 
         WHERE actor_id = $1 
         ORDER BY created_at DESC LIMIT 2`,
            [context.adminId]
        );

        const actions = logs.rows.map(r => r.action);
        console.log('Recent logs:', actions);

        if (actions.includes('LOGIN_SUCCESS') && actions.includes('LOGIN_FAILURE')) {
            console.log('✅ SUCCESS: Both LOGIN_SUCCESS and LOGIN_FAILURE found in logs.');
        } else {
            console.error('❌ FAILURE: Missing expected audit logs.');
            process.exit(1);
        }

    } catch (err) {
        console.error('❌ GLOBAL ERROR:', err);
        process.exit(1);
    } finally {
        await db.end();
    }
}

verifyAuthFlow();
