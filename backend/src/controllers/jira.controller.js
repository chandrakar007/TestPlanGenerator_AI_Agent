import { getDB } from '../config/db.js';

export const fetchJiraTicket = async (req, res) => {
    let { ticketId } = req.body;
    if (!ticketId) return res.status(400).json({ error: 'Missing ticketId' });

    const ticketMatch = ticketId.match(/[A-Z]+-\d+/i);
    if (ticketMatch) {
        ticketId = ticketMatch[0].toUpperCase();
    } else {
        return res.status(400).json({ error: 'Invalid JIRA Ticket ID.' });
    }

    let baseUrl = process.env.JIRA_BASE_URL;
    let username = process.env.JIRA_USERNAME;
    let apiToken = process.env.JIRA_API_TOKEN;

    try {
        const db = getDB();
        const rows = await db.all(`SELECT key, value FROM settings`);
        const settings = rows.reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {});
        baseUrl = (settings.JIRA_BASE_URL || baseUrl || '').trim();
        username = (settings.JIRA_USERNAME || username || '').trim();
        apiToken = (settings.JIRA_API_TOKEN || apiToken || '').trim();
    } catch(e) {}

    if (!baseUrl || !username || !apiToken) {
        return res.status(400).json({ error: 'JIRA credentials missing.' });
    }

    let parsedUrl;
    try { parsedUrl = new URL(baseUrl); } catch(e) { return res.status(400).json({ error: 'Invalid URL format.' }); }
    
    try {
        const response = await fetch(`${parsedUrl.origin}/rest/api/3/issue/${ticketId}`, {
            headers: {
                'Authorization': `Basic ${Buffer.from(`${username}:${apiToken}`).toString('base64')}`,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) return res.status(response.status).json({ error: `JIRA API responded with error (${response.status})` });

        const data = await response.json();
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
};

export const getJiraHistory = async (req, res) => {
    try {
        const db = getDB();
        const rows = await db.all(`SELECT id, ticketId, provider, timestamp FROM history ORDER BY timestamp DESC LIMIT 5`);
        res.json({ recent: rows });
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
};
