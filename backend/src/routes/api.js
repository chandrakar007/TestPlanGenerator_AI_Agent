import express from 'express';
import { getSettings, saveSettings, testJira, testGroq, getOllamaModels } from '../controllers/settings.controller.js';
import { fetchJiraTicket, getJiraHistory } from '../controllers/jira.controller.js';
import { getTemplates, uploadTemplateProcess, upload } from '../controllers/templates.controller.js';
import { generateTestPlan } from '../controllers/llm.controller.js';

const router = express.Router();

router.get('/settings', getSettings);
router.post('/settings', saveSettings);
router.post('/settings/test-jira', testJira);
router.post('/settings/test-groq', testGroq);
router.get('/settings/llm/models', getOllamaModels);

router.post('/jira/fetch', fetchJiraTicket);
router.get('/jira/recent', getJiraHistory);

router.get('/templates', getTemplates);
router.post('/templates/upload', upload.single('template'), uploadTemplateProcess);

router.post('/testplan/generate', generateTestPlan);

export default router;
