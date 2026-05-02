const fs = require('fs');
const path = require('path');
const db = require('./src/db/index');

async function migrate() {
    try {
        const schemaPath = path.join(__dirname, 'src', 'db', 'schema.sql');
        const sql = fs.readFileSync(schemaPath, 'utf8');
        await db.query(sql);
        console.log('Migration successful');
    } catch (err) {
        console.error('Migration failed', err);
    } finally {
        process.exit();
    }
}

migrate();
