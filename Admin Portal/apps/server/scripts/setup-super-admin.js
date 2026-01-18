/**
 * One-time Super Admin setup script
 *
 * PURPOSE:
 * - Create the initial Super Admin record
 *
 * WARNING:
 * - This script MUST be run manually
 * - This script MUST NOT be imported by application code
 * - This script MUST NOT be committed with plaintext passwords
 */

const { Client } = require('pg');
const bcrypt = require('bcrypt');

// ===== CONFIG (EDIT BEFORE RUNNING) =====
const ADMIN_EMAIL = 'admin@complyark.internal';
const ADMIN_PASSWORD = 'Admin@123'; // CHANGE OR REMOVE AFTER RUN
const SALT_ROUNDS = 12;

// =======================================

async function setupSuperAdmin() {
    const client = new Client({
        host: 'localhost',
        port: 5433,
        user: 'ark',
        password: 'arkpass',
        database: 'ark_db',
    });

    try {
        console.log('🔐 Connecting to database...');
        await client.connect();

        // // STEP 1 — Check if admin already exists
        // const check = await client.query(
        //     'SELECT id FROM super_admin LIMIT 1'
        // );

        // if (check.rowCount > 0) {
        //     console.error('❌ Super Admin already exists. Aborting.');
        //     process.exit(1);
        // }

        // STEP 2 — Hash password
        console.log('🔒 Hashing password...');
        const passwordHash = await bcrypt.hash(
            ADMIN_PASSWORD,
            SALT_ROUNDS
        );

        // STEP 3 — Insert admin
        await client.query(
            `
      INSERT INTO super_admin (email, password_hash, created_at)
      VALUES ($1, $2, NOW())
      `,
            [ADMIN_EMAIL, passwordHash]
        );

        console.log('✅ Super Admin created successfully.');
    } catch (err) {
        console.error('❌ Setup failed:', err.message);
        process.exit(1);
    } finally {
        await client.end();
        process.exit(0);
    }
}

setupSuperAdmin();