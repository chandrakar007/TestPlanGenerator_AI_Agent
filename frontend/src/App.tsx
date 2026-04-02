import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

function App() {
  const [activeTab, setActiveTab] = useState('generate');

  // State 
  const [ticketId, setTicketId] = useState('');
  const [ticketData, setTicketData] = useState<any>(null);
  const [isFetchingJira, setIsFetchingJira] = useState(false);
  const [jiraError, setJiraError] = useState('');

  const [provider, setProvider] = useState('ollama');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedOutput, setGeneratedOutput] = useState('');

  const [templates, setTemplates] = useState<string[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');

  const [history, setHistory] = useState<any[]>([]);

  const [settings, setSettings] = useState({
    jiraBaseUrl: '',
    jiraUsername: '',
    jiraToken: '',
    groqKey: '',
    ollamaBaseUrl: 'http://localhost:11434'
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [jiraTestStatus, setJiraTestStatus] = useState<any>(null);
  const [groqTestStatus, setGroqTestStatus] = useState<any>(null);

  // Load existing templates and history on mount
  useEffect(() => {
    fetch('http://localhost:3001/api/templates')
      .then(r => r.json())
      .then(d => {
        if (d.templates?.length > 0) {
          setTemplates(d.templates);
          setSelectedTemplate(d.templates[0]);
        }
      })
      .catch(e => console.error("Could not load templates", e));

    fetch('http://localhost:3001/api/jira/recent')
      .then(r => r.json())
      .then(d => setHistory(d.recent || []))
      .catch(e => console.error("Could not load history", e));

    fetch('http://localhost:3001/api/settings')
      .then(r => r.json())
      .then(d => setSettings({
        jiraBaseUrl: d.jiraBaseUrl || '',
        jiraUsername: d.jiraUsername || '',
        jiraToken: d.jiraToken || '',
        groqKey: d.groqKey || '',
        ollamaBaseUrl: d.ollamaBaseUrl || 'http://localhost:11434'
      }))
      .catch(e => console.error("Could not load settings", e));
  }, []);

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      const res = await fetch('http://localhost:3001/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (res.ok) alert('Settings saved successfully!');
      else alert('Failed to save settings.');
    } catch (err: any) {
      alert('Error saving settings: ' + err.message);
    }
    setIsSavingSettings(false);
  };

  const handleTestJira = async () => {
    setJiraTestStatus({ loading: true });
    try {
      const res = await fetch('http://localhost:3001/api/settings/test-jira', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (res.ok) setJiraTestStatus({ success: true, message: data.message });
      else setJiraTestStatus({ success: false, message: data.error });
    } catch (e: any) {
      setJiraTestStatus({ success: false, message: e.message });
    }
  };

  const handleTestGroq = async () => {
    setGroqTestStatus({ loading: true });
    try {
      const res = await fetch('http://localhost:3001/api/settings/test-groq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (res.ok) setGroqTestStatus({ success: true, message: data.message });
      else setGroqTestStatus({ success: false, message: data.error });
    } catch (e: any) {
      setGroqTestStatus({ success: false, message: e.message });
    }
  };

  const handleFetchJira = async () => {
    if (!ticketId) return;
    setIsFetchingJira(true);
    setJiraError('');
    setTicketData(null);
    try {
      const res = await fetch('http://localhost:3001/api/jira/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId })
      });
      const data = await res.json();
      if (res.ok) {
        setTicketData(data.ticket);
      } else {
        setJiraError(data.error || 'Failed to fetch');
      }
    } catch (err: any) {
      setJiraError(err.message);
    }
    setIsFetchingJira(false);
  };

  const handleGenerate = async () => {
    if (!ticketId && !ticketData) {
      alert("Please fetch a JIRA ticket first.");
      return;
    }
    setIsGenerating(true);
    setGeneratedOutput('');
    try {
      const res = await fetch('http://localhost:3001/api/testplan/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: ticketData?.ticketKey || ticketId,
          templateName: selectedTemplate,
          provider: provider,
          ticketData: ticketData
        })
      });
      const data = await res.json();
      if (res.ok) {
        setGeneratedOutput(data.content);
      } else {
        setGeneratedOutput(`Error: ${data.error}`);
      }
    } catch (err: any) {
      setGeneratedOutput(`Error sending request: ${err.message}`);
    }
    setIsGenerating(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const formData = new FormData();
      formData.append('template', file);

      try {
        const res = await fetch('http://localhost:3001/api/templates/upload', {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        if (res.ok) {
          alert("Uploaded successfully");
          setTemplates([...templates, data.file]);
          setSelectedTemplate(data.file);
        } else {
          alert("Upload failed: " + data.error);
        }
      } catch (err: any) {
        alert("Upload error: " + err.message);
      }
    }
  };

  const handleCopy = () => {
    if (!generatedOutput) return;
    navigator.clipboard.writeText(generatedOutput)
      .then(() => alert("Copied to clipboard!"))
      .catch(() => alert("Failed to copy."));
  };

  const handleDownload = () => {
    if (!generatedOutput) return;
    const blob = new Blob([generatedOutput], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TestPlan_${ticketId || 'generated'}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex items-center justify-between border-b pb-4 border-slate-200">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Intelligent Test Plan Generator</h1>
            <p className="text-slate-500 mt-1">Automated QA execution driven by LLMs and JIRA data.</p>
          </div>
        </header>

        <main>
          {/* Custom Tabs Navigation */}
          <div className="flex space-x-4 border-b border-slate-200 mb-6">
            <button
              onClick={() => setActiveTab('generate')}
              className={`py-2 px-4 font-semibold text-sm border-b-2 transition-colors ${activeTab === 'generate' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              Generate Plan
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`py-2 px-4 font-semibold text-sm border-b-2 transition-colors ${activeTab === 'settings' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              Configuration
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-2 px-4 font-semibold text-sm border-b-2 transition-colors ${activeTab === 'history' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              History
            </button>
          </div>

          {/* Generate Tab */}
          {activeTab === 'generate' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

              {/* Inputs Column */}
              <div className="col-span-1 space-y-6">
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
                  <h2 className="text-lg font-semibold leading-none tracking-tight mb-1">Source Data</h2>
                  <p className="text-sm text-slate-500 mb-4">Fetch JIRA ticket details.</p>
                  <label className="text-sm font-medium leading-none mb-2 block">JIRA Ticket ID</label>
                  <div className="flex gap-2">
                    <input
                      value={ticketId}
                      onChange={(e) => setTicketId(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                      placeholder="e.g. VWO-123"
                    />
                    <button
                      onClick={handleFetchJira}
                      disabled={isFetchingJira}
                      className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-slate-900 text-slate-50 h-10 px-4 py-2 hover:bg-slate-800 transition-colors disabled:opacity-50">
                      {isFetchingJira ? '...' : 'Fetch'}
                    </button>
                  </div>
                  {jiraError && <p className="text-red-500 text-sm mt-2">{jiraError}</p>}

                  {ticketData && (
                    <div className="mt-4 p-3 bg-slate-50 border rounded text-sm space-y-2">
                      <p><strong>Title:</strong> {ticketData.summary}</p>
                      <p><strong>Priority:</strong> {ticketData.priority}</p>
                      <p><strong>Status:</strong> {ticketData.status}</p>
                      <p><strong>Assignee:</strong> {ticketData.assignee}</p>
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
                  <h2 className="text-lg font-semibold leading-none tracking-tight mb-1">Template & Execution</h2>
                  <p className="text-sm text-slate-500 mb-4">Select template and target LLM.</p>

                  <label className="text-sm font-medium leading-none mb-2 block mt-4">Active Template</label>
                  <select
                    value={selectedTemplate}
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 mb-4">
                    <option value="">-- None --</option>
                    {templates.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>

                  <label className="text-sm font-medium leading-none mb-2 block">LLM Provider</label>
                  <select
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 mb-6">
                    <option value="ollama">Local - Ollama (llama3.2:3b)</option>
                    <option value="groq">Cloud - Groq (llama3-70b/mixtral)</option>
                    <option value="groq-oss-120b">Cloud - Groq (openai/gpt-oss-120b)</option>
                  </select>

                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="inline-flex w-full items-center justify-center rounded-md text-sm font-medium bg-blue-600 text-white h-11 px-8 hover:bg-blue-700 transition-colors disabled:opacity-75">
                    {isGenerating ? 'Generating...' : 'Generate Test Plan'}
                  </button>
                </div>
              </div>

              {/* Main Results Column */}
              <div className="col-span-1 md:col-span-2 space-y-6">
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 h-[800px] flex flex-col">
                  <h2 className="text-lg font-semibold leading-none tracking-tight mb-1">Generated Output</h2>
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-sm text-slate-500">Markdown preview of the final plan.</p>
                    <div className="flex space-x-2">
                      <button onClick={handleCopy} disabled={!generatedOutput} className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded hover:bg-slate-200 disabled:opacity-50 transition-colors">Copy</button>
                      <button onClick={handleDownload} disabled={!generatedOutput} className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded hover:bg-slate-200 disabled:opacity-50 transition-colors">Download .md</button>
                    </div>
                  </div>
                  <div className="flex-1 border rounded-md bg-white p-6 text-slate-800 overflow-y-auto shadow-inner prose prose-sm max-w-none">
                    {!generatedOutput && <span className="text-slate-400 font-mono">// Output will stream here...</span>}
                    {generatedOutput && <ReactMarkdown>{generatedOutput}</ReactMarkdown>}
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
                <h2 className="text-lg font-semibold leading-none tracking-tight mb-1">API Configuration</h2>
                <p className="text-sm text-slate-500 mb-4">Credentials are securely saved in the local SQLite database.</p>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium leading-none mb-2 block">JIRA Base URL</label>
                    <input value={settings.jiraBaseUrl} onChange={e => setSettings({ ...settings, jiraBaseUrl: e.target.value })} className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600" placeholder="https://company.atlassian.net" />
                  </div>
                  <div>
                    <label className="text-sm font-medium leading-none mb-2 block text-blue-800">JIRA Email Address (Required: e.g. you@email.com)</label>
                    <input value={settings.jiraUsername} onChange={e => setSettings({ ...settings, jiraUsername: e.target.value })} className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600" />
                  </div>
                  <div>
                    <label className="text-sm font-medium leading-none mb-2 block">JIRA API Token</label>
                    <input type="password" value={settings.jiraToken} onChange={e => setSettings({ ...settings, jiraToken: e.target.value })} className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 mb-2" />
                    <button onClick={handleTestJira} disabled={jiraTestStatus?.loading} className="px-3 py-1 bg-slate-100 text-slate-600 border border-slate-300 text-xs font-medium rounded hover:bg-slate-200 disabled:opacity-50 transition-colors">
                      {jiraTestStatus?.loading ? 'Testing...' : 'Test JIRA Connection'}
                    </button>
                    {jiraTestStatus && !jiraTestStatus.loading && (
                      <p className={`text-xs mt-2 ${jiraTestStatus.success ? 'text-green-600' : 'text-red-600'}`}>
                        {jiraTestStatus.message}
                      </p>
                    )}
                  </div>
                  <div className="pt-2 border-t border-slate-100">
                    <label className="text-sm font-medium leading-none mb-2 block mt-2">Groq API Key</label>
                    <input type="password" value={settings.groqKey} onChange={e => setSettings({ ...settings, groqKey: e.target.value })} className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 mb-2" />
                    <button onClick={handleTestGroq} disabled={groqTestStatus?.loading} className="px-3 py-1 bg-slate-100 text-slate-600 border border-slate-300 text-xs font-medium rounded hover:bg-slate-200 disabled:opacity-50 transition-colors">
                      {groqTestStatus?.loading ? 'Testing...' : 'Test Groq Connection'}
                    </button>
                    {groqTestStatus && !groqTestStatus.loading && (
                      <p className={`text-xs mt-2 ${groqTestStatus.success ? 'text-green-600' : 'text-red-600'}`}>
                        {groqTestStatus.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium leading-none mb-2 block">Ollama Base URL</label>
                    <input value={settings.ollamaBaseUrl} onChange={e => setSettings({ ...settings, ollamaBaseUrl: e.target.value })} className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600" />
                  </div>
                  <button onClick={handleSaveSettings} disabled={isSavingSettings} className="inline-flex w-full mt-2 items-center justify-center rounded-md text-sm font-medium bg-slate-900 text-white hover:bg-slate-800 h-10 px-4 py-2 transition-colors disabled:opacity-50">
                    {isSavingSettings ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
                <h2 className="text-lg font-semibold leading-none tracking-tight mb-1">Template Management</h2>
                <p className="text-sm text-slate-500 mb-4">Upload PDF templates representing the generated structure.</p>
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-10 flex flex-col items-center justify-center text-slate-500 bg-slate-50 hover:bg-slate-100 transition-colors relative">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="font-medium text-sm">Drag and drop file</p>
                  <p className="text-xs mt-1">or click to browse</p>
                  <p className="text-xs mt-2 text-slate-400">PDFs up to 5MB</p>
                </div>
              </div>
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
              <h2 className="text-lg font-semibold leading-none tracking-tight mb-1">Generations History</h2>
              <p className="text-sm text-slate-500 mb-4">Recently generated test plans saved to local SQLite DB.</p>
              {history.length === 0 ? (
                <div className="py-8 text-center text-slate-500 italic border rounded-lg bg-slate-50">
                  No history available yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {history.map(item => (
                    <div key={item.id} className="p-4 border rounded-md">
                      <div className="flex justify-between font-semibold mb-2">
                        <span>Ticket: {item.ticketId}</span>
                        <span className="text-slate-500 text-sm font-normal">{new Date(item.timestamp).toLocaleString()}</span>
                      </div>
                      <div className="text-sm text-slate-600 bg-slate-50 p-2 font-mono">
                        Provider used: {item.provider}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </main>
      </div>
    </div>
  );
}

export default App;
