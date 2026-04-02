# Findings

## Research, Discoveries, and Constraints

### Discovery Parameters (Phase 1)
- **North Star:** Build a full-stack web application that automates test plan creation by integrating JIRA ticket data with LLM-powered analysis using customizable templates. Support both Groq (cloud) and Ollama (local) LLMs.
- **Integrations:**
  - JIRA REST API v3 (needs Base URL, Username/Email, API Token).
  - Groq API SDK (needs API Key).
  - Ollama local REST API (needs Base URL, default: `http://localhost:11434`).
- **Source of Truth:** 
  - Local SQLite (`data/app.db`) for settings and history.
  - File system for storing PDF templates.
  - JIRA server for ticket origin data.
- **Delivery Payload:**
  - Generated test plan displayed in Markdown editor/preview.
  - Side-by-side view of template vs. generated content.
  - Export options: Markdown, PDF, Copy to Clipboard.
- **Constraints & Edge Cases:**
  - Secure storage for API keys (never in frontend).
  - Timeouts required (Groq: 30s, Ollama: 120s) + 3 retries with exponential backoff.
  - PDF limits (<5MB).
