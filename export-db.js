const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'asary.db');
const jsonPath = path.join(__dirname, 'data.json');

if (!fs.existsSync(dbPath)) {
    console.error('asary.db not found at:', dbPath);
    process.exit(1);
}

async function convert() {
    console.log('Loading sql.js...');
    const SQL = await initSqlJs();

    console.log('Reading asary.db...');
    const fileBuffer = fs.readFileSync(dbPath);
    const db = new SQL.Database(fileBuffer);

    const result = db.exec('SELECT * FROM stocksum');
    if (result.length === 0) {
        console.error('No data found in stocksum table');
        return;
    }

    const columns = result[0].columns;
    const values = result[0].values;

    console.log(`Found ${values.length} rows, converting...`);

    const data = values.map(row => {
        const obj = {};
        columns.forEach((col, i) => {
            obj[col] = row[i];
        });
        return obj;
    });

    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
    console.log(`Saved to ${jsonPath}`);
    console.log(`Total rows: ${data.length}`);

    db.close();
    console.log('Done!');
}

convert().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});