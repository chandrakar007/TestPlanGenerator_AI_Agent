import { getDB } from '../config/db.js';
import fs from 'fs';
import path from 'path';
import { templatesDir } from './templates.controller.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

async function generateWithOllama(prompt, db) {
    let baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    try {
        const setting = await db.get(`SELECT value FROM settings WHERE key='OLLAMA_BASE_URL'`);
        if(setting?.value) baseUrl = setting.value;
    } catch(e) {}
    
    const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const tagsResp = await fetch(`${normalizedBaseUrl}/api/tags`);
    if(!tagsResp.ok) throw new Error('Cannot reach Ollama locally');
    const tagsData = await tagsResp.json();
    const model = tagsData?.models?.[0]?.name || 'llama3.2:3b';

    const response = await fetch(`${normalizedBaseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: model, prompt: prompt, stream: false })
    });
    
    if(!response.ok) throw new Error(`Ollama failed!`);
    const data = await response.json();
    return data.response;
}

export const generateTestPlan = async (req, res) => {
    const { ticketId, templateName, provider, ticketData } = req.body;
    if(!ticketId || !provider) return res.status(400).json({ error: 'Missing ticketId or provider' });

    let templateContext = 'Use standard testing template.';
    if(templateName) {
        const tempPath = path.join(templatesDir, templateName);
        if(fs.existsSync(tempPath)) {
            try {
                const dataBuffer = fs.readFileSync(tempPath);
                const data = await pdfParse(dataBuffer);
                templateContext = data.text;
            } catch(err) {}
        }
    }

    const prompt = `System Prompt: You are a QA Engineer. Generate a comprehensive test plan based on the provided JIRA ticket and following the structure of the template below.
Context:
1. JIRA Ticket Data: 
Title: ${ticketData?.summary || ticketId}
Description: ${ticketData?.description || ''}
Priority: ${ticketData?.priority || ''}

2. Template Structure (Extracted Text from PDF): 
${templateContext.slice(0, 2000)}

Instructions: Map ticket details to appropriate sections. Maintain template formatting. Add specific test scenarios based on acceptance criteria. Output MUST be formatted in Markdown.`;

    try {
        const db = getDB();
        let content = '';
        if(provider === 'ollama') {
            content = await generateWithOllama(prompt, db);
        } else if (provider.startsWith('groq')) {
            let groqKey = process.env.GROQ_API_KEY;
            try {
                const setting = await db.get(`SELECT value FROM settings WHERE key='GROQ_API_KEY'`);
                if(setting?.value) groqKey = setting.value;
            } catch(e) {}

            if(!groqKey) return res.status(400).json({ error: 'Groq API Key is not configured.' });
            
            let activeModel = 'llama3-70b-8192';
            if (provider === 'groq-oss-120b') activeModel = 'openai/gpt-oss-120b';
            
            const grq = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: activeModel, messages: [{ role: 'user', content: prompt }] })
            });
            
            if(!grq.ok) throw new Error(await grq.text());
            const grqData = await grq.json();
            content = grqData.choices[0].message.content;
        } else {
            return res.status(400).json({ error: 'Invalid provider' });
        }

        await db.run(`INSERT INTO history (ticketId, provider, content) VALUES (?, ?, ?)`, [ticketId, provider, content]);
        res.json({ status: 'success', content });
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
};
