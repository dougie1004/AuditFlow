import { useState, useEffect } from "react";
import { safeInvoke } from "../lib/tauri-bridge";
import {
    History, Building2, Calendar, BrainCircuit, User,
    Search, Plus, ShieldCheck, Zap, AlertCircle, Database, Download
} from "lucide-react";
import { useLocation } from "react-router-dom";

interface Scenario {
    id: string;
    category: string;
    name: string;
    risk_level: string;
    description: string;
    origin_audit_type: string;
    origin_department: string;
    detected_date: string;
    is_ai_generated: boolean;
}

const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-white/5 rounded-3xl border border-white/10 shadow-sm hover:shadow-xl hover:border-blue-500 transition-all duration-300 overflow-hidden group ${className}`}>{children}</div>
);

const ScenarioCard = ({ s }: { s: Scenario }) => (
    <Card className="relative">
        {/* Lineage Badge */}
        <div className={`absolute top-0 right-0 p-6 z-10 flex flex-col items-end gap-2`}>
            {s.is_ai_generated ? (
                <>
                    <div className="flex items-center gap-1.5 bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tight border border-blue-500/20 shadow-sm animate-pulse">
                        <Zap size={10} className="fill-blue-400" /> NEW
                    </div>
                    <div className="flex items-center gap-1.5 bg-white/5 text-slate-400 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tight border border-white/10">
                        <BrainCircuit size={10} /> AI Discovery
                    </div>
                </>
            ) : s.origin_audit_type === '시스템 마스터' ? (
                <div className="flex items-center gap-1.5 bg-slate-900 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tight border border-slate-700">
                    <Database size={10} /> System Master
                </div>
            ) : (
                <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tight border border-emerald-500/20">
                    <User size={10} /> User Defined
                </div>
            )}
        </div>

        <div className="p-8 pb-4">
            <div className="flex items-center gap-2 mb-6">
                <span className="bg-slate-900 text-white px-3 py-1 rounded-lg text-[10px] font-black tracking-widest">{s.category}</span>
                <span className={`px-3 py-1 rounded-lg text-[10px] font-black tracking-widest ${s.risk_level === 'High' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                    {s.risk_level.toUpperCase()} RISK
                </span>
            </div>

            <h3 className="text-xl font-black text-white tracking-tight mb-4 leading-tight group-hover:text-blue-500 transition-colors">
                {s.name}
            </h3>

            <p className="text-sm text-slate-400 font-medium leading-relaxed line-clamp-3 min-h-[4.5rem] mb-6">
                {s.description}
            </p>
            <div className="flex items-center justify-between mt-auto">
                <span className="text-[10px] font-mono text-slate-600">ID: {s.id}</span>
                <span className="text-[10px] font-mono text-slate-600">v1.2.0</span>
            </div>
        </div>

        {/* Detailed Metadata Footer */}
        <div className="px-8 py-6 bg-white/[0.02] border-t border-white/5 grid grid-cols-2 gap-y-4">
            <div className="space-y-1">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                    <History size={10} /> Source Trace
                </p>
                <p className="text-xs font-bold text-slate-300">{s.origin_audit_type || '-'}</p>
            </div>
            <div className="space-y-1">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                    <Building2 size={10} /> Sector
                </p>
                <p className="text-xs font-bold text-slate-300">{s.origin_department || '-'}</p>
            </div>
            <div className="space-y-1 col-span-2">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                    <Calendar size={10} /> Identified At
                </p>
                <p className="text-xs font-bold text-slate-300">{s.detected_date ? s.detected_date.split(' ')[0] : '-'}</p>
            </div>
        </div>
    </Card>
);

