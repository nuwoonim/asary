const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', '..', 'asary.db');

function getDb() {
    return new Database(DB_PATH);
}

module.exports = { getDb };