import { buildApp } from './app';
import { db } from './db';

async function verifyApiFlow() {
    const app = await buildApp();
    const email = 'superadmin@complyark.com';
    const password = 'securePassword123!';

    console.log('--- Starting API Verification ---');

    try {
        // 1. LOGIN
        console.log('\n[TEST] POST /auth/login');
        const loginRes = await app.inject({
            method: 'POST',
            url: '/auth/login',
            payload: { email, password }
        });

        if (loginRes.statusCode !== 200) {
            throw new Error(`Login failed: ${loginRes.payload}`);
        }

        const loginData = loginRes.json();
        const adminId = loginData.admin.adminId;
        console.log(`✅ Login successful. Admin ID: ${adminId}`);

        // 2. UNAUTHENTICATED ACCESS
        console.log('\n[TEST] GET /tenants (No Auth Header)');
        const unauthRes = await app.inject({
            method: 'GET',
            url: '/tenants'
        });
        if (unauthRes.statusCode === 401) {
            console.log('✅ Access denied correctly.');
        } else {
            throw new Error(`Auth bypass! Code: ${unauthRes.statusCode}`);
        }

        // 3. CREATE TENANT
        console.log('\n[TEST] POST /tenants');
        const tenantName = `API Tenant ${Date.now()}`;
        const createRes = await app.inject({
            method: 'POST',
            url: '/tenants',
            headers: { 'x-admin-id': adminId },
            payload: { name: tenantName }
        });

        if (createRes.statusCode === 200) {
            console.log(`✅ Tenant created: ${createRes.json().tenant.name}`);
        } else {
            throw new Error(`Create tenant failed: ${createRes.payload}`);
        }

        // 4. LIST TENANTS
        console.log('\n[TEST] GET /tenants');
        const listRes = await app.inject({
            method: 'GET',
            url: '/tenants',
            headers: { 'x-admin-id': adminId }
        });
        const tenants = listRes.json().tenants;
        if (Array.isArray(tenants) && tenants.length > 0) {
            console.log(`✅ Tenants listed: ${tenants.length} found`);
        } else {
            throw new Error('List tenants failed');
        }

        // 5. CREATE RULES
        console.log('\n[TEST] POST /rules');
        const ruleRes = await app.inject({
            method: 'POST',
            url: '/rules',
            headers: { 'x-admin-id': adminId },
            payload: { api_test: true, region: 'US' }
        });

        if (ruleRes.statusCode === 200) {
            console.log(`✅ Rules created (v${ruleRes.json().rule.version})`);
        } else {
            throw new Error(`Create rules failed: ${ruleRes.payload}`);
        }

        console.log('\n✅ SUCCESS: API verified.');

    } catch (err) {
        console.error('❌ API Verification Failed:', err);
        process.exit(1);
    } finally {
        await app.close();
        await db.end();
    }
}

verifyApiFlow();
