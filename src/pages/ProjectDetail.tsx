import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { safeInvoke } from "../lib/tauri-bridge";
import {
    Calendar, Users, Target, ShieldCheck,
    MapPin, Briefcase, TrendingUp, ChevronRight
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
        valuation_tier: "startup",
        entity_id: null as number | null
    });
    const [linkedEntity, setLinkedEntity] = useState<any>(null);
    const [isEditingEntity, setIsEditingEntity] = useState(false);

    const fetchProjectAndEntity = async () => {
        if (!id) return;
        setActiveProject(id);
        try {
            const projects: any[] = await safeInvoke("get_audit_projects");
            const found = projects.find((p: any) => p.id === id);
            if (found) {
                setProject(found);
                setEditData({
                    planning_start: found.planning_start || "",
                    planning_end: found.planning_end || "",
                    fieldwork_start: found.fieldwork_start || "",
                    fieldwork_end: found.fieldwork_end || "",
                    reporting_start: found.reporting_start || "",
                    reporting_end: found.reporting_end || "",
                    audit_scope: found.audit_scope || "",
                    start_date: found.start_date || "",
                    end_date: found.end_date || "",
                    valuation_tier: found.valuation_tier || "startup",
                    entity_id: found.entity_id || null
                });

                // Fetch linked universe entity if exists
                if (found.entity_id || found.title) {
                    const universe: any[] = await safeInvoke("get_audit_universe", { projectId: id });
                    if (universe && universe.length > 0) {
                        setLinkedEntity(universe[0]);
                    }
                }
            }
        } catch (err) {
            console.error("Failed to fetch project data", err);
        }
    };

    useEffect(() => {
        fetchProjectAndEntity();
    }, [id]);

    const handleSave = async () => {
        try {
            await safeInvoke("update_project_metadata", {
                projectId: id,
                planningStart: editData.planning_start,
                planningEnd: editData.planning_end,
                fieldworkStart: editData.fieldwork_start,
                fieldworkEnd: editData.fieldwork_end,
                reportingStart: editData.reporting_start,
                reportingEnd: editData.reporting_end,
                auditScope: editData.audit_scope,
                startDate: editData.start_date,
                endDate: editData.end_date,
                valuationTier: editData.valuation_tier,
                entityId: editData.entity_id
            });
            setIsEditing(false);
            fetchProjectAndEntity();
        } catch (err) {
            alert("저장 실패: " + err);
        }
    };

    const handleUpdateEntityField = async (field: string, value: string) => {
        if (!linkedEntity) return;
        try {
            await safeInvoke("update_audit_universe_field", { id: linkedEntity.id, field, value });
            fetchProjectAndEntity();
        } catch (err) {
            console.error("Failed to update entity field", err);
        }
    };

    if (!project) return (
        <div className="flex items-center justify-center min-h-screen bg-[#0B1221]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#0B1221] p-8 lg:p-12">
            <div className="max-w-7xl mx-auto space-y-10">
                {/* Header Management Bar */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div className="space-y-4 text-left">
                        <div className="flex items-center gap-2 text-blue-600">
                            <Briefcase size={16} />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">감사 프로젝트 상세 관리 (Project Management)</span>
                        </div>
                        <h1 className="text-4xl font-black text-white tracking-tighter leading-none">
                            {project.title}
                        </h1>
                        <div className="flex items-center gap-4">
                            <span className="bg-slate-900 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">{project.id}</span>
                            <span className="flex items-center gap-3 text-slate-500 text-xs font-bold bg-white/5 px-3 py-1 rounded-lg border border-white/5">
                                <Calendar size={14} className="text-blue-500" />
                                <span className="uppercase tracking-tighter opacity-70 mr-1">감사 대상 기간:</span>
                                {project.start_date} ~ {project.end_date}
                            </span>
                            <span className="flex items-center gap-1.5 text-slate-500 text-sm font-bold">
                                <MapPin size={14} /> Seoul HQ / Global Ops
                            </span>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <button
                            onClick={() => navigate(`/workspace`)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-lg shadow-blue-200 flex items-center gap-3 active:scale-95"
                        >
                            <ShieldCheck size={18} /> 감사 실행 워크스페이스로 이동
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left">
                    {/* Left Column: Scope & Team */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Audit Scope Definition */}
                        <div className="bg-white/5 backdrop-blur-2xl rounded-[32px] border border-white/10 p-8 shadow-sm space-y-6">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xl font-black text-white flex items-center gap-2">
                                    <Target className="text-blue-600" size={24} /> 실사 범위 (Scope) 정의
                                </h3>
                                {!isEditing ? (
                                    <button onClick={() => setIsEditing(true)} className="text-blue-600 font-bold text-xs uppercase tracking-widest hover:bg-blue-500/10 px-3 py-1 rounded-lg border border-blue-500/20">Edit Scope</button>
                                ) : (
                                    <div className="flex gap-2">
                                        <button onClick={() => setIsEditing(false)} className="text-slate-400 font-bold text-xs uppercase tracking-widest hover:bg-white/5 px-3 py-1 rounded-lg">Cancel</button>
                                        <button onClick={handleSave} className="text-emerald-600 font-bold text-xs uppercase tracking-widest hover:bg-emerald-500/10 px-3 py-1 rounded-lg">Save Changes</button>
                                    </div>
                                )}
                            </div>

                            {isEditing ? (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4 p-4 bg-slate-900/50 rounded-2xl border border-white/10">
                                        <div className="flex flex-col gap-1.5 flex-1 text-left">
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
                                        <div className="flex flex-col gap-1.5 flex-1 text-left">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Calendar size={12} className="text-blue-500" /> Audited Start Date</span>
                                            <input type="date" value={editData.start_date} onChange={(e) => setEditData({ ...editData, start_date: e.target.value })} className="bg-slate-900 text-white border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-medium" />
                                        </div>
                                        <div className="flex flex-col gap-1.5 flex-1 text-left">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Calendar size={12} className="text-blue-500" /> Audited End Date</span>
                                            <input type="date" value={editData.end_date} onChange={(e) => setEditData({ ...editData, end_date: e.target.value })} className="bg-slate-900 text-white border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-medium" />
                                        </div>
                                    </div>
                                    <textarea
                                        value={editData.audit_scope}
                                        onChange={(e) => setEditData({ ...editData, audit_scope: e.target.value })}
                                        className="w-full h-32 p-4 rounded-xl border border-slate-700 bg-slate-900 text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 relative z-10 block"
                                        placeholder="Enter detailed audit scope..."
                                    />
                                </div>
                            ) : (
                                <div className="space-y-4 text-left">
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
                        <div className="bg-white/5 backdrop-blur-2xl rounded-[32px] border border-white/10 p-8 shadow-sm space-y-6">
                            <h3 className="text-xl font-black text-white flex items-center gap-2">
                                <Calendar className="text-blue-600" size={24} /> 실사업무 수행 일정 (Fieldwork)
                            </h3>
                            <div className="space-y-6">
                                {['Planning', 'Fieldwork', 'Reporting'].map((phase: string) => {
                                    const keyStart = `${phase.toLowerCase()}_start` as keyof typeof editData;
                                    const keyEnd = `${phase.toLowerCase()}_end` as keyof typeof editData;
                                    const pStart = isEditing ? editData[keyStart] : (project[keyStart] as string);
                                    const pEnd = isEditing ? editData[keyEnd] : (project[keyEnd] as string);

                                    return (
                                        <div key={phase} className="space-y-2 text-left">
                                            <div className="flex justify-between items-center text-xs font-black uppercase tracking-widest">
                                                <span className="text-white">{phase === 'Planning' ? '기획/검토' : phase === 'Fieldwork' ? '실무 수행' : '보고서 작성'} 단계</span>
                                                {isEditing ? (
                                                    <div className="flex items-center gap-2">
                                                        <input type="date" value={pStart as string} onChange={(e) => setEditData({ ...editData, [keyStart]: e.target.value })} className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[10px]" />
                                                        <span className="text-white">-</span>
                                                        <input type="date" value={pEnd as string} onChange={(e) => setEditData({ ...editData, [keyEnd]: e.target.value })} className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[10px]" />
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400">{pStart} - {pEnd}</span>
                                                )}
                                            </div>
                                            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
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
                    <div className="space-y-8 text-left">
                        {/* Fieldwork Team */}
                        <div className="bg-white/5 backdrop-blur-2xl rounded-[32px] border border-white/10 p-8 shadow-sm space-y-6">
                            <h3 className="text-xl font-black text-white flex items-center gap-2">
                                <Users className="text-blue-600" size={24} /> 전문 실사 태스크포스(TF)
                            </h3>
                            <div className="space-y-4">
                                <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                                    <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-black">
                                        {project.lead_auditor?.substring(0, 2).toUpperCase() || "AU"}
                                    </div>
                                    <div>
                                        <p className="font-black text-white leading-none">{project.lead_auditor || "Lead Auditor"}</p>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">담당 조사관 (Investigator)</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* [NEW] Entity Context & Budget Management */}
                        <div className="bg-slate-900 border border-white/10 rounded-[32px] p-8 shadow-2xl space-y-6">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xl font-black text-white flex items-center gap-2 italic uppercase">
                                    <TrendingUp className="text-emerald-500" size={24} /> Entity Profile
                                </h3>
                                <button
                                    onClick={() => setIsEditingEntity(!isEditingEntity)}
                                    className="text-emerald-400 font-black text-[10px] uppercase tracking-widest hover:bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20"
                                >
                                    {isEditingEntity ? 'Close' : 'Edit Context'}
                                </button>
                            </div>

                            {linkedEntity ? (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-left">
                                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Budget Size</p>
                                            {isEditingEntity ? (
                                                <input
                                                    type="text"
                                                    defaultValue={linkedEntity.budget_size}
                                                    onBlur={(e) => handleUpdateEntityField('budget_size', e.target.value)}
                                                    className="bg-transparent text-white font-bold text-sm outline-none w-full"
                                                />
                                            ) : (
                                                <p className="text-sm font-black text-white">{linkedEntity.budget_size}</p>
                                            )}
                                        </div>
                                        <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-left">
                                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Headcount</p>
                                            {isEditingEntity ? (
                                                <input
                                                    type="number"
                                                    defaultValue={linkedEntity.headcount}
                                                    onBlur={(e) => handleUpdateEntityField('headcount', e.target.value)}
                                                    className="bg-transparent text-white font-bold text-sm outline-none w-full"
                                                />
                                            ) : (
                                                <p className="text-sm font-black text-white">{linkedEntity.headcount} 명</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-left">
                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Key Systems</p>
                                        {isEditingEntity ? (
                                            <textarea
                                                defaultValue={linkedEntity.key_systems}
                                                onBlur={(e) => handleUpdateEntityField('key_systems', e.target.value)}
                                                className="bg-transparent text-white font-bold text-xs outline-none w-full h-20 block"
                                            />
                                        ) : (
                                            <p className="text-xs font-bold text-slate-400 whitespace-pre-wrap">{linkedEntity.key_systems}</p>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-3 p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl text-left">
                                        <ShieldCheck className="text-emerald-500" size={18} />
                                        <div className="flex-1">
                                            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Risk Weight Multiplier</p>
                                            <p className="text-[11px] font-medium text-slate-400 leading-tight mt-0.5">
                                                본 사업부의 예산 규모({linkedEntity.budget_size})는 잠재적 재무 익스포저 산정의 기준선으로 활용됩니다.
                                            </p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => navigate('/')}
                                        className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all group"
                                    >
                                        <span className="text-[10px] font-black text-white uppercase tracking-widest">실시간 리스크 대시보드 확인</span>
                                        <ChevronRight size={16} className="text-slate-500 group-hover:translate-x-1 transition-transform" />
                                    </button>
                                </div>
                            ) : (
                                <div className="p-8 border-2 border-dashed border-white/5 rounded-2xl text-center">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">No Linked Universe Entity</p>
                                    <p className="text-[10px] text-slate-600 mt-1 font-medium">본 프로젝트는 아직 감사 유니버스 부서와 연결되지 않았습니다.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}