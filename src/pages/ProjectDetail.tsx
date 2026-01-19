import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { safeInvoke } from "../lib/tauri-bridge";
import {
    Calendar, Users, Target, ShieldCheck,
    MapPin, Briefcase
} from "lucide-react";
import { useApp } from "../App";

export default function ProjectDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { setActiveProject } = useApp();
    const [project, setProject] = useState<any>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({
        planning_start: "", planning_end: "",
        fieldwork_start: "", fieldwork_end: "",
        reporting_start: "", reporting_end: "",
        audit_scope: "",
        start_date: "",
        end_date: "",
        valuation_tier: "startup"
    });

    useEffect(() => {
        if (id) {
            setActiveProject(id);
            safeInvoke("get_audit_projects").then((res: any) => {
                const found = res.find((p: any) => p.id === id);
                if (found) {
                    setProject(found);
                    setEditData({
                        planning_start: found.planning_start || "", planning_end: found.planning_end || "",
                        fieldwork_start: found.fieldwork_start || "", fieldwork_end: found.fieldwork_end || "",
                        reporting_start: found.reporting_start || "", reporting_end: found.reporting_end || "",
                        audit_scope: found.audit_scope || "",
                        start_date: found.start_date || "",
                        end_date: found.end_date || "",
                        valuation_tier: found.valuation_tier || "startup"
                    });
                }
            });
        }
    }, [id, setActiveProject]);

    const handleSave = async () => {
        await safeInvoke("update_project_metadata", {
            projectId: id,
            ...editData
        });
        setIsEditing(false);
        // Refresh
        const res: any = await safeInvoke("get_audit_projects");
        const found = res.find((p: any) => p.id === id);
        if (found) setProject(found);
    };

    if (!project) return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#0B1221] p-8 lg:p-12">
            <div className="max-w-7xl mx-auto space-y-10">
                {/* Header Management Bar */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-blue-600">
                            <Briefcase size={16} />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">프로젝트 실사 관리 (DD Management)</span>
                        </div>
                        <h1 className="text-4xl font-black text-white tracking-tighter leading-none">
                            {project.title}
                        </h1>
                        <div className="flex items-center gap-4">
                            <span className="bg-slate-900 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">{project.id}</span>
                            <span className="flex items-center gap-3 text-slate-500 text-xs font-bold bg-white/5 px-3 py-1 rounded-lg border border-white/5">
                                <Calendar size={14} className="text-blue-500" />
                                <span className="uppercase tracking-tighter opacity-70 mr-1">실사 대상 기간:</span>
                                {project.start_date} ~ {project.end_date}
                            </span>
                            <span className="flex items-center gap-1.5 text-slate-500 text-sm font-bold">
                                <MapPin size={14} /> Seoul HQ / Global Ops
                            </span>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <button
                            onClick={() => navigate(`/data-upload/${id}`)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-lg shadow-blue-200 flex items-center gap-3 active:scale-95"
                        >
                            <ShieldCheck size={18} /> 실사 작업 환경 실행 (Execution)
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Scope & Team */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Audit Scope Definition */}
                        <div className="bg-white/5 backdrop-blur-2xl rounded-[32px] border border-white/10 p-8 shadow-sm space-y-6">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xl font-black text-white flex items-center gap-2">
                                    <Target className="text-blue-600" size={24} /> 실사 범위 (Scope) 정의
                                </h3>
                                {!isEditing ? (
                                    <button onClick={() => setIsEditing(true)} className="text-blue-600 font-bold text-xs uppercase tracking-widest hover:bg-blue-50 px-3 py-1 rounded-lg">Edit Scope</button>
                                ) : (
                                    <div className="flex gap-2">
                                        <button onClick={() => setIsEditing(false)} className="text-slate-400 font-bold text-xs uppercase tracking-widest hover:bg-slate-50 px-3 py-1 rounded-lg">Cancel</button>
                                        <button onClick={handleSave} className="text-emerald-600 font-bold text-xs uppercase tracking-widest hover:bg-emerald-50 px-3 py-1 rounded-lg">Save Changes</button>
                                    </div>
                                )}
                            </div>

                            {isEditing ? (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4 p-4 bg-slate-900/50 rounded-2xl border border-white/10">
                                        <div className="flex flex-col gap-1.5 flex-1">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Briefcase size={12} className="text-blue-500" /> Valuation Tier</span>
                                            <select
                                                value={editData.valuation_tier}
                                                onChange={(e) => setEditData({ ...editData, valuation_tier: e.target.value })}
                                                className="bg-slate-900 text-white border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-medium focus:outline-none"
                                            >
                                                <option value="seed">Seed (초기 스타트업)</option>
                                                <option value="startup">Startup (성장기 스타트업)</option>
                                                <option value="enterprise">Enterprise (중견/대기업)</option>
                                            </select>
                                        </div>
                                        <div className="flex flex-col gap-1.5 flex-1">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Calendar size={12} className="text-blue-500" /> Audited Start Date</span>
                                            <input type="date" value={editData.start_date} onChange={(e) => setEditData({ ...editData, start_date: e.target.value })} className="bg-slate-900 text-white border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-medium" />
                                        </div>
                                        <div className="flex flex-col gap-1.5 flex-1">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Calendar size={12} className="text-blue-500" /> Audited End Date</span>
                                            <input type="date" value={editData.end_date} onChange={(e) => setEditData({ ...editData, end_date: e.target.value })} className="bg-slate-900 text-white border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-medium" />
                                        </div>
                                    </div>
                                    <textarea
                                        value={editData.audit_scope}
                                        onChange={(e) => setEditData({ ...editData, audit_scope: e.target.value })}
                                        className="w-full h-32 p-4 rounded-xl border border-slate-700 bg-slate-900 text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 relative z-10"
                                        placeholder="Enter detailed audit scope..."
                                    />
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-full text-blue-400 text-[10px] font-bold uppercase tracking-widest">
                                        Target: {project.valuation_tier === 'seed' ? 'Seed' : project.valuation_tier === 'enterprise' ? 'Enterprise' : 'Startup'}
                                    </div>
                                    <p className="text-slate-500 leading-relaxed font-medium whitespace-pre-wrap">
                                        {project.audit_scope || "No specific scope defined for this project."}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Gantt Timeline Simulation */}
                        <div className="bg-white rounded-[32px] border border-slate-200 p-8 shadow-sm space-y-6">
                            <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                                <Calendar className="text-blue-600" size={24} /> 실사업무 수행 일정 (Fieldwork)
                            </h3>
                            <div className="space-y-6">
                                {['Planning', 'Fieldwork', 'Reporting'].map((phase: string) => {
                                    const keyStart = `${phase.toLowerCase()}_start` as keyof typeof editData;
                                    const keyEnd = `${phase.toLowerCase()}_end` as keyof typeof editData;
                                    const pStart = isEditing ? editData[keyStart] : project[keyStart];
                                    const pEnd = isEditing ? editData[keyEnd] : project[keyEnd];

                                    return (
                                        <div key={phase} className="space-y-2">
                                            <div className="flex justify-between items-center text-xs font-black uppercase tracking-widest">
                                                <span className="text-slate-900">{phase === 'Planning' ? '기획/검토' : phase === 'Fieldwork' ? '실무 수행' : '보고서 작성'} 단계</span>
                                                {isEditing ? (
                                                    <div className="flex items-center gap-2">
                                                        <input type="date" value={pStart} onChange={(e) => setEditData({ ...editData, [keyStart]: e.target.value })} className="border border-slate-200 rounded px-2 py-1 text-[10px]" />
                                                        <span>-</span>
                                                        <input type="date" value={pEnd} onChange={(e) => setEditData({ ...editData, [keyEnd]: e.target.value })} className="border border-slate-200 rounded px-2 py-1 text-[10px]" />
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400">{pStart} - {pEnd}</span>
                                                )}
                                            </div>
                                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full bg-blue-600 rounded-full opacity-50`}
                                                    style={{ width: '100%' }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Assignments & Stats */}
                    <div className="space-y-8">
                        {/* Fieldwork Team */}
                        <div className="bg-white rounded-[32px] border border-slate-200 p-8 shadow-sm space-y-6">
                            <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                                <Users className="text-blue-600" size={24} /> 전문 실사 태스크포스(TF)
                            </h3>
                            <div className="space-y-4">
                                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-black">
                                        {project.lead_auditor?.substring(0, 2).toUpperCase() || "AU"}
                                    </div>
                                    <div>
                                        <p className="font-black text-slate-900 leading-none">{project.lead_auditor || "Lead Auditor"}</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">담당 조사관 (Investigator)</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 p-4 border border-slate-100 rounded-2xl">
                                    <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center text-slate-500 font-black">AI</div>
                                    <div>
                                        <p className="font-black text-slate-900 leading-none">ComplianceFlow 인텔리전스 엔진</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Forensic Analysis Layer</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}