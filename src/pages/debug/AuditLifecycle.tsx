import React, { useState, useEffect } from "react";
import { safeInvoke } from "../../lib/tauri-bridge";
import { Terminal, Play, RefreshCw, Trash2, ShieldAlert, Activity, Box, BrainCircuit, ShieldCheck } from "lucide-react";

export default function AuditLifecycleDashboard() {
    // [FIX] Use SessionStorage to persist logs across navigation
    const [logs, setLogs] = useState<string[]>(() => {
        const saved = sessionStorage.getItem("audit_debug_logs");
        return saved ? JSON.parse(saved) : [];
    });
    const [stats, setStats] = useState({ total: 0, pending: 0 });
    const [loading, setLoading] = useState(false);

    const refreshStats = async () => {
        try {
            const s = await safeInvoke<any>("debug_get_inbox_stats");
            setStats(s);
        } catch (e) { console.error(e); }
    };

    useEffect(() => { refreshStats(); }, []);

    // Auto-save logs to session storage
    useEffect(() => {
        sessionStorage.setItem("audit_debug_logs", JSON.stringify(logs));
    }, [logs]);

    const addLog = (msg: string) => {
        const time = new Date().toLocaleTimeString();
        setLogs(prev => [`[${time}] ${msg}`, ...prev]);
    };

    const handleInject = async (scenario: string, count: number) => {
        setLoading(true);
        try {
            const res = await safeInvoke<string>("debug_inject_signals", { count, scenario });
            addLog(`👉 INJECTED: ${res}`);
            refreshStats();
        } catch (e) { addLog(`❌ ERROR: ${e}`); }
        setLoading(false);
    };

    const handleInjectProjects = async () => {
        setLoading(true);
        try {
            const res = await safeInvoke<string>("debug_inject_sample_projects");
            addLog(`📁 PROJECTS: ${res}`);
        } catch (e) { addLog(`❌ ERROR: ${e}`); }
        setLoading(false);
    };

    const handleLaunchDeepTest = async () => {
        setLoading(true);
        addLog("📖 INITIALIZING DEEP CONTEXT VALIDATION (HIGH-FIDELITY)...");
        try {
            const res = await safeInvoke<string>("debug_launch_deep_context_test");
            addLog(`✅ SCENARIOS READY: ${res}`);
            refreshStats();
        } catch (e) { addLog(`❌ ERROR: ${e}`); }
        setLoading(false);
    };

    const handleRunDeepAnalysis = async () => {
        setLoading(true);
        addLog("🕵️ EXECUTING DEEP CONTEXT CROSS-CHECK (3-Way Verification)...");
        const start = Date.now();
        try {
            const res = await safeInvoke<any>("debug_run_deep_analysis");
            const duration = ((Date.now() - start) / 1000).toFixed(2);

            res.logs.forEach((l: string) => addLog(l));
            addLog(`----------------------------------------`);
            addLog(`📝 ANALYSIS REPORT:`);
            addLog(`⏱ Execution Time: ${duration}s (Simulated Deep Thought)`);
            addLog(`🔗 Cross-References Checked: ${res.cross_checks_total} Documents`);
            addLog(`✅ Status: ${res.status}`);
            addLog(`----------------------------------------`);
            refreshStats();
        } catch (e) { addLog(`❌ ERROR: ${e}`); }
        setLoading(false);
    };

    const handleReset = async () => {
        if (!confirm("Clear entire Inbox?")) return;
        try {
            const res = await safeInvoke<string>("debug_reset_inbox");
            addLog(`🧹 RESET: ${res}`);
            setLogs([]);
            refreshStats();
        } catch (e) { addLog(`❌ ERROR: ${e}`); }
    };

    return (
        <div className="min-h-screen bg-black text-green-400 p-8 font-mono text-sm selection:bg-green-900">
            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Left Panel: Controls */}
                <div className="space-y-8 border-r border-green-900/30 pr-8">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-3 text-white mb-2">
                            <Activity className="text-green-500" />
                            AUDIT LIFECYCLE MONITOR
                        </h1>
                        <p className="text-green-700">Internal Engine Debugging Console v0.1</p>
                    </div>

                    {/* Monitor */}
                    <div className="bg-green-900/10 p-6 rounded-lg border border-green-800">
                        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <ShieldAlert size={18} /> Suspicion Inbox
                        </h2>
                        <div className="grid grid-cols-2 gap-4 text-center">
                            <div className="p-4 bg-black rounded border border-green-800/50">
                                <div className="text-3xl font-bold text-white">{stats.total}</div>
                                <div className="text-xs text-green-600 uppercase mt-1">Total Observations</div>
                            </div>
                            <div className="p-4 bg-black rounded border border-green-800/50">
                                <div className="text-3xl font-bold text-amber-500">{stats.pending}</div>
                                <div className="text-xs text-amber-700 uppercase mt-1">Pending Review</div>
                            </div>
                        </div>
                        <button onClick={refreshStats} className="mt-4 w-full flex items-center justify-center gap-2 text-xs hover:text-white transition-colors">
                            <RefreshCw size={12} /> Sync Status
                        </button>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-white font-bold opacity-80 border-b border-green-900 pb-2">0. Preparation (Setup Baseline)</h3>
                        <div className="flex flex-col gap-3">
                            <button onClick={handleInjectProjects} disabled={loading} className="w-full py-3 px-4 bg-blue-900/20 border border-blue-800 hover:bg-blue-900/40 text-blue-300 rounded transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
                                <Box size={14} /> Inject 5 Basic Sample Projects
                            </button>
                            <button onClick={handleLaunchDeepTest} disabled={loading} className="w-full py-4 px-4 bg-slate-900 border-2 border-slate-700 hover:bg-black text-slate-100 font-bold rounded-xl transition-all active:scale-95 disabled:opacity-50 flex flex-col items-center justify-center shadow-xl group">
                                <div className="flex items-center gap-3">
                                    <BrainCircuit size={20} className="text-blue-400 group-hover:scale-110 transition-transform" />
                                    <span>DEEP CONTEXT VALIDATION</span>
                                </div>
                                <span className="text-[10px] text-slate-500 mt-1 uppercase tracking-tighter">High-fidelity cross-silo scenarios (Rules, HR, Ledgers)</span>
                            </button>
                        </div>
                    </div>

                    {/* Injector */}
                    <div className="space-y-4">
                        <h3 className="text-white font-bold opacity-80 border-b border-green-900 pb-2">1. Inject Signal (Detection Simulation)</h3>
                        <div className="grid grid-cols-3 gap-2">
                            <button onClick={() => handleInject('weak', 5)} disabled={loading} className="py-3 px-4 bg-green-900/20 border border-green-800 hover:bg-green-900/40 text-green-300 rounded transition-all active:scale-95 disabled:opacity-50">
                                Weak (5)
                            </button>
                            <button onClick={() => handleInject('strong', 5)} disabled={loading} className="py-3 px-4 bg-green-900/20 border border-green-800 hover:bg-green-900/40 text-green-300 rounded transition-all active:scale-95 disabled:opacity-50">
                                Strong (5)
                            </button>
                            <button onClick={() => handleInject('random', 10)} disabled={loading} className="py-3 px-4 bg-green-900/20 border border-green-800 hover:bg-green-900/40 text-green-300 rounded transition-all active:scale-95 disabled:opacity-50">
                                Random (10)
                            </button>
                        </div>
                        <p className="text-xs text-green-800">* Injects SuspicionSignals directly into Inbox (Bypassing AI API)</p>
                    </div>

                    {/* Adjudicator */}
                    <div className="space-y-4">
                        <h3 className="text-white font-bold opacity-80 border-b border-green-900 pb-2">2. Run Adjudication (Deep Engine)</h3>
                        <div className="flex flex-col gap-2">
                            <button onClick={handleRunDeepAnalysis} disabled={loading || stats.pending === 0} className="w-full py-4 bg-purple-900/30 border border-purple-800 hover:bg-purple-900/50 text-purple-300 font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(168,85,247,0.1)]">
                                <ShieldCheck size={18} /> EXECUTE DEEP CONTEXT CROSS-CHECK
                            </button>
                        </div>
                    </div>

                    {/* Reset */}
                    <div className="pt-8">
                        <button onClick={handleReset} className="w-full py-2 flex items-center justify-center gap-2 text-red-500 hover:text-red-400 hover:bg-red-900/10 rounded transition-colors text-xs border border-transparent hover:border-red-900/30">
                            <Trash2 size={14} /> PURGE SYSTEM STATE (RESET DB)
                        </button>
                    </div>
                </div>

                {/* Right Panel: Logs */}
                <div className="flex flex-col h-full bg-green-950/10 rounded-lg border border-green-900/50 overflow-hidden">
                    <div className="bg-black/50 p-3 border-b border-green-900/50 flex justify-between items-center">
                        <span className="flex items-center gap-2 font-bold text-white"><Terminal size={14} /> VERDICT LOG</span>
                        <button onClick={() => setLogs([])} className="text-[10px] hover:text-white">CLEAR</button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-xs">
                        {logs.length === 0 && <div className="text-green-900 italic text-center mt-10">System Ready. Waiting for signals...</div>}
                        {logs.map((log, i) => (
                            <div key={i} className={`border-b border-green-900/20 pb-1 break-words ${log.includes("CONFIRMED") ? "text-red-400 font-bold" :
                                log.includes("DISMISSED") ? "text-slate-500" :
                                    log.includes("INJECTED") ? "text-blue-400" :
                                        log.includes("RESET") ? "text-orange-500" : ""
                                }`}>
                                {log}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