export default function ScenarioManager() {
    const location = useLocation();
    const [scenarios, setScenarios] = useState<Scenario[]>([]);
    const [viewMode, setViewMode] = useState<"all" | "category" | "project" | "new" | "risk">("risk");
    const [searchTerm, setSearchTerm] = useState("");
    const [activeFilter, setActiveFilter] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        category: "FSC",
        risk_level: "Medium",
        description: "",
        origin_audit: "",
        origin_dept: "",
        is_ai: false
    });

    const loadScenarios = async () => {
        try {
            const res: Scenario[] = await safeInvoke("get_all_scenarios");
            setScenarios(res);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadScenarios();

        // Handle pre-fill from navigation state
        if (location.state?.prefill) {
            const { name, category, risk_level, description, source, isAI } = location.state.prefill;
            setFormData({
                name: name || "",
                category: category || "FSC",
                risk_level: risk_level || "Medium",
                description: description || "",
                origin_audit: source || "",
                origin_dept: "",
                is_ai: isAI || false
            });
            setIsModalOpen(true);
            // Clear location state to prevent re-opening on refresh
            window.history.replaceState({}, document.title);
        }
    }, [location]);

    const handleImportFromFindings = async () => {
        try {
            const latestAccepted: any = await safeInvoke("get_latest_accepted_finding");
            if (latestAccepted) {
                setFormData({
                    name: `[${latestAccepted.category}] 의심 패턴 (수동 임포트)`,
                    category: latestAccepted.category,
                    risk_level: latestAccepted.severity,
                    description: `[지적 사항]\n${latestAccepted.description}\n\n[증거]\n${latestAccepted.evidence}`,
                    origin_audit: latestAccepted.audit_id || "Recent Audit",
                    origin_dept: "",
                    is_ai: false
                });
                alert("최근 채택된 지적 사항을 성공적으로 불러왔습니다.");
            } else {
                alert("최근 채택된(Accepted) 지적 사항이 없습니다.");
            }
        } catch (err) {
            console.error("임포트 실패:", err);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await safeInvoke("create_custom_scenario", {
                category: formData.category,
                name: formData.name,
                riskLevel: formData.risk_level,
                description: formData.description,
                originAudit: formData.origin_audit,
                originDept: formData.origin_dept,
                isAi: formData.is_ai
            });
            setIsModalOpen(false);
            setFormData({ name: "", category: "FSC", risk_level: "Medium", description: "", origin_audit: "", origin_dept: "", is_ai: false });
            loadScenarios();
        } catch (err) {
            alert("저장 실패: " + err);
        }
    };

    const filtered = scenarios.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (s.origin_audit_type && s.origin_audit_type.toLowerCase().includes(searchTerm.toLowerCase()));

        // Active Filter Logic (Context-Aware)
        let matchesFilter = true;
        if (activeFilter) {
            if (viewMode === 'category') {
                matchesFilter = s.category === activeFilter;
            } else if (viewMode === 'project') {
                matchesFilter = (s.origin_audit_type || "기타/사용자정의") === activeFilter;
            } else {
                // Default to risk level filtering for 'risk', 'all', 'new'
                matchesFilter = s.risk_level === activeFilter;
            }
        }

        if (viewMode === "new") return matchesSearch && matchesFilter && s.is_ai_generated;
        return matchesSearch && matchesFilter;
    });

    const groupedByCategory = filtered.reduce((acc, s) => {
        (acc[s.category] = acc[s.category] || []).push(s);
        return acc;
    }, {} as Record<string, Scenario[]>);

    const groupedByProject = filtered.reduce((acc, s) => {
        const proj = s.origin_audit_type || "기타/사용자정의";
        (acc[proj] = acc[proj] || []).push(s);
        return acc;
    }, {} as Record<string, Scenario[]>);

    const groupedByRisk = ["High", "Medium", "Low"].reduce((acc, r) => {
        acc[r] = filtered.filter(s => s.risk_level === r);
        return acc;
    }, {} as Record<string, Scenario[]>);

    // Dynamic Filter Options Generator
    const getFilterOptions = () => {
        if (viewMode === 'category') {
            const categories = Array.from(new Set(scenarios.map(s => s.category))).sort();
            return {
                label: "모든 영역",
                options: categories.map(c => ({ value: c, label: `${c} 영역` }))
            };
        }
        if (viewMode === 'project') {
            const projects = Array.from(new Set(scenarios.map(s => s.origin_audit_type || "기타/사용자정의"))).sort();
            return {
                label: "모든 차수",
                options: projects.map(p => ({ value: p, label: p }))
            };
        }
        return {
            label: "모든 리스크",
            options: [
                { value: "High", label: "High Risk" },
                { value: "Medium", label: "Medium Risk" },
                { value: "Low", label: "Low Risk" }
            ]
        };
    };

    const filterConfig = getFilterOptions();

    if (loading) return <div className="h-screen flex items-center justify-center bg-[#0B1221]"><Zap className="animate-pulse text-blue-500 w-12 h-12" /></div>;

    return (
        <div className="p-8 md:p-12 bg-[#0B1221] min-h-screen text-slate-300">
            <div className="max-w-7xl mx-auto">
                {/* Header Area */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                                <ShieldCheck className="text-white" />
                            </div>
                            <span className="text-xs font-black text-blue-500 uppercase tracking-widest">DD Knowledge Base</span>
                        </div>
                        <h1 className="text-4xl font-black text-white tracking-tighter">통합 진단 시나리오 관리</h1>
                        <p className="text-slate-500 text-lg font-medium leading-relaxed max-w-2xl">
                            AI가 탐지한 새로운 리스크와 실사 전문가의 노하우가 결합된 지능형 준법 실사 지식 베이스입니다.
                        </p>
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-blue-500 transition-all active:scale-95 shadow-2xl shadow-blue-900/50"
                    >
                        <Plus size={16} /> 새 시나리오 등록
                    </button>
                </div>

                {/* View Mode Switching */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-10 p-3 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-sm">
                    <div className="flex gap-2 p-1 bg-white/5 rounded-2xl">
                        {[
                            { id: "risk", label: "리스크 등급별", icon: <AlertCircle size={14} className="text-red-500" /> },
                            { id: "all", label: "전체 목록", icon: <History size={14} /> },
                            { id: "new", label: "신규 Discovery", icon: <Zap size={14} className="text-blue-500 fill-blue-500" /> },
                            { id: "category", label: "업무 영역별", icon: <Building2 size={14} /> },
                            { id: "project", label: "진단 프로젝트별", icon: <Calendar size={14} /> }
                        ].map(mode => (
                            <button
                                key={mode.id}
                                onClick={() => {
                                    setViewMode(mode.id as any);
                                    setActiveFilter(null); // Reset filter on mode switch
                                }}
                                className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${viewMode === mode.id ? 'bg-blue-600 text-white shadow-sm border border-blue-500' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                {mode.icon}
                                {mode.label}
                            </button>
                        ))}
                        <button
                            onClick={() => { setViewMode("all"); setSearchTerm("시스템 마스터"); }}
                            className="bg-white/10 text-white px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 hover:bg-white/20 shadow-lg shadow-black/20"
                        >
                            <Database size={14} />
                            시스템 마스터 <span className="text-blue-400">{scenarios.filter(s => s.origin_audit_type === '시스템 마스터').length}건</span>
                        </button>
                    </div>
                    <div className="flex items-center gap-4 pr-4 flex-1 justify-end">
                        <select
                            value={activeFilter || ""}
                            onChange={(e) => setActiveFilter(e.target.value || null)}
                            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-300 outline-none focus:ring-2 focus:ring-blue-500/20"
                        >
                            <option value="" className="bg-[#0B1221]">{filterConfig.label}</option>
                            {filterConfig.options.map(opt => (
                                <option key={opt.value} value={opt.value} className="bg-[#0B1221]">{opt.label}</option>
                            ))}
                        </select>
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                            <input
                                type="text"
                                placeholder="지식 베이스 검색..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="bg-white/5 border border-white/10 rounded-2xl pl-12 pr-6 py-3 text-xs font-bold text-white focus:ring-2 focus:ring-blue-500/20 outline-none w-full shadow-sm"
                            />
                        </div>
                    </div>
                </div>

                {viewMode === "all" && filtered.length > 0 && scenarios.filter(s => s.origin_audit_type === '시스템 마스터').length === filtered.length && (
                    <div className="mb-12 p-8 bg-blue-600/10 border border-blue-500/20 rounded-3xl backdrop-blur-md">
                        <div className="flex items-center gap-4 mb-4">
                            <ShieldCheck className="text-blue-500 w-8 h-8" />
                            <h2 className="text-2xl font-black text-white">Global Enterprise Master Scenarios</h2>
                        </div>
                        <p className="text-slate-400 font-medium leading-relaxed">
                            ComplianceFlow의 지능형 엔진은 150개 이상의 글로벌 표준 실사 시나리오를 탑재하고 있습니다.
                            이 시나리오들은 Anti-Bribery, AML, ESG 등 엔터프라이즈급 규정 준수를 지원하며,
                            각 탐지 로직은 법인카드(CC), 구매(PR), 매출(SA) 등 전 도메인을 포괄합니다.
                        </p>
                    </div>
                )}
                {/* Content Area based on View Mode */}
                {(viewMode === "all" || viewMode === "new") && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filtered.map(s => <ScenarioCard key={s.id} s={s} />)}
                    </div>
                )}

                {viewMode === "risk" && (
                    <div className="space-y-16">
                        {Object.entries(groupedByRisk).map(([risk, items]) => (
                            <div key={risk} className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <h2 className={`text-xl font-black px-4 py-1 rounded-full border-2 ${risk === 'High' ? 'bg-red-500/10 text-red-500 border-red-500/20' : risk === 'Medium' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-blue-500/10 text-blue-500 border-blue-500/20'}`}>
                                        {risk === 'High' ? 'CRITICAL RISK / 고위험' : risk === 'Medium' ? 'MODERATE RISK / 중위험' : 'LOW RISK / 저위험'}
                                    </h2>
                                    <div className="flex-1 h-[1px] bg-white/5" />
                                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{items.length} SCENARIOS</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {items.map(s => <ScenarioCard key={s.id} s={s} />)}
                                </div>
                                {items.length === 0 && (
                                    <div className="text-center py-10 text-slate-400 font-medium">이 등급에 해당하는 시나리오가 없습니다.</div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {viewMode === "category" && (
                    <div className="space-y-16">
                        {Object.entries(groupedByCategory).map(([cat, list]) => (
                            <div key={cat} className="space-y-8">
                                <div className="flex items-center gap-4">
                                    <div className="h-px flex-1 bg-white/5" />
                                    <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-3">
                                        <span className="w-2 h-8 bg-blue-600 rounded-full" />
                                        {cat} 영역 시나리오 <span className="text-blue-600 text-sm">{list.length}</span>
                                    </h2>
                                    <div className="h-px flex-1 bg-white/5" />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {list.map(s => <ScenarioCard key={s.id} s={s} />)}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {viewMode === "project" && (
                    <div className="space-y-16">
                        {Object.entries(groupedByProject).map(([proj, list]) => (
                            <div key={proj} className="space-y-8">
                                <div className="flex items-center gap-4">
                                    <div className="h-px flex-1 bg-white/5" />
                                    <div className="bg-white/5 text-white px-6 py-2 rounded-2xl border border-white/10">
                                        <h2 className="text-sm font-black tracking-widest flex items-center gap-3 uppercase">
                                            <Calendar size={14} className="text-blue-400" />
                                            {proj} <span className="text-blue-400">{list.length}건</span>
                                        </h2>
                                    </div>
                                    <div className="h-px flex-1 bg-white/5" />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {list.map(s => <ScenarioCard key={s.id} s={s} />)}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {filtered.length === 0 && (
                    <div className="py-40 text-center">
                        <p className="text-slate-400 font-black text-xl uppercase tracking-widest italic opacity-50">No Knowledge Blocks Found</p>
                    </div>
                )}
            </div>

            {/* New Scenario Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsModalOpen(false)} />
                    <div className="bg-[#0B1221] w-full max-w-2xl rounded-3xl shadow-2xl relative border border-white/10 overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-8 border-b border-white/10 flex justify-between items-center bg-white/5">
                            <div>
                                <h2 className="text-xl font-black text-white tracking-tight">신규 진단 시나리오 등록</h2>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Manual Scenario Inclusion</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <button
                                    type="button"
                                    onClick={handleImportFromFindings}
                                    title="최근 의심 사례에서 가져오기"
                                    className="flex items-center gap-2 px-3 py-2 bg-purple-600/20 text-purple-400 border border-purple-600/30 rounded-xl text-[10px] font-black uppercase tracking-tight hover:bg-purple-600/30 transition-all"
                                >
                                    <Download size={14} /> 의심 사례(Findings)에서 가져오기
                                </button>
                                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-200 transition-colors">
                                    <Plus size={24} className="rotate-45" />
                                </button>
                            </div>
                        </div>
                        <form onSubmit={handleCreate} className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2 col-span-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Scenario Name</label>
                                    <input
                                        required
                                        type="text"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 font-bold text-white outline-none focus:border-blue-500 transition-all"
                                        placeholder="예: 특정 거래처 대량 현금 결제 징후"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Category</label>
                                    <select
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 font-bold text-white outline-none"
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                                    >
                                        <option value="FSC" className="bg-[#0B1221]">FSC (자금/회계)</option>
                                        <option value="HR" className="bg-[#0B1221]">HR (인사/노무)</option>
                                        <option value="TRE" className="bg-[#0B1221]">TRE (재무/리스크)</option>
                                        <option value="EXP" className="bg-[#0B1221]">EXP (경비/지출)</option>
                                        <option value="STP" className="bg-[#0B1221]">STP (구매/Sourcing)</option>
                                        <option value="OTC" className="bg-[#0B1221]">OTC (판매/채권)</option>
                                        <option value="ITG" className="bg-[#0B1221]">ITG (IT거버넌스)</option>
                                        <option value="TAX" className="bg-[#0B1221]">TAX (세무/공과)</option>
                                        <option value="LEG" className="bg-[#0B1221]">LEG (법무/준법)</option>
                                        <option value="ETC" className="bg-[#0B1221]">기타 (ETC)</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Risk Level</label>
                                    <select
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 font-bold text-white outline-none"
                                        value={formData.risk_level}
                                        onChange={e => setFormData({ ...formData, risk_level: e.target.value })}
                                    >
                                        <option value="High" className="bg-[#0B1221]">High Risk</option>
                                        <option value="Medium" className="bg-[#0B1221]">Medium Risk</option>
                                        <option value="Low" className="bg-[#0B1221]">Low Risk</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Source (Project)</label>
                                    <input
                                        type="text"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 font-bold text-white outline-none focus:border-blue-500 transition-all"
                                        placeholder="예: 2026 정기감사"
                                        value={formData.origin_audit}
                                        onChange={e => setFormData({ ...formData, origin_audit: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Sector / Area</label>
                                    <input
                                        type="text"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 font-bold text-white outline-none focus:border-blue-500 transition-all"
                                        placeholder="예: 영업기획팀"
                                        value={formData.origin_dept}
                                        onChange={e => setFormData({ ...formData, origin_dept: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2 col-span-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Detailed Description</label>
                                    <textarea
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 font-medium text-white outline-none h-32 resize-none focus:border-blue-500 transition-all placeholder:text-slate-600"
                                        placeholder="시나리오의 핵심 정의와 탐제 로직을 상세히 기록하세요..."
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="pt-4 flex gap-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-white/5 text-slate-400 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all">
                                    Cancel
                                </button>
                                <button type="submit" className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-500 transition-all shadow-xl shadow-blue-900/50">
                                    Create Scenario
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}