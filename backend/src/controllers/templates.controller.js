import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const templatesDir = path.resolve(__dirname, '../../../storage/templates');

if (!fs.existsSync(templatesDir)) {
    fs.mkdirSync(templatesDir, { recursive: true });
}

export const upload = multer({ 
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, templatesDir),
        filename: (req, file, cb) => cb(null, file.originalname)
    }),
    limits: { fileSize: 5 * 1024 * 1024 } 
});

export const getTemplates = async (req, res) => {
    try {
        const files = fs.readdirSync(templatesDir).filter(f => f.endsWith('.pdf'));
        res.json({ templates: files });
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
};

export const uploadTemplateProcess = async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    if (req.file.mimetype !== 'application/pdf') return res.status(400).json({ error: 'Only PDF allowed' });
    
    try {
        const dataBuffer = fs.readFileSync(req.file.path);
        const data = await pdfParse(dataBuffer);
        res.json({ status: 'uploaded', file: req.file.originalname, parsedPages: data.numpages });
    } catch (err) {
        res.status(500).json({ error: 'Failed to process PDF file' });
    }
};
