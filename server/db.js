require('dotenv/config');

const contractJson = require('./prisma/contract.json');

let db;

async function getDb() {
    if (!db) {
        const { default: postgres } = await import('@prisma/orm-postgres/runtime');

        db = postgres({
            contractJson,
            url: process.env.DATABASE_URL,
        });
    }

    return db;
}

module.exports = { getDb };