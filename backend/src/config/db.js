import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure storage points to the proper project root relative to /src/config
const dataDir = path.resolve(__dirname, '../../../storage/data'); 

if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

let dbInstance = null;

export async function initDB() {
    if (dbInstance) return dbInstance;
    
    dbInstance = await open({
        filename: path.join(dataDir, 'app.db'),
        driver: sqlite3.Database
    });

    await dbInstance.exec(`
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ticketId TEXT,
            provider TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            content TEXT
        );
    `);
    
    return dbInstance;
}

export function getDB() {
    return dbInstance;
}
