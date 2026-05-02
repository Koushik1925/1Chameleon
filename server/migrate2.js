require('dotenv').config();
const db = require('./src/db');

async function migrate() {
    try {
        console.log('Running database migration...');
        
        await db.query(`ALTER TABLE devices DROP COLUMN IF EXISTS license_id CASCADE;`);
        await db.query(`ALTER TABLE devices ADD COLUMN IF NOT EXISTS email VARCHAR(255);`);
        await db.query(`CREATE INDEX IF NOT EXISTS idx_devices_email ON devices(email);`);

        console.log('Migration completed successfully.');
    } catch (e) {
        console.error('Migration failed:', e);
    } finally {
        process.exit();
    }
}

migrate();
