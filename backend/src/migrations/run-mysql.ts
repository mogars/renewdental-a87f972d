import fs from 'fs';
import path from 'path';
import { query, pool } from '../config/database';

async function runMigrations() {
    console.log('--- STARTING DATABASE MIGRATIONS ---');

    const migrationsDir = path.join(__dirname);
    const files = fs.readdirSync(migrationsDir)
        .filter(file => file.endsWith('.sql'))
        .sort(); // Run them in order: 001, 002, 003...

    for (const file of files) {
        console.log(`Applying migration: ${file}...`);
        const filePath = path.join(migrationsDir, file);
        const sql = fs.readFileSync(filePath, 'utf8');

        // Split by semicolon but ignore ones inside strings (basic split)
        // For more complex SQL, we'd need a proper parser, 
        // but for simple ALTER/CREATE it's fine.
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        for (const statement of statements) {
            try {
                await query(statement);
            } catch (err: any) {
                // If the error is about duplicate column/table, we can often ignore it
                if (err.code === 'ER_DUP_FIELDNAME' || err.code === 'ER_TABLE_EXISTS_ERROR') {
                    console.log(`  > Note: Skipping part of ${file} (already applied)`);
                } else {
                    console.error(`  > Error in ${file}:`, err.message);
                    // Don't stop the whole process, just log it
                }
            }
        }
        console.log(`✓ ${file} processed`);
    }

    console.log('--- MIGRATIONS COMPLETE ---');
}

runMigrations()
    .then(() => pool.end())
    .catch(err => {
        console.error('Migration runner failed:', err);
        process.exit(1);
    });
