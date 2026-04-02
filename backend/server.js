import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDB } from './src/config/db.js';
import app from './src/app.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Construct path to config .env
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

const port = process.env.PORT || 3001;

async function startServer() {
    try {
        await initDB();
        console.log('✅ SQLite database initialized');
        app.listen(port, () => {
            console.log(`✅ Backend server running on http://localhost:${port}`);
        });
    } catch (err) {
        console.error('❌ Failed to start server:', err);
        process.exit(1);
    }
}

startServer();
