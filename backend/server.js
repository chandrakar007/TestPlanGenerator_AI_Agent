import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');
import { initDB } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Construct path to config .env
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Set up storage for templates
const templatesDir = path.resolve(__dirname, '../storage/templates');
if (!fs.existsSync(templatesDir)) {
    fs.mkdirSync(templatesDir, { recursive: true });
}
const upload = multer({ 
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, templatesDir),
        filename: (req, file, cb) => cb(null, file.originalname)
    }),
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

let db;

app.get('/health', (req, res) => {
    res.json({ status: 'ok', time: new Date() });
});

// Settings Endpoints
app.get('/api/settings', async (req, res) => {
    try {
        const rows = await db.all(`SELECT key, value FROM settings`);
        const settings = rows.reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {});
        res.json({
            jiraBaseUrl: settings.JIRA_BASE_URL || process.env.JIRA_BASE_URL || '',
            jiraUsername: settings.JIRA_USERNAME || process.env.JIRA_USERNAME || '',
            jiraToken: settings.JIRA_API_TOKEN || process.env.JIRA_API_TOKEN || '',
            groqKey: settings.GROQ_API_KEY || process.env.GROQ_API_KEY || '',
            ollamaBaseUrl: settings.OLLAMA_BASE_URL || process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
        });
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/settings', async (req, res) => {
    try {
        const { jiraBaseUrl, jiraUsername, jiraToken, groqKey, ollamaBaseUrl } = req.body;
        
        await db.run('BEGIN TRANSACTION');
        if(jiraBaseUrl !== undefined) await db.run(`INSERT OR REPLACE INTO settings (key, value) VALUES ('JIRA_BASE_URL', ?)`, [jiraBaseUrl.trim()]);
        if(jiraUsername !== undefined) await db.run(`INSERT OR REPLACE INTO settings (key, value) VALUES ('JIRA_USERNAME', ?)`, [jiraUsername.trim()]);
        if(jiraToken !== undefined) await db.run(`INSERT OR REPLACE INTO settings (key, value) VALUES ('JIRA_API_TOKEN', ?)`, [jiraToken.trim()]);
        if(groqKey !== undefined) await db.run(`INSERT OR REPLACE INTO settings (key, value) VALUES ('GROQ_API_KEY', ?)`, [groqKey.trim()]);
        if(ollamaBaseUrl !== undefined) await db.run(`INSERT OR REPLACE INTO settings (key, value) VALUES ('OLLAMA_BASE_URL', ?)`, [ollamaBaseUrl.trim()]);
        await db.run('COMMIT');
        
        res.json({ status: 'saved' });
    } catch(err) {
        await db.run('ROLLBACK');
        res.status(500).json({ error: err.message });
    }
});

