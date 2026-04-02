import React, { useState, useEffect } from 'react';
import { API } from '../api';

export const SettingsPanel: React.FC = () => {
    const [settings, setSettings] = useState({ jiraBaseUrl: '', jiraUsername: '', jiraToken: '', groqKey: '', ollamaBaseUrl: 'http://localhost:11434' });
    const [isSavingSettings, setIsSavingSettings] = useState(false);
    const [jiraTestStatus, setJiraTestStatus] = useState<any>(null);
    const [groqTestStatus, setGroqTestStatus] = useState<any>(null);

    const [templates, setTemplates] = useState<string[]>([]);

    useEffect(() => {
        API.fetchSettings().then(d => setSettings({
            jiraBaseUrl: d.jiraBaseUrl || '', jiraUsername: d.jiraUsername || '', jiraToken: d.jiraToken || '', groqKey: d.groqKey || '', ollamaBaseUrl: d.ollamaBaseUrl || 'http://localhost:11434'
        })).catch(e => console.error("Could not load settings", e));
        
        API.fetchTemplates().then(d => setTemplates(d.templates || [])).catch(e => console.error("Could not load templates", e));
    }, []);

    const handleSaveSettings = async () => {
        setIsSavingSettings(true);
        try {
            const res = await API.saveSettings(settings);
            if(res.ok) alert('Settings saved successfully!');
            else alert('Failed to save settings.');
        } catch(err: any) { alert('Error saving settings: ' + err.message); }
        setIsSavingSettings(false);
    };

    const handleTestJira = async () => {
        setJiraTestStatus({ loading: true });
        try {
            const data = await API.testJira(settings);
            if(data.status === 'success') setJiraTestStatus({ success: true, message: data.message });
            else setJiraTestStatus({ success: false, message: data.error });
        } catch(e: any) { setJiraTestStatus({ success: false, message: e.message }); }
    };

    const handleTestGroq = async () => {
        setGroqTestStatus({ loading: true });
        try {
            const data = await API.testGroq(settings);
            if(data.status === 'success') setGroqTestStatus({ success: true, message: data.message });
            else setGroqTestStatus({ success: false, message: data.error });
        } catch(e: any) { setGroqTestStatus({ success: false, message: e.message }); }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if(e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            const formData = new FormData();
            formData.append('template', file);
            try {
                const res = await API.uploadTemplate(formData);
                const data = await res.json();
                if(res.ok) {
                    alert("Uploaded successfully");
                    setTemplates([...templates, data.file]);
                } else { alert("Upload failed: " + data.error); }
            } catch(err: any) { alert("Upload error: " + err.message); }
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
              <h2 className="text-lg font-semibold leading-none tracking-tight mb-1">API Configuration</h2>
              <p className="text-sm text-slate-500 mb-4">Credentials are securely saved in the local SQLite database.</p>
              <div className="space-y-4">
                 <div>
                    <label className="text-sm font-medium leading-none mb-2 block">JIRA Base URL</label>
                    <input value={settings.jiraBaseUrl} onChange={e => setSettings({...settings, jiraBaseUrl: e.target.value})} className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600" placeholder="https://company.atlassian.net" />
                 </div>
                 <div>
                    <label className="text-sm font-medium leading-none mb-2 block text-blue-800">JIRA Email Address (Required: e.g. you@email.com)</label>
                    <input value={settings.jiraUsername} onChange={e => setSettings({...settings, jiraUsername: e.target.value})} className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600" />
                 </div>
                 <div>
                    <label className="text-sm font-medium leading-none mb-2 block">JIRA API Token</label>
                    <input type="password" value={settings.jiraToken} onChange={e => setSettings({...settings, jiraToken: e.target.value})} className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 mb-2" />
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
                    <input type="password" value={settings.groqKey} onChange={e => setSettings({...settings, groqKey: e.target.value})} className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 mb-2" />
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
                    <input value={settings.ollamaBaseUrl} onChange={e => setSettings({...settings, ollamaBaseUrl: e.target.value})} className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600" />
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
                 <input type="file" accept=".pdf" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                 </svg>
                 <p className="font-medium text-sm">Drag and drop file</p>
                 <p className="text-xs mt-1">or click to browse</p>
                 <p className="text-xs mt-2 text-slate-400">PDFs up to 5MB</p>
              </div>
              <div className="mt-4">
                  <h3 className="text-sm font-semibold mb-2">Available Templates</h3>
                  <ul className="text-sm text-slate-600 list-disc list-inside">
                      {templates.map(t => <li key={t}>{t}</li>)}
                  </ul>
              </div>
            </div>
        </div>
    );
};
