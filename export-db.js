const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

async function exportToJson() {
    const SQL = await initSqlJs();
    const dbPath = path.join(__dirname, 'asary.db');

    if (!fs.existsSync(dbPath)) {
        console.log('asary.db not found');
        return;
    }

    const fileBuffer = fs.readFileSync(dbPath);
    const db = new SQL.Database(fileBuffer);

    const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table'");
    console.log('Tables:', tables);

    const result = db.exec('SELECT * FROM stocksum');
    console.log('Row count:', result[0]?.values?.length || 0);

    if (result.length > 0) {
        const columns = result[0].columns;
        const values = result[0].values;

        const data = values.map(row => {
            const obj = {};
            columns.forEach((col, i) => {
                obj[col] = row[i];
            });
            return obj;
        });

        const jsonPath = path.join(__dirname, 'data.json');
        fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
        console.log('Exported to:', jsonPath);
        console.log('Total rows:', data.length);
    }

    db.close();
}

exportToJson().catch(console.error);