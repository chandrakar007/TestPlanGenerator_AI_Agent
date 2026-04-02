import { getDB } from '../config/db.js';

export const getSettings = async (req, res) => {
    try {
        const db = getDB();
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
};

export const saveSettings = async (req, res) => {
    try {
        const db = getDB();
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
        const db = getDB();
        await db.run('ROLLBACK');
        res.status(500).json({ error: err.message });
    }
};

export const testJira = async (req, res) => {
    let { jiraBaseUrl, jiraUsername, jiraToken } = req.body;
    try {
        const db = getDB();
        const rows = await db.all(`SELECT key, value FROM settings`);
        const settings = rows.reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {});
        jiraBaseUrl = (jiraBaseUrl || settings.JIRA_BASE_URL || process.env.JIRA_BASE_URL || '').trim();
        jiraUsername = (jiraUsername || settings.JIRA_USERNAME || process.env.JIRA_USERNAME || '').trim();
        jiraToken = (jiraToken || settings.JIRA_API_TOKEN || process.env.JIRA_API_TOKEN || '').trim();
    } catch(e) {}

    if (!jiraBaseUrl || !jiraUsername || !jiraToken) return res.status(400).json({ error: 'Missing JIRA credentials to test.' });

    let parsedUrl;
    try { parsedUrl = new URL(jiraBaseUrl); } catch(e) { return res.status(400).json({ error: 'Invalid JIRA Base URL format.' }); }
    
    try {
        const response = await fetch(`${parsedUrl.origin}/rest/api/3/myself`, {
            headers: {
                'Authorization': `Basic ${Buffer.from(`${jiraUsername}:${jiraToken}`).toString('base64')}`,
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
};

export const testGroq = async (req, res) => {
    let { groqKey } = req.body;
    try {
        const db = getDB();
        const setting = await db.get(`SELECT value FROM settings WHERE key='GROQ_API_KEY'`);
        groqKey = (groqKey || setting?.value || process.env.GROQ_API_KEY || '').trim();
    } catch(e) {}

    if (!groqKey) return res.status(400).json({ error: 'Missing Groq API Key.' });

    try {
        const response = await fetch('https://api.groq.com/openai/v1/models', {
            headers: { 'Authorization': `Bearer ${groqKey}` }
        });

        if (!response.ok) {
            let errorMsg = await response.text();
            return res.status(response.status).json({ error: `Connection Failed:` });
        }
        res.json({ status: 'success', message: `Successfully connected to Groq!` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getOllamaModels = async (req, res) => {
    let baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    try {
        const db = getDB();
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
};
