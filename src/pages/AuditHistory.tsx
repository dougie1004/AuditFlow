import { useState, useEffect } from 'react';
import { safeInvoke } from '../lib/tauri-bridge';
import { FileText, Calendar, Filter, Download } from 'lucide-react';

export default function AuditHistory() {
    const [closedSessions, setClosedSessions] = useState<any[]>([]);

    useEffect(() => {
        // Fetch closed audits
        // Mock data for now until backend command is ready
        setClosedSessions([
            { id: '2024-Legal', title: 'Legal Team Review 2024', closedDate: '2025-01-15', findings: 12, rating: 'Satisfactory' },
            { id: '2024-IT', title: 'IT Security Audit 2024', closedDate: '2025-01-20', findings: 45, rating: 'Needs Improvement' },
        ]);
    }, []);

    return (
        <div className="min-h-screen bg-[#0B1221] text-slate-300 p-8">
            <header className="flex justify-between items-center mb-10 border-b border-white/5 pb-6">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic">Audit Archive</h1>
                    <p className="text-xs text-slate-500 font-bold tracking-widest uppercase mt-1">Closed Sessions & Historical Records</p>
                </div>
            </header>

            <div className="grid gap-4">
                {closedSessions.map(session => (
                    <div key={session.id} className="bg-white/5 border border-white/10 p-6 rounded-2xl flex justify-between items-center hover:bg-white/10 transition-all cursor-pointer group">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-blue-400 transition-colors">
                                <FileText size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">{session.title}</h3>
                                <div className="flex items-center gap-4 mt-1 text-xs text-slate-500 font-mono">
                                    <span className="flex items-center gap-1"><Calendar size={12} /> Closed: {session.closedDate}</span>
                                    <span>ID: {session.id}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-8">
                            <div className="text-right">
                                <p className="text-[10px] uppercase font-black text-slate-600">Findings</p>
                                <p className="text-xl font-black text-white">{session.findings}</p>
                            </div>
                            <div className="text-right px-4 border-l border-white/10">
                                <p className="text-[10px] uppercase font-black text-slate-600">Rating</p>
                                <p className={`text-sm font-bold ${session.rating === 'Satisfactory' ? 'text-emerald-500' : 'text-rose-500'}`}>{session.rating}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
