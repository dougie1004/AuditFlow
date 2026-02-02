import React, { useState, useEffect } from "react";
import StagingTable, { StagingRow } from "../components/StagingTable";
import { BrainCircuit, CheckCircle2, Save, FileSpreadsheet, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";

// [GOVERNANCE] Mock Data Generator removed to comply with Phase 4 Transparency.
// System now strictly relies on Backend Data Ingestion.

export default function StagingArea() {
    const navigate = useNavigate();
    const [rows, setRows] = useState<StagingRow[]>([]);
    const [stats, setStats] = useState({ total: 0, pending: 0, highRisk: 0, critical: 0 });

    useEffect(() => {
        // [PHASE 4] Clean State for User-provided Real Transaction Data
        // The user will upload their own 1,000 cases via the Import flow.
        setRows([]);
    }, []);

    useEffect(() => {
        const total = rows.length;
        const pending = rows.filter((r) => r.status === "Pending").length;
        const highRisk = rows.filter((r) => r.riskLevel === "High").length;
        const critical = rows.filter((r) => r.riskLevel === "Critical").length;
        setStats({ total, pending, highRisk, critical });
    }, [rows]);

    const handleUpdateRow = (id: string | number, updates: Partial<StagingRow>) => {
        setRows((prev) =>
            prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
        );
    };

    const handleApprove = (id: string | number) => {
        handleUpdateRow(id, { status: "Approved" });
    };

    const handleReject = (id: string | number) => {
        handleUpdateRow(id, { status: "Rejected" });
    };

    const handleCommit = () => {
        if (confirm(`Commit ${rows.filter(r => r.status === "Approved").length} approved transactions to the Master Ledger?`)) {
            alert("Committed successfully! (Simulated)");
            // Cleanup approved rows or navigate
            setRows(prev => prev.filter(r => r.status !== "Approved"));
        }
    };

    return (
        <div className="min-h-screen bg-[#0B1221] p-8 text-slate-200 pb-32">
            <div className="mx-auto max-w-7xl space-y-8">
                {/* Header */}
                <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
                    <div className="space-y-2">
                        <h1 className="text-3xl font-black italic tracking-tighter text-white uppercase md:text-4xl">
                            Staging Area <span className="text-blue-500">.</span>
                        </h1>
                        <p className="font-medium text-slate-400">
                            AI Account Mapping Review & Pre-Audit Validation
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-xs font-bold uppercase tracking-widest text-slate-300 transition-colors hover:bg-white/10">
                            <FileSpreadsheet className="h-4 w-4" /> Import More
                        </button>
                        <button
                            onClick={handleCommit}
                            className="flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-3 text-xs font-bold uppercase tracking-widest text-white shadow-lg transition-transform hover:scale-105 hover:bg-blue-500 active:scale-95"
                        >
                            <Save className="h-4 w-4" /> Commit to Ledger
                        </button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    <StatCard
                        label="Pending Review"
                        value={stats.pending}
                        icon={<CheckCircle2 className="h-5 w-5 text-slate-400" />}
                        color="text-slate-200"
                    />
                    <StatCard
                        label="AI Confidence < 70%"
                        value={rows.filter(r => r.confidence < 70).length}
                        icon={<BrainCircuit className="h-5 w-5 text-amber-400" />}
                        color="text-amber-400"
                    />
                    <StatCard
                        label="High Risk"
                        value={stats.highRisk}
                        icon={<AlertTriangle className="h-5 w-5 text-orange-400" />}
                        color="text-orange-400"
                    />
                    <StatCard
                        label="Critical Violations"
                        value={stats.critical}
                        icon={<AlertTriangle className="h-5 w-5 text-rose-500" />}
                        color="text-rose-500"
                        bg="bg-rose-500/10 border-rose-500/20"
                    />
                </div>

                {/* Main Table */}
                <StagingTable
                    data={rows}
                    onUpdateRow={handleUpdateRow}
                    onApprove={handleApprove}
                    onReject={handleReject}
                />
            </div>
        </div>
    );
}

const StatCard = ({ label, value, icon, color, bg }: any) => (
    <div className={`rounded-2xl border border-white/5 p-5 ${bg || "bg-white/5"}`}>
        <div className="mb-2 flex items-center justify-between opacity-70">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                {label}
            </span>
            {icon}
        </div>
        <div className={`text-3xl font-black tracking-tight ${color}`}>{value}</div>
    </div>
);
