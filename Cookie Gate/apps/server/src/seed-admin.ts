import { db } from './db';
import { hashPassword } from './auth';

async function seedAdmin() {
    const email = 'superadmin@complyark.com';
    const password = 'securePassword123!';

    console.log(`Seeding admin: ${email} ...`);

    try {
        const hash = await hashPassword(password);

        // Upsert admin
        await db.query(`
      INSERT INTO super_admin (email, password_hash)
      VALUES ($1, $2)
      ON CONFLICT (email) 
      DO UPDATE SET password_hash = EXCLUDED.password_hash
    `, [email, hash]);

        console.log('✅ Admin seeded successfully.');
        console.log(`Credentials: ${email} / ${password}`);

    } catch (err) {
        console.error('❌ Seeding failed:', err);
    } finally {
        await db.end();
    }
}

seedAdmin();
