import { db } from './db';
import { loginSuperAdmin } from './auth';
import { createTenant, suspendTenant, reactivateTenant, listTenants } from './tenant';

async function verifyTenantFlow() {
    const email = 'superadmin@complyark.com';
    const password = 'securePassword123!';

    console.log('--- Starting Tenant Verification ---');

    try {
        // 1. Authenticate to get Actor ID
        const admin = await loginSuperAdmin(email, password);
        console.log(`✅ Authenticated as ${admin.email}`);

        // 2. Create Tenant
        const tenantName = `Test Corp ${Date.now()}`;
        console.log(`\n[ACTION] Creating tenant "${tenantName}"...`);
        const newTenant = await createTenant(admin.adminId, tenantName);
        console.log('✅ Tenant Created:', newTenant);

        // 3. Suspend Tenant
        console.log(`\n[ACTION] Suspending tenant...`);
        const suspended = await suspendTenant(admin.adminId, newTenant.id);
        if (suspended.status === 'SUSPENDED') {
            console.log('✅ Tenant Suspended.');
        } else {
            throw new Error('Failed to suspend tenant');
        }

        // 4. Reactivate Tenant
        console.log(`\n[ACTION] Reactivating tenant...`);
        const active = await reactivateTenant(admin.adminId, newTenant.id);
        if (active.status === 'ACTIVE') {
            console.log('✅ Tenant Reactivated.');
        } else {
            throw new Error('Failed to reactivate tenant');
        }

        // 5. List Tenants
        console.log(`\n[ACTION] Listing tenants...`);
        const list = await listTenants();
        console.log(`✅ Found ${list.length} tenants.`);

        // 6. Verify Audits
        console.log(`\n[VERIFY] Checking Audit Logs...`);
        const logs = await db.query(
            `SELECT action FROM audit_logs 
         WHERE actor_id = $1 AND metadata->>'tenantId' = $2
         ORDER BY created_at ASC`,
            [admin.adminId, newTenant.id]
        );

        const actions = logs.rows.map(r => r.action);
        console.log('Found actions:', actions);

        const expected = ['CREATE_TENANT', 'SUSPEND_TENANT', 'REACTIVATE_TENANT'];
        const hasAll = expected.every(a => actions.includes(a));

        if (hasAll) {
            console.log('✅ SUCCESS: All tenant actions were audited.');
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

verifyTenantFlow();
