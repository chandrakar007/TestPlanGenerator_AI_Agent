export const API = {
  fetchSettings: () => fetch('/api/settings').then(r => r.json()),
  saveSettings: (data: any) => fetch('/api/settings', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) }),
  testJira: (data: any) => fetch('/api/settings/test-jira', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) }).then(r=>r.json()),
  testGroq: (data: any) => fetch('/api/settings/test-groq', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) }).then(r=>r.json()),
  fetchTemplates: () => fetch('/api/templates').then(r => r.json()),
  uploadTemplate: (formData: FormData) => fetch('/api/templates/upload', { method: 'POST', body: formData }),
  fetchHistory: () => fetch('/api/jira/recent').then(r => r.json()),
  fetchJiraTicket: (ticketId: string) => fetch('/api/jira/fetch', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ticketId}) }),
  generateTestPlan: (payload: any) => fetch('/api/testplan/generate', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload) }),
};
