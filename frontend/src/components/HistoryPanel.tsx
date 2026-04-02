import React, { useState, useEffect } from 'react';
import { API } from '../api';

export const HistoryPanel: React.FC = () => {
    const [history, setHistory] = useState<any[]>([]);

    useEffect(() => {
        API.fetchHistory()
           .then(d => setHistory(d.recent || []))
           .catch(e => console.error("Could not load history", e));
    }, []);

    return (
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
    );
};
