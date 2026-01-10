import { useState, useEffect } from "react";
import { safeInvoke } from "../lib/tauri-bridge";
import {
    CheckCircle2, Clock, AlertCircle, User,
    Calendar, MessageSquare, ChevronRight,
    Search, Save, X, ArrowRight,
    ClipboardCheck, Activity, ShieldAlert
} from "lucide-react";
import { useApp } from "../App";

interface AuditIssue {
    id: number;
    issue_title: string;
    description: string;
    severity: string;
    status: string;
    assignee?: string;
    due_date?: string;
    remediation_plan?: string;
    manager_comment?: string;
    detected_at: string;
    audit_id?: string;
}

const StatusBadge = ({ status }: { status: string }) => {
    const styles: Record<string, string> = {
        'Open': "bg-red-500/10 text-red-400 border-red-500/20",
        'In Progress': "bg-amber-500/10 text-amber-400 border-amber-500/20",
        'Closed': "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        'False Positive': "bg-white/5 text-slate-400 border-white/10"
    };
    return (
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tight border ${styles[status] || styles.Open}`}>
            {status}
        </span>
    );
};

export default function RemediationTracking() {
    const { activeProject } = useApp();
    const [issues, setIssues] = useState<AuditIssue[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedIssue, setSelectedIssue] = useState<AuditIssue | null>(null);
    const [filter, setFilter] = useState<string>("ALL");
    const [search, setSearch] = useState("");

    // Form states for update
    const [editStatus, setEditStatus] = useState("");
    const [editAssignee, setEditAssignee] = useState("");
    const [editDueDate, setEditDueDate] = useState("");
    const [editRemediation, setEditRemediation] = useState("");
    const [editComment, setEditComment] = useState("");

    const fetchIssues = async () => {
        setLoading(true);
        try {
            // Load all issues for current project scope
            const res: AuditIssue[] = await safeInvoke("get_audit_issues", { projectType: activeProject || "ALL" });
            setIssues(res);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchIssues();
    }, [activeProject]);

    const handleSelectIssue = (issue: AuditIssue) => {
        setSelectedIssue(issue);
        setEditStatus(issue.status);
        setEditAssignee(issue.assignee || "");
        setEditDueDate(issue.due_date || "");
        setEditRemediation(issue.remediation_plan || "");
        setEditComment(issue.manager_comment || "");
    };

    const handleUpdate = async () => {
        if (!selectedIssue) return;
        try {
            await safeInvoke("update_issue_status", {
                id: selectedIssue.id,
                status: editStatus,
                assignee: editAssignee || null,
                due_date: editDueDate || null,
                remediation: editRemediation,
                comment: editComment
            });
            alert("조치 현황이 성공적으로 업데이트되었습니다.");
            setSelectedIssue(null);
            fetchIssues();
        } catch (err) {
            alert("업데이트 실패: " + err);
        }
    };

    const filteredIssues = issues.filter(i => {
        const matchesStatus = filter === "ALL" || i.status === filter;
        const matchesSearch = i.issue_title.toLowerCase().includes(search.toLowerCase()) ||
            i.description.toLowerCase().includes(search.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    const stats = {
        total: issues.length,
        open: issues.filter(i => i.status === 'Open').length,
        inProgress: issues.filter(i => i.status === 'In Progress').length,
        closed: issues.filter(i => i.status === 'Closed').length,
    };

    return (
        <div className="bg-[#0B1221] min-h-screen p-8 md:p-12 text-slate-300">
            <div className="max-w-7xl mx-auto space-y-10">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Activity className="text-blue-600 w-5 h-5" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Compliance & Remediation</span>
                        </div>
                        <h1 className="text-4xl font-black text-white tracking-tighter">조치 이행 및 사후 관리</h1>
                        <p className="text-slate-500 font-medium mt-2 max-w-2xl">
                            탐지된 리스크 항목의 담당자를 지정하고, 조치 계획 수립부터 완료까지의 전 과정을 실시간으로 트래킹합니다.
                        </p>
                    </div>
                </div>

                {/* Stat Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {[
                        { label: "전체 리스크", count: stats.total, color: "text-white", bg: "bg-white/5", icon: <ClipboardCheck /> },
                        { label: "미조치 (Open)", count: stats.open, color: "text-red-500", bg: "bg-red-500/10", icon: <AlertCircle /> },
                        { label: "조치 중", count: stats.inProgress, color: "text-amber-500", bg: "bg-amber-500/10", icon: <Clock /> },
                        { label: "완료됨", count: stats.closed, color: "text-emerald-500", bg: "bg-emerald-500/10", icon: <CheckCircle2 /> },
                    ].map((stat, i) => (
                        <div key={i} className={`${stat.bg} border border-white/10 p-6 rounded-3xl shadow-sm flex items-center justify-between`}>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                                <p className={`text-3xl font-black ${stat.color}`}>{stat.count}</p>
                            </div>
                            <div className={`${stat.color} opacity-20`}>{stat.icon}</div>
                        </div>
                    ))}
                </div>

                {/* Table Section */}
                <div className="bg-white/5 border border-white/10 rounded-3xl shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 bg-white/5">
                        <div className="flex bg-white/5 rounded-xl border border-white/10 p-1">
                            {["ALL", "Open", "In Progress", "Closed"].map(s => (
                                <button
                                    key={s}
                                    onClick={() => setFilter(s)}
                                    className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${filter === s ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                        <div className="relative w-full md:w-96">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                            <input
                                type="text"
                                placeholder="이슈 제목 또는 설명 검색..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl outline-none focus:border-blue-500 transition-all text-sm font-medium text-white"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white/5">
                                    <th className="p-6">Issue & Severity</th>
                                    <th className="p-6">Status</th>
                                    <th className="p-6">Assignee</th>
                                    <th className="p-6">Due Date</th>
                                    <th className="p-6 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {loading ? (
                                    <tr><td colSpan={5} className="p-20 text-center text-slate-400 font-mono tracking-tighter">Loading compliance data...</td></tr>
                                ) : filteredIssues.length === 0 ? (
                                    <tr><td colSpan={5} className="p-20 text-center text-slate-400">데이터를 찾을 수 없습니다.</td></tr>
                                ) : (
                                    filteredIssues.map(issue => (
                                        <tr key={issue.id} className="hover:bg-white/[0.02] transition-colors group">
                                            <td className="p-6">
                                                <div className="flex items-start gap-4">
                                                    <div className={`w-1 h-12 rounded-full ${issue.severity === 'High' ? 'bg-red-500' : issue.severity === 'Medium' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                                                    <div className="max-w-md">
                                                        <h4 className="text-sm font-black text-white group-hover:text-blue-500 transition-colors mb-1">{issue.issue_title}</h4>
                                                        <p className="text-xs text-slate-400 line-clamp-1">{issue.description}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <StatusBadge status={issue.status} />
                                            </td>
                                            <td className="p-6">
                                                <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                                                    <User size={14} className="text-slate-700" />
                                                    {issue.assignee || <span className="text-slate-600 font-normal italic">Unassigned</span>}
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                                                    <Calendar size={14} className="text-slate-700" />
                                                    {issue.due_date || <span className="text-slate-600 font-normal">-</span>}
                                                </div>
                                            </td>
                                            <td className="p-6 text-right">
                                                <button
                                                    onClick={() => handleSelectIssue(issue)}
                                                    className="p-2.5 bg-white/5 text-slate-500 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                                >
                                                    <ChevronRight size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Edit Modal Overlay */}
            {selectedIssue && (
                <div className="fixed inset-0 z-[2000] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-[#0B1221] rounded-[40px] w-full max-w-3xl shadow-2xl border border-white/10 overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-8 border-b border-white/10 flex justify-between items-center bg-white/5">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-500/20">
                                    <ShieldAlert size={20} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-white tracking-tight">리스크 조치 관리</h3>
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Status & Remediation Planning</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedIssue(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                <X size={24} className="text-slate-400" />
                            </button>
                        </div>

                        <div className="p-10 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            <div className="space-y-2">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Target Finding</p>
                                <h4 className="text-xl font-black text-white leading-tight">{selectedIssue.issue_title}</h4>
                                <p className="text-sm text-slate-400 leading-relaxed font-medium bg-white/5 p-4 rounded-2xl border border-white/10">
                                    {selectedIssue.description}
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">현황 업데이트 (Status)</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {['Open', 'In Progress', 'Closed', 'False Positive'].map(s => (
                                            <button
                                                key={s}
                                                onClick={() => setEditStatus(s)}
                                                className={`py-3 px-4 rounded-xl text-xs font-bold border transition-all ${editStatus === s ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-white/5 border-white/10 text-slate-500 hover:border-white/20'}`}
                                            >
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="space-y-4">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">조치 담당자 (Assignee)</label>
                                        <input
                                            type="text"
                                            value={editAssignee}
                                            onChange={(e) => setEditAssignee(e.target.value)}
                                            placeholder="예: 홍길동 대리 (영업지원팀)"
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm font-bold text-white outline-none focus:border-blue-500 transition-all placeholder:font-medium placeholder:text-slate-600"
                                        />
                                    </div>
                                    <div className="space-y-4">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">조치 기한 (Due Date)</label>
                                        <input
                                            type="date"
                                            value={editDueDate}
                                            onChange={(e) => setEditDueDate(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm font-bold text-white outline-none focus:border-blue-500 transition-all [color-scheme:dark]"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest block flex items-center gap-2">
                                    <MessageSquare size={14} className="text-blue-500" /> 개선 권고 및 조치 계획 (Remediation Plan)
                                </label>
                                <textarea
                                    rows={4}
                                    value={editRemediation}
                                    onChange={(e) => setEditRemediation(e.target.value)}
                                    placeholder="상세 개선 조치 내용을 입력하십시오..."
                                    className="w-full bg-white/5 border border-white/10 rounded-3xl px-5 py-4 text-sm font-medium text-white outline-none focus:border-blue-500 transition-all resize-none placeholder:text-slate-600"
                                />
                            </div>

                            <div className="space-y-4">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">감사인 검토 의견 (Auditor's Final Comment)</label>
                                <textarea
                                    rows={3}
                                    value={editComment}
                                    onChange={(e) => setEditComment(e.target.value)}
                                    placeholder="최종 조치 결과에 대한 감사팀 의견을 기록하세요..."
                                    className="w-full bg-blue-500/5 border border-blue-500/20 rounded-3xl px-5 py-4 text-sm font-medium text-white outline-none focus:border-blue-500 transition-all resize-none placeholder:text-slate-600"
                                />
                            </div>
                        </div>

                        <div className="p-8 bg-slate-900 border-t border-white/5 flex justify-end gap-3">
                            <button
                                onClick={() => setSelectedIssue(null)}
                                className="px-8 py-4 bg-white/5 hover:bg-white/10 text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpdate}
                                className="px-10 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-2xl shadow-blue-900 flex items-center gap-2 active:scale-95"
                            >
                                <Save size={14} /> Update Compliance Status
                                <ArrowRight size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