// Test JIRA Connection Endpoint
app.post('/api/settings/test-jira', async (req, res) => {
    let { jiraBaseUrl, jiraUsername, jiraToken } = req.body;
    
    try {
        const rows = await db.all(`SELECT key, value FROM settings`);
        const settings = rows.reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {});
        jiraBaseUrl = (jiraBaseUrl || settings.JIRA_BASE_URL || process.env.JIRA_BASE_URL || '').trim();
        jiraUsername = (jiraUsername || settings.JIRA_USERNAME || process.env.JIRA_USERNAME || '').trim();
        jiraToken = (jiraToken || settings.JIRA_API_TOKEN || process.env.JIRA_API_TOKEN || '').trim();
    } catch(e) {}

    console.log(`[TEST-JIRA] Url: '${jiraBaseUrl}' User: '${jiraUsername}' Token Length: ${jiraToken?.length} EndsWith: '${jiraToken?.slice(-8)}'`);

    if (!jiraBaseUrl || !jiraUsername || !jiraToken) {
        return res.status(400).json({ error: 'Missing JIRA credentials to test.' });
    }

    let parsedUrl;
    try {
        parsedUrl = new URL(jiraBaseUrl);
    } catch(e) {
        return res.status(400).json({ error: 'Invalid JIRA Base URL format.' });
    }
    const normalizedBaseUrl = parsedUrl.origin;
    const authHeader = `Basic ${Buffer.from(`${jiraUsername}:${jiraToken}`).toString('base64')}`;

    try {
        const response = await fetch(`${normalizedBaseUrl}/rest/api/3/myself`, {
            headers: {
                'Authorization': authHeader,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            let errorMsg = await response.text();
            try {
                const parse = JSON.parse(errorMsg);
                if (parse.errorMessages) errorMsg = parse.errorMessages.join(", ");
                else if (parse.message) errorMsg = parse.message;
            } catch(e) {}
            return res.status(response.status).json({ error: `Connection Failed (${response.status}): ${errorMsg}` });
        }

        const data = await response.json();
        res.json({ status: 'success', message: `Connected as ${data.displayName}` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Test Groq Connection Endpoint
app.post('/api/settings/test-groq', async (req, res) => {
    let { groqKey } = req.body;
    
    try {
        const setting = await db.get(`SELECT value FROM settings WHERE key='GROQ_API_KEY'`);
        groqKey = (groqKey || setting?.value || process.env.GROQ_API_KEY || '').trim();
    } catch(e) {}

    if (!groqKey) {
        return res.status(400).json({ error: 'Missing Groq API Key.' });
    }

    try {
        const response = await fetch('https://api.groq.com/openai/v1/models', {
            headers: { 'Authorization': `Bearer ${groqKey}` }
        });

        if (!response.ok) {
            let errorMsg = await response.text();
            try {
                const p = JSON.parse(errorMsg);
                if(p.error?.message) errorMsg = p.error.message;
            } catch(e) {}
            return res.status(response.status).json({ error: `Connection Failed: ${errorMsg}` });
        }

        res.json({ status: 'success', message: `Successfully connected to Groq!` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/settings/llm/models', async (req, res) => {
    // Return Ollama models
    let baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    try {
        const setting = await db.get(`SELECT value FROM settings WHERE key='OLLAMA_BASE_URL'`);
        if(setting?.value) baseUrl = setting.value;
    } catch(e) {}
    const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    try {
        const response = await fetch(`${normalizedBaseUrl}/api/tags`);
        if (response.ok) {
            const data = await response.json();
            res.json({ models: data.models || [] });
        } else {
            res.status(response.status).json({ error: 'Failed to fetch Ollama models' });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// JIRA Endpoints
app.post('/api/jira/fetch', async (req, res) => {
    let { ticketId } = req.body;
    if (!ticketId) return res.status(400).json({ error: 'Missing ticketId' });

    // Sanitize ticketId to extract just the ID in case a full URL is pasted
    const ticketMatch = ticketId.match(/[A-Z]+-\d+/i);
    if (ticketMatch) {
        ticketId = ticketMatch[0].toUpperCase();
    } else {
        return res.status(400).json({ error: 'Invalid JIRA Ticket ID. Ensure it contains the format PROJECT-123.' });
    }

    let baseUrl = process.env.JIRA_BASE_URL;
    let username = process.env.JIRA_USERNAME;
    let apiToken = process.env.JIRA_API_TOKEN;

    try {
        const rows = await db.all(`SELECT key, value FROM settings`);
        const settings = rows.reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {});
        baseUrl = (settings.JIRA_BASE_URL || baseUrl || '').trim();
        username = (settings.JIRA_USERNAME || username || '').trim();
        apiToken = (settings.JIRA_API_TOKEN || apiToken || '').trim();
    } catch(e) {}

    if (!baseUrl || !username || !apiToken) {
        return res.status(400).json({ error: 'JIRA credentials missing. Please configure in Settings.' });
    }

    let parsedUrl;
    try {
        parsedUrl = new URL(baseUrl);
    } catch(e) {
        return res.status(400).json({ error: 'Invalid JIRA Base URL format.' });
    }
    const normalizedBaseUrl = parsedUrl.origin;
    const authHeader = `Basic ${Buffer.from(`${username}:${apiToken}`).toString('base64')}`;

    try {
        const response = await fetch(`${normalizedBaseUrl}/rest/api/3/issue/${ticketId}`, {
            headers: {
                'Authorization': authHeader,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            let errorMsg = await response.text();
            try {
                // Atlassian returns HTML on hard 404s, but sometimes returns json with errorMessages
                const p = JSON.parse(errorMsg);
                if(p.errorMessages) errorMsg = p.errorMessages.join(", ");
                else if (p.message) errorMsg = p.message;
            } catch(e) {}
            return res.status(response.status).json({ error: `JIRA API responded with error (${response.status}): ${errorMsg}\nPlease check Settings if you have permission to access ${ticketId}.` });
        }

        const data = await response.json();
        
        // Extract basic data according to schema
        const parsed = {
            ticketKey: ticketId,
            summary: data.fields?.summary || '',
            description: data.fields?.description?.content?.[0]?.content?.[0]?.text || '',
            priority: data.fields?.priority?.name || '',
            status: data.fields?.status?.name || '',
            assignee: data.fields?.assignee?.displayName || 'Unassigned',
            labels: data.fields?.labels || [],
        };
        
        res.json({ ticket: parsed });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/jira/recent', async (req, res) => {
    try {
        const rows = await db.all(`SELECT id, ticketId, provider, timestamp FROM history ORDER BY timestamp DESC LIMIT 5`);
        res.json({ recent: rows });
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
});

// Helper for generating with Ollama
async function generateWithOllama(prompt) {
    let baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    try {
        const setting = await db.get(`SELECT value FROM settings WHERE key='OLLAMA_BASE_URL'`);
        if(setting?.value) baseUrl = setting.value;
    } catch(e) {}
    const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    
    // Fetch models first to find one. Fallback
    const tagsResp = await fetch(`${normalizedBaseUrl}/api/tags`);
    if(!tagsResp.ok) throw new Error('Cannot reach Ollama locally');
    const tagsData = await tagsResp.json();
    const model = tagsData?.models?.[0]?.name || 'llama3.2:3b'; // Fallback

    const response = await fetch(`${normalizedBaseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: model,
            prompt: prompt,
            stream: false
        })
    });
    
    if(!response.ok) {
        let errText = await response.text();
        try {
            const parsed = JSON.parse(errText);
            if(parsed.error) errText = parsed.error;
        } catch(e) {}
        throw new Error(`Ollama failed: ${errText}`);
    }
    const data = await response.json();
    return data.response;
}

// Document Generation Enpoints
app.post('/api/testplan/generate', async (req, res) => {
    const { ticketId, templateName, provider, ticketData } = req.body;
    if(!ticketId || !provider) return res.status(400).json({ error: 'Missing ticketId or provider' });

    console.log(`Generating test plan for ${ticketId} via ${provider}`);
    
    // 1. Get Template Context
    let templateContext = 'Use standard testing template.';
    if(templateName) {
        const tempPath = path.join(templatesDir, templateName);
        if(fs.existsSync(tempPath)) {
            try {
                const dataBuffer = fs.readFileSync(tempPath);
                const data = await pdfParse(dataBuffer);
                templateContext = data.text;
                console.log(`Parsed PDF template data for Context.`);
            } catch(err) {
                console.error('Failed to parse PDF', err);
            }
        }
    }

    const prompt = `
System Prompt: You are a QA Engineer. Generate a comprehensive test plan based on the provided JIRA ticket and following the structure of the template below.

Context:
1. JIRA Ticket Data: 
Title: ${ticketData?.summary || ticketId}
Description: ${ticketData?.description || ''}
Priority: ${ticketData?.priority || ''}

2. Template Structure Requirements (Extracted Text from PDF): 
${templateContext.slice(0, 2000)} // Truncated to prevent massive context context blowups

Instructions: Map ticket details to appropriate sections. Maintain template formatting. Add specific test scenarios based on acceptance criteria. Output MUST be formatted in Markdown.
`;

    try {
        let content = '';
        if(provider === 'ollama') {
            content = await generateWithOllama(prompt);
        } else if (provider === 'groq' || provider.startsWith('groq-')) {
            // Groq fallback logic via DB settings
            let groqKey = process.env.GROQ_API_KEY;
            try {
                const setting = await db.get(`SELECT value FROM settings WHERE key='GROQ_API_KEY'`);
                if(setting?.value) groqKey = setting.value;
            } catch(e) {}

            groqKey = (groqKey || '').trim();

            if(!groqKey) {
                return res.status(400).json({ error: 'Groq API Key is not configured in Settings.' });
            }
            
            // Actually call Groq using fetch, no need for SDK for simple POST
            let activeModel = 'llama3-70b-8192';
            if (provider === 'groq-oss-120b') activeModel = 'openai/gpt-oss-120b'; // Or whatever model mapping we want, though groq usually uses llama-3/mixtral
            if (ticketData?.modelOverride) activeModel = ticketData.modelOverride;
            
            console.log("Calling GROQ API...");
            try {
                const grq = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                       'Authorization': `Bearer ${groqKey}`,
                       'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: activeModel,
                        messages: [{ role: 'user', content: prompt }]
                    })
                });
                
                if(!grq.ok) throw new Error(await grq.text());
                const grqData = await grq.json();
                content = grqData.choices[0].message.content;
            } catch(e) {
                throw new Error("Groq API error: " + e.message);
            }
        } else {
            return res.status(400).json({ error: 'Invalid provider' });
        }

        // Save to History
        await db.run(
            `INSERT INTO history (ticketId, provider, content) VALUES (?, ?, ?)`,
            [ticketId, provider, content]
        );

        res.json({ status: 'success', content });
    } catch(err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Template Endpoints
app.post('/api/templates/upload', upload.single('template'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    if (req.file.mimetype !== 'application/pdf') return res.status(400).json({ error: 'Only PDF allowed' });
    
    try {
        const dataBuffer = fs.readFileSync(req.file.path);
        const data = await pdfParse(dataBuffer);
        
        console.log(`Successfully parsed PDF: ${req.file.originalname}`);
        res.json({ 
            status: 'uploaded', 
            file: req.file.originalname,
            parsedPages: data.numpages
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to process PDF file' });
    }
});

app.get('/api/templates', async (req, res) => {
    const files = fs.readdirSync(templatesDir).filter(f => f.endsWith('.pdf'));
    res.json({ templates: files });
});
// Serve static frontend build if it exists
const frontendBuildPath = path.resolve(__dirname, '../frontend/dist');
if (fs.existsSync(frontendBuildPath)) {
    app.use(express.static(frontendBuildPath));
    app.get('*', (req, res) => {
        if (!req.path.startsWith('/api')) {
            res.sendFile(path.join(frontendBuildPath, 'index.html'));
        }
    });
}

// Initialization
async function startServer() {
    try {
        db = await initDB();
        console.log('✅ Local SQLite database initialized');
        app.listen(port, () => {
            console.log(`✅ Backend server running on http://localhost:${port}`);
        });
    } catch (err) {
        console.error('❌ Failed to start server:', err);
        process.exit(1);
    }
}

startServer();
