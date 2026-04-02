# Project Constitution

## Data Schemas

### Input: Generate Test Plan Request
```json
{
  "ticketId": "string (e.g., 'VWO-123')",
  "templateId": "string",
  "provider": "string (groq | ollama)"
}
```

### Data: Jira Ticket
```json
{
  "ticketKey": "string",
  "summary": "string",
  "description": "string",
  "priority": "string",
  "status": "string",
  "assignee": "string",
  "labels": ["string"],
  "acceptanceCriteria": "string"
}
```

### Output: Generated Test Plan
```json
{
  "status": "string (success | error)",
  "content": "string (markdown formatted test plan)",
  "error": "string"
}
```

### Storage: Application Settings
```json
{
  "jira": {
    "baseUrl": "string",
    "username": "string",
    "apiToken": "string (encrypted)"
  },
  "llm": {
    "activeProvider": "string (groq | ollama)",
    "groq": {
      "apiKey": "string (encrypted)",
      "model": "string",
      "temperature": "number"
    },
    "ollama": {
      "baseUrl": "string",
      "model": "string"
    }
  }
}
```

## Behavioral Rules
- **Security:** API Keys and Tokens must never be stored in localStorage. They must be stored securely using backend environment variables or OS-specific secure storage.
- **CORS:** Restrict to localhost only for local deployment.
- **Resilience:** Implement timeout handling (30s Groq, 120s Ollama) and retry logic (3 attempts with exponential backoff) for LLM API calls.
- **Graceful Failure:** If LLM fails, show a structured error with suggestions (e.g., check model availability).
- **Aesthetic:** Clean, professional QA/Testing aesthetic using a blue/gray palette. Minimum width 1024px optimized.
- **Validation:** Sanitize JIRA IDs (regex: `[A-Z]+-\d+`), validate URLs, scan PDF uploads for malicious content, limit file size (<5MB).

## Architectural Invariants
- **Layer 1 (Architecture):** React (Vite) + TypeScript + Tailwind CSS + shadcn/ui.
- **Layer 2 (Backend):** Node.js (Express) or Python (FastAPI) [Can be decided soon, typically Node is seamless with React].
- **Layer 3 (Storage):** Local SQLite for settings/history, File System for PDF templates.
- **Integrations:** Groq API SDK, Ollama REST API, JIRA REST API v3.
