import { db } from './db';
import { logAuditAction } from './audit';

async function verifyAuditLogging() {
    console.log('Starting verification...');

    try {
        // 1. Create a dummy Super Admin (if not exists) to satisfy FK constraint
        // We use ON CONFLICT DO NOTHING assuming email is unique, but simple insert is fine for test
        const adminEmail = 'test-admin@complyark.com';
        const adminRes = await db.query(
            `INSERT INTO super_admin (email, password_hash) 
       VALUES ($1, $2) 
       ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email 
       RETURNING id`,
            [adminEmail, 'hash_placeholder']
        );

        // If it updated, it might not return id depending on driver version/query, so let's select it
        let adminId = adminRes.rows[0]?.id;
        if (!adminId) {
            const fetch = await db.query('SELECT id FROM super_admin WHERE email = $1', [adminEmail]);
            adminId = fetch.rows[0].id;
        }

        console.log(`Using Super Admin ID: ${adminId}`);

        // 2. Log an audit action
        const action = 'VERIFY_AUDIT_LOGGING';
        const metadata = { test: true, timestamp: new Date().toISOString() };

        await logAuditAction({
            actorId: adminId,
            action: action,
            metadata: metadata
        });

        // 3. Verify it exists in DB
        const res = await db.query(
            'SELECT * FROM audit_logs WHERE actor_id = $1 AND action = $2 ORDER BY created_at DESC LIMIT 1',
            [adminId, action]
        );

        if (res.rows.length > 0) {
            console.log('✅ SUCCESS: Audit log found in database.');
            console.log('Record:', res.rows[0]);
        } else {
            console.error('❌ FAILURE: Audit log NOT found in database.');
            process.exit(1);
        }

    } catch (err) {
        console.error('❌ ERROR:', err);
        process.exit(1);
    } finally {
        // Cleanup pool
        await db.end();
    }
}

verifyAuditLogging();
