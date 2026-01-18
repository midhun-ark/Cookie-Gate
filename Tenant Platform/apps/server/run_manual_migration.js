const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = 'postgres://ark:arkpass@localhost:5433/ark_db';
const migrationFile = path.join(__dirname, 'migrations', '1768740000000_add_purpose_tag.sql');

async function run() {
    const client = new Client({ connectionString });
    await client.connect();

    try {
        console.log('Connected to DB');
        const sql = fs.readFileSync(migrationFile, 'utf8');

        // rudimentary parsing of Up/Down
        const parts = sql.split('-- Down Migration');
        const upSql = parts[0];

        console.log('Running Up Migration...');
        // Remove "-- Up Migration" line if present but SQL parser handles comments
        await client.query(upSql);
        console.log('Migration successful');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await client.end();
    }
}

run();
