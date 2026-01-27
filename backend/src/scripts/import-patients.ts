import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { query, pool } from '../config/database';

function isPhoneNumber(str: string): boolean {
    // Phone numbers are usually numerical, might have +, -, (), spaces
    // But user specifically said "phone is numerical"
    // Let's check if it's mostly digits
    return /^[0-9\s\-\+\(\)]+$/.test(str) && /[0-9]/.test(str);
}

function isAlphabetic(str: string): boolean {
    // Names usually contain letters
    return /[a-zA-Z]/.test(str);
}

async function importPatients(filePath: string) {
    console.log(`Reading file: ${filePath}`);

    if (!fs.existsSync(filePath)) {
        console.error('Error: File not found.');
        process.exit(1);
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);

    if (lines.length === 0) {
        console.error('Error: Empty file.');
        process.exit(1);
    }

    // Assume first line might be header, check if it contains "first" or "name"
    // If we want to be strict, we'd remove it. Let's assume standard CSV with header.
    // We'll peek at the first line.
    let startIndex = 0;
    const header = lines[0].toLowerCase();
    if (header.includes('first') || header.includes('name') || header.includes('phone')) {
        console.log('Detected header row, skipping...');
        startIndex = 1;
    }

    let successCount = 0;
    let errorCount = 0;

    console.log(`Found ${lines.length - startIndex} records to process.`);

    for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i];
        // simple CSV split by comma
        // Note: This breaks if fields contain commas. For simple name/phone it's usually fine.
        const parts = line.split(',').map(p => p.trim());

        // Expected format: First Name, Last Name, Phone
        // Adjust indices as needed. Let's try to be flexible or strict?
        // User said: "first name, last name, phone number"
        if (parts.length < 3) {
            console.warn(`Line ${i + 1} skipped: Not enough fields (found ${parts.length}, expected 3)`);
            errorCount++;
            continue;
        }

        const firstName = parts[0];
        let lastName = parts[1];
        let phone = parts[2];

        // Logic to detect if Last Name and Phone are swapped
        // If Last Name looks like a phone number and Phone looks like a name, swap them
        if (isPhoneNumber(lastName) && isAlphabetic(phone)) {
            console.log(`\nLine ${i + 1}: Detected swapped Last Name ("${lastName}") and Phone ("${phone}"). Swapping...`);
            const temp = lastName;
            lastName = phone;
            phone = temp;
        } else if (isPhoneNumber(lastName) && !isPhoneNumber(phone)) {
            // If lastName is a phone but phone isn't a phone (maybe just empty or has letters), swap
            console.log(`\nLine ${i + 1}: Last Name ("${lastName}") looks like a phone number. Swapping with Phone field...`);
            const temp = lastName;
            lastName = phone;
            phone = temp;
        }

        if (!firstName || !lastName) {
            console.warn(`Line ${i + 1} skipped: Missing name`);
            errorCount++;
            continue;
        }

        try {
            const id = uuidv4();
            await query(
                `INSERT INTO patients (id, first_name, last_name, phone) 
                 VALUES (?, ?, ?, ?)`,
                [id, firstName, lastName, phone]
            );
            successCount++;
            process.stdout.write('.');
        } catch (err: any) {
            console.error(`\nError inserting line ${i + 1}:`, err.message);
            errorCount++;
        }
    }

    console.log('\n\n--- Import Complete ---');
    console.log(`Successfully imported: ${successCount}`);
    console.log(`Errors: ${errorCount}`);
}

// Get file path from command line args
const args = process.argv.slice(2);
if (args.length !== 1) {
    console.log('Usage: ts-node src/scripts/import-patients.ts <path-to-csv>');
    console.log('CSV Format: FirstName,LastName,Phone');
    process.exit(1);
}

const csvPath = args[0];

importPatients(csvPath)
    .then(() => pool.end())
    .catch(err => {
        console.error('Fatal error:', err);
        process.exit(1);
    });
