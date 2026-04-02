import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { API } from '../api';

export const GeneratePanel: React.FC = () => {
  const [ticketId, setTicketId] = useState('');
  const [ticketData, setTicketData] = useState<any>(null);
  const [isFetchingJira, setIsFetchingJira] = useState(false);
  const [jiraError, setJiraError] = useState('');

  const [provider, setProvider] = useState('ollama');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedOutput, setGeneratedOutput] = useState('');
  
  const [templates, setTemplates] = useState<string[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');

  useEffect(() => {
    API.fetchTemplates()
      .then(d => {
         if(d.templates?.length > 0) {
            setTemplates(d.templates);
            setSelectedTemplate(d.templates[0]);
         }
      })
      .catch(e => console.error("Could not load templates", e));
  }, []);

  const handleFetchJira = async () => {
    if(!ticketId) return;
    setIsFetchingJira(true); setJiraError(''); setTicketData(null);
    try {
      const res = await API.fetchJiraTicket(ticketId);
      const data = await res.json();
      if(res.ok) setTicketData(data.ticket);
      else setJiraError(data.error || 'Failed to fetch');
    } catch(err: any) {
      setJiraError(err.message);
    }
    setIsFetchingJira(false);
  };

  const handleGenerate = async () => {
    if(!ticketId && !ticketData) { alert("Please fetch a JIRA ticket first."); return; }
    setIsGenerating(true); setGeneratedOutput('');
    try {
      const res = await API.generateTestPlan({ 
          ticketId: ticketData?.ticketKey || ticketId, 
          templateName: selectedTemplate, 
          provider: provider,
          ticketData: ticketData
      });
      const data = await res.json();
      if(res.ok) setGeneratedOutput(data.content);
      else setGeneratedOutput(`Error: ${data.error}`);
    } catch(err: any) {
      setGeneratedOutput(`Error sending request: ${err.message}`);
    }
    setIsGenerating(false);
  };

  const handleCopy = () => {
    if(!generatedOutput) return;
    navigator.clipboard.writeText(generatedOutput)
      .then(() => alert("Copied to clipboard!"))
      .catch(() => alert("Failed to copy."));
  };

  const handleDownload = () => {
    if(!generatedOutput) return;
    const blob = new Blob([generatedOutput], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TestPlan_${ticketId || 'generated'}.md`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="col-span-1 space-y-6">
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold leading-none tracking-tight mb-1">Source Data</h2>
          <p className="text-sm text-slate-500 mb-4">Fetch JIRA ticket details.</p>
          <label className="text-sm font-medium leading-none mb-2 block">JIRA Ticket ID</label>
          <div className="flex gap-2">
            <input value={ticketId} onChange={(e) => setTicketId(e.target.value)} className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600" placeholder="e.g. VWO-123" />
            <button onClick={handleFetchJira} disabled={isFetchingJira} className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-slate-900 text-slate-50 h-10 px-4 py-2 hover:bg-slate-800 transition-colors disabled:opacity-50">
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
          <select value={selectedTemplate} onChange={(e) => setSelectedTemplate(e.target.value)} className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 mb-4">
            <option value="">-- None --</option>
            {templates.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          <label className="text-sm font-medium leading-none mb-2 block">LLM Provider</label>
          <select value={provider} onChange={(e) => setProvider(e.target.value)} className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 mb-6">
            <option value="ollama">Local - Ollama (llama3.2:3b)</option>
            <option value="groq">Cloud - Groq (llama3-70b/mixtral)</option>
            <option value="groq-oss-120b">Cloud - Groq (openai/gpt-oss-120b)</option>
          </select>
          <button onClick={handleGenerate} disabled={isGenerating} className="inline-flex w-full items-center justify-center rounded-md text-sm font-medium bg-blue-600 text-white h-11 px-8 hover:bg-blue-700 transition-colors disabled:opacity-75">
             {isGenerating ? 'Generating...' : 'Generate Test Plan'}
          </button>
        </div>
      </div>

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
  );
};
