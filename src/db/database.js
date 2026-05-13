const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', 'data.json');

// 데이터 파일이 없으면 생성
if (!fs.existsSync(DATA_PATH)) {
    fs.writeFileSync(DATA_PATH, JSON.stringify([]));
}

const adapter = new JSONFile(DATA_PATH);
const db = new Low(adapter, []);

let initialized = false;

async function getDb() {
    if (!initialized) {
        await db.read();
        initialized = true;
    }
    return db;
}

function getData() {
    return db.data;
}

module.exports = { getDb, getData };