import React, { useState, useEffect } from 'react';
import { safeInvoke } from "../lib/tauri-bridge";
import { useNavigate } from 'react-router-dom';
import { useApp } from '../App';
import {
    Plus, ClipboardList, Calendar, Target, AlertCircle,
    CheckCircle2, ChevronRight, Hash, ArrowLeft, Loader2, History, X, Download, TrendingUp,
    Clock, Trash2
} from 'lucide-react';
import { AuditProject, AuditPlan } from '../types';

// Local UI wrapper for Card


const Card = ({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) => (
    <div onClick={onClick} className={`bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 shadow-sm overflow-hidden ${className}`}>{children}</div>
);

export default function AuditTask() {
    const { activeProject, setActiveProject } = useApp();
    const navigate = useNavigate();
    const [projects, setProjects] = useState<AuditProject[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [loading, setLoading] = useState(true);

    // Report State
    const [showReport, setShowReport] = useState(false);
    const [reportPeriod, setReportPeriod] = useState(3);
    const [reportYear, setReportYear] = useState(new Date().getFullYear());
    const [reportData, setReportData] = useState<{
        total_findings: number;
        year_data: { year: string; count: number }[];
        avg_compliance?: number;
    } | null>(null);

    const [reportLoading, setReportLoading] = useState(false);

    const [formData, setFormData] = useState({
        audit_type: '정기진단',
        target_year: '2026',
        target_month: '01',
        department: '',
        target_period: '',
        execution_period: '',
        audit_scope: '',
        valuation_tier: 'startup'
    });
    const [idSuffix, setIdSuffix] = useState("");

    const fetchProjects = async () => {
        setLoading(true);
        try {
            const res: AuditProject[] = await safeInvoke('get_audit_projects');
            setProjects(res);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchReport = async (year: number, years: number) => {
        setReportLoading(true);
        try {
            const res = await safeInvoke<{
                total_findings: number;
                year_data: { year: string; count: number }[];
                avg_compliance?: number;
            }>('get_annual_performance', { targetYear: year, yearsCount: years });
            setReportData(res);
        } catch (err) {
            console.error(err);
        } finally {
            setReportLoading(false);
        }
    };


    useEffect(() => {
        fetchProjects();
    }, []);

    const generateId = () => {
        const base = `${formData.audit_type}_${formData.target_year}-${formData.target_month}_${formData.department}`;
        return idSuffix ? `${base}_${idSuffix}` : base;
    };

    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null); // 초기화

        const [targetStart, targetEnd] = formData.target_period.split(' ~ ').map(d => d.trim());
        const [executionStart, executionEnd] = formData.execution_period.split(' ~ ').map(d => d.trim());
        const today = new Date().toISOString().split('T')[0];

        const project: AuditProject = {
            id: generateId(),
            title: `${formData.department} ${formData.audit_type} `,
            status: 'Planning',
            progress_pct: 0,
            findings_count: 0,
            risk_score: 0,
            start_date: targetStart || executionStart || today,
            end_date: targetEnd || executionEnd || today,
            lead_auditor: 'AI Assistant',
            planning_start: executionStart || today,
            planning_end: executionStart || today,
            fieldwork_start: executionStart || today,
            fieldwork_end: executionEnd || today,
            reporting_start: executionEnd || today,
            reporting_end: executionEnd || today,
            audit_scope: formData.audit_scope,
            audit_type: formData.audit_type,
            created_at: new Date().toISOString(),
            valuation_tier: formData.valuation_tier as 'seed' | 'startup' | 'enterprise'
        };

        try {
            await safeInvoke('create_audit_project', { project });
            setIsCreating(false);
            setIdSuffix("");
            fetchProjects();
        } catch (err: any) {
            console.error(err);
            const errStr = err.toString();
            if (errStr.includes("UNIQUE constraint failed")) {
                setErrorMsg("이미 동일한 프로젝트가 존재합니다. 'ADD UNIQUE SUFFIX'를 눌러 식별자를 추가하거나 정보를 변경하세요.");
            } else {
                setErrorMsg("저장 실패: " + err);
            }
        }
    };

    const handleDeleteProject = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!confirm(`'${id}' 프로젝트와 연관된 모든 데이터(파일, 이슈)를 삭제하시겠습니까 ? `)) return;
        try {
            await safeInvoke('delete_audit_project', { projectId: id });
            fetchProjects();
            if (activeProject === id) setActiveProject(null);
        } catch (err) {
            alert("삭제 실패: " + err);
        }
    };

    const handleResetDB = async () => {
        if (!confirm("주의: 모든 프로젝트, 시나리오, 이슈 데이터를 삭제하고 초기화하시겠습니까?")) return;
        try {
            await safeInvoke('reset_database');
            fetchProjects();
            setActiveProject(null);
            alert("시스템이 초기화되었습니다.");
        } catch (err) {
            alert("초기화 실패: " + err);
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-6 py-10 space-y-12 font-sans bg-[#0B1221] min-h-screen text-slate-300">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-full text-blue-400 text-[10px] font-black uppercase tracking-widest">
                        Strategic Compliance Control
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-tight">진단 업무 관리 <span className="text-slate-400 font-medium">(DD Portfolio)</span></h1>
                    <p className="text-slate-500 font-medium">수행 중이거나 완료된 모든 컴플라이언스 실사 및 진단 프로젝트를 관리합니다.</p>
                </div>

                {!isCreating && (
                    <div className="flex gap-4">
                        <button
                            onClick={handleResetDB}
                            className="bg-white/5 text-rose-500 border border-rose-500/20 px-4 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 hover:bg-rose-500/10 transition-all shadow-sm"
                        >
                            <Trash2 size={18} /> DB 초기화
                        </button>
                        <button
                            onClick={() => { setShowReport(true); fetchReport(reportYear, reportPeriod); }}
                            className="bg-white/5 text-slate-300 border border-white/10 px-6 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 hover:bg-white/10 transition-all shadow-sm"
                        >
                            <TrendingUp size={18} className="text-blue-500" /> 통계 보고서
                        </button>
                        <button
                            onClick={() => setIsCreating(true)}
                            className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-black text-sm flex items-center gap-2 hover:bg-black transition-all shadow-xl shadow-slate-200 active:scale-95"
                        >
                            <Plus size={18} /> 새 실사 업무 등록
                        </button>
                    </div>
                )}
            </div>

            {isCreating ? (
                <Card className="animate-in slide-in-from-bottom-4 duration-300">
                    <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/5">
                        <h2 className="text-xl font-black text-white flex items-center gap-2">
                            <ClipboardList className="text-blue-500" /> 신규 실사/진단 프로젝트 설정
                        </h2>
                        <button onClick={() => setIsCreating(false)} className="text-slate-400 hover:text-slate-200 flex items-center gap-1 text-sm font-bold">
                            <ArrowLeft size={16} /> 돌아가기
                        </button>
                    </div>
                    <form onSubmit={handleCreate} className="p-10 space-y-8 bg-[#0B1221]">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">진단 유형 (Type)</label>
                                <select
                                    value={formData.audit_type}
                                    onChange={e => setFormData({ ...formData, audit_type: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 font-bold text-white outline-none focus:ring-2 focus:ring-blue-500/20 transition-all [&>option]:bg-[#0B1221] [&>option]:text-white"
                                >
                                    <option value="정기진단">정기진단</option>
                                    <option value="수사진단">수사진단</option>
                                    <option value="제보실사">제보실사</option>
                                    <option value="특별실사">특별실사</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Target Period (Month)</label>
                                <div className="relative">
                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                                    <input
                                        type="month"
                                        value={`${formData.target_year}-${formData.target_month.padStart(2, '0')}`}
                                        onChange={e => {
                                            if (!e.target.value) return;
                                            const [y, m] = e.target.value.split('-');
                                            setFormData({ ...formData, target_year: y, target_month: m });
                                        }}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-12 py-3 font-bold text-white outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">기업 규모 (Valuation Tier)</label>
                                <select
                                    value={formData.valuation_tier}
                                    onChange={e => setFormData({ ...formData, valuation_tier: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 font-bold text-white outline-none focus:ring-2 focus:ring-blue-500/20 transition-all [&>option]:bg-[#0B1221] [&>option]:text-white"
                                >
                                    <option value="seed">Seed (초기 스타트업)</option>
                                    <option value="startup">Startup (성장기 스타트업)</option>
                                    <option value="enterprise">Enterprise (중견/대기업)</option>
                                </select>
                            </div>
                        </div>

                        <div className="p-6 bg-blue-500/10 rounded-2xl border border-blue-500/20 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Hash className="text-blue-600" />
                                <div>
                                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">컴플라이언스 진단 ID</p>
                                    <p className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                                        {generateId()}
                                        {!idSuffix && (
                                            <button
                                                type="button"
                                                onClick={() => setIdSuffix(Math.random().toString(36).substring(2, 6).toUpperCase())}
                                                className="bg-blue-500/20 text-blue-400 p-1 px-2 rounded-lg text-[9px] font-black hover:bg-blue-500/30 transition-colors"
                                                title="중복 방지 식별자 추가"
                                            >
                                                + ADD UNIQUE SUFFIX
                                            </button>
                                        )}
                                        {idSuffix && (
                                            <button
                                                type="button"
                                                onClick={() => setIdSuffix("")}
                                                className="text-slate-400 hover:text-red-500 transition-colors"
                                                title="식별자 제거"
                                            >
                                                <X size={14} />
                                            </button>
                                        )}
                                    </p>
                                </div>
                            </div>
                            <CheckCircle2 className="text-blue-200 w-10 h-10" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 flex items-center gap-2"><Calendar size={14} className="text-slate-400" /> 감사 대상 기간 (Audit Evidence Coverage)</label>
                                <div className="flex items-center gap-3">
                                    <input type="date" className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 font-bold text-white text-xs focus:ring-2 focus:ring-blue-500/20" value={formData.target_period.split(' ~ ')[0] || ''} onChange={e => {
                                        const [, end] = (formData.target_period || ' ~ ').split(' ~ ');
                                        setFormData({ ...formData, target_period: `${e.target.value} ~ ${end || ''}` });
                                    }} />
                                    <span className="font-bold text-slate-400">~</span>
                                    <input type="date" className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 font-bold text-white text-xs focus:ring-2 focus:ring-blue-500/20" value={formData.target_period.split(' ~ ')[1] || ''} onChange={e => {
                                        const [start] = (formData.target_period || ' ~ ').split(' ~ ');
                                        setFormData({ ...formData, target_period: `${start || ''} ~ ${e.target.value}` });
                                    }} />
                                </div>
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 flex items-center gap-2"><Clock size={14} className="text-slate-400" /> 실제 실무 수행 기간 (Fieldwork Timing)</label>
                                <div className="flex items-center gap-3">
                                    <input type="date" className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 font-bold text-white text-xs focus:ring-2 focus:ring-blue-500/20" value={formData.execution_period.split(' ~ ')[0] || ''} onChange={e => {
                                        const [, end] = (formData.execution_period || ' ~ ').split(' ~ ');
                                        setFormData({ ...formData, execution_period: `${e.target.value} ~ ${end || ''}` });
                                    }} />
                                    <span className="font-bold text-slate-400">~</span>
                                    <input type="date" className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 font-bold text-white text-xs focus:ring-2 focus:ring-blue-500/20" value={formData.execution_period.split(' ~ ')[1] || ''} onChange={e => {
                                        const [start] = (formData.execution_period || ' ~ ').split(' ~ ');
                                        setFormData({ ...formData, execution_period: `${start || ''} ~ ${e.target.value}` });
                                    }} />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-sm font-bold text-slate-400 flex items-center gap-2"><Target size={16} className="text-slate-400" /> 감사 범위 (Audit Scope)</label>
                            <textarea
                                placeholder="조사 대상 부서, 핵심 계정, 데이터 범위 등..."
                                className="w-full bg-white/5 text-white border border-white/10 rounded-xl px-4 py-3 text-sm h-32 focus:ring-2 focus:ring-blue-500/20 outline-none font-medium relative z-10"
                                value={formData.audit_scope}
                                onChange={e => setFormData({ ...formData, audit_scope: e.target.value })}
                            />
                        </div>

                        <div className="flex flex-col items-end pt-6">
                            {errorMsg && (
                                <div className="mb-4 flex items-center gap-2 text-rose-500 bg-rose-500/10 px-4 py-2 rounded-lg text-xs font-bold animate-in fade-in slide-in-from-bottom-2 border border-rose-500/20">
                                    <AlertCircle size={14} /> {errorMsg}
                                </div>
                            )}
                            <button type="submit" className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-500 transition-all shadow-xl active:scale-95">
                                실사 프로젝트 초기화 및 저장
                            </button>
                        </div>
                    </form>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {loading ? (
                        <div className="col-span-full py-20 flex flex-col items-center justify-center gap-4 text-slate-400">
                            <Loader2 className="animate-spin" size={40} />
                            <p className="font-bold uppercase tracking-widest text-xs">Loading Audit Portfolio...</p>
                        </div>
                    ) : projects.length === 0 ? (
                        <div className="col-span-full py-32 border-2 border-dashed border-white/10 rounded-[40px] flex flex-col items-center justify-center gap-6 bg-white/5">
                            <div className="p-6 bg-white/5 rounded-full text-slate-500">
                                <ClipboardList size={48} />
                            </div>
                            <div className="text-center">
                                <h3 className="text-xl font-black text-white">등록된 실사 업무가 없습니다.</h3>
                                <p className="text-slate-500 font-medium mt-1">상단의 '새 실사 업무 등록' 버튼을 눌러 시작하세요.</p>
                            </div>
                        </div>
                    ) : projects.map((p) => (
                        <Card
                            key={p.id}
                            onClick={() => {
                                setActiveProject(p.id);
                                navigate(`/project/${p.id}`);
                            }}
                            className={`group border-2 transition-all cursor-pointer ${activeProject === p.id ? 'border-blue-500 ring-4 ring-blue-500/10' : 'hover:border-blue-300 hover:shadow-2xl hover:-translate-y-2 duration-500'}`}
                        >
                            <div className="p-8 space-y-6">
                                <div className="flex justify-between items-start">
                                    <div className="w-12 h-12 rounded-2xl bg-white/10 text-white flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:bg-blue-600 transition-all duration-500">
                                        <Target size={24} />
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <div className="flex gap-2">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${p.audit_type === '정기감사' ? 'bg-blue-500/10 text-blue-400' :
                                                p.audit_type === '수시감사' ? 'bg-amber-500/10 text-amber-400' :
                                                    'bg-rose-500/10 text-rose-400'
                                                }`}>
                                                {p.audit_type}
                                            </span>
                                            <button
                                                onClick={(e) => handleDeleteProject(e, p.id)}
                                                className="p-1 px-2 rounded-lg text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                        <p className="text-[10px] text-slate-400 font-bold mt-1 font-mono uppercase tracking-tighter">
                                            Created: {p.created_at ? new Date(p.created_at).toLocaleDateString() : 'N/A'}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <h3 className="text-lg font-black text-white line-clamp-1 leading-tight">{p.title || p.id}</h3>
                                    <p className="text-sm font-bold text-slate-400 flex items-center gap-1 group-hover:text-blue-500 transition-colors">
                                        <CheckCircle2 size={14} /> Ref: {p.id}
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-4 py-6 border-y border-white/5">
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Status</p>
                                        <p className="text-xs font-bold text-blue-400 truncate">{p.status}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Findings</p>
                                        <p className="text-xs font-bold text-white truncate">{p.findings_count || 0}</p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Audit Scope</p>
                                    <p className="text-xs text-slate-500 font-medium line-clamp-2 leading-relaxed">
                                        {p.audit_scope || 'No scope defined for this audit project.'}
                                    </p>
                                </div>

                                <div className="flex items-center justify-between pt-4 group">
                                    <div className="flex -space-x-2">
                                        <div className="w-8 h-8 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center text-[10px] font-bold">AI</div>
                                        <div className="w-8 h-8 rounded-full border-2 border-slate-900 bg-blue-900 flex items-center justify-center text-[10px] font-bold text-blue-400 italic">G</div>
                                    </div>
                                    <div className="flex items-center gap-1 text-slate-300 group-hover:text-blue-500 transition-all font-black text-[10px] uppercase tracking-widest">
                                        Open Portfolio <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )
            }

            {/* Annual Report Modal */}
            {
                showReport && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-md bg-slate-900/60 transition-all">
                        <Card className="max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200 bg-[#0B1221] border-white/10">
                            <div className="p-8 border-b border-white/10 flex justify-between items-center bg-[#0B1221] sticky top-0 z-10">
                                <div>
                                    <h2 className="text-2xl font-black text-white tracking-tight">Compliance DD Analytics</h2>
                                    <p className="text-slate-500 text-sm font-medium">연간 실사 성과 및 탐지 통계를 심층 분석합니다.</p>
                                </div>
                                <button onClick={() => setShowReport(false)} className="p-2 hover:bg-white/5 rounded-full transition-all">
                                    <X size={24} className="text-slate-400" />
                                </button>
                            </div>

                            <div className="p-8 space-y-10">
                                {/* Controls */}
                                <div className="flex items-center gap-6 p-6 bg-white/5 rounded-[32px] border border-white/10">
                                    <div className="flex items-center gap-4">
                                        <span className="text-xs font-black uppercase tracking-widest text-slate-400">Target Year</span>
                                        <input
                                            type="number"
                                            value={reportYear}
                                            onChange={e => setReportYear(parseInt(e.target.value))}
                                            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 font-bold text-white outline-none w-24"
                                        />
                                    </div>
                                    <div className="flex items-center gap-4 border-l border-slate-200 pl-6">
                                        <span className="text-xs font-black uppercase tracking-widest text-slate-400">Analysis Span</span>
                                        <select
                                            value={reportPeriod}
                                            onChange={e => setReportPeriod(parseInt(e.target.value))}
                                            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 font-bold text-white outline-none"
                                        >
                                            <option value={3}>Last 3 Years</option>
                                            <option value={5}>Last 5 Years</option>
                                        </select>
                                    </div>
                                    <button
                                        onClick={() => fetchReport(reportYear, reportPeriod)}
                                        className="ml-auto bg-blue-600 text-white px-6 py-2 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                                    >
                                        RE-GENERATE REPORT
                                    </button>
                                </div>

                                {reportLoading ? (
                                    <div className="py-20 flex flex-col items-center justify-center gap-4 text-slate-400">
                                        <Loader2 className="animate-spin" size={40} />
                                        <p className="font-bold uppercase tracking-widest text-xs">Computing Cross-Year Analytics...</p>
                                    </div>
                                ) : reportData && (
                                    <div className="space-y-12 animate-in fade-in duration-500">
                                        {/* Stats Grid */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div className="p-8 rounded-[32px] bg-slate-900 text-white space-y-4">
                                                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                                                    <TrendingUp className="text-blue-400" size={20} />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Total Findings</p>
                                                    <p className="text-3xl font-black">{reportData.total_findings} <span className="text-sm font-medium text-slate-400">cases</span></p>
                                                </div>
                                            </div>
                                            <div className="p-8 rounded-[32px] bg-white border border-slate-200 space-y-4 shadow-sm">
                                                <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
                                                    <AlertCircle className="text-rose-500" size={20} />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Avg Risk Density</p>
                                                    <p className="text-3xl font-black text-white">{(reportData.total_findings / reportPeriod).toFixed(1)} <span className="text-sm font-medium text-slate-400">yearly</span></p>
                                                </div>
                                            </div>
                                            <div className="p-8 rounded-[32px] bg-white/5 border border-white/10 space-y-4 shadow-sm">
                                                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                                                    <History className="text-emerald-500" size={20} />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Performance Index</p>
                                                    <p className="text-3xl font-black text-white">{reportData?.avg_compliance || 0.0} <span className="text-sm font-medium text-slate-400">%</span></p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Chart */}
                                        <div className="space-y-6">
                                            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2">
                                                <TrendingUp size={14} /> Yearly Risk Trends & Activity
                                            </h3>
                                            <div className="flex items-end justify-between h-48 gap-4 pt-10">
                                                {reportData.year_data.map((y, idx: number) => {
                                                    const maxFindings = Math.max(...reportData.year_data.map(v => v.count), 1);
                                                    const height = (y.count / maxFindings) * 100;

                                                    return (
                                                        <div key={idx} className="flex-1 flex flex-col items-center gap-4 group">
                                                            <div className="w-full relative flex flex-col items-center justify-end h-full">
                                                                <div
                                                                    className="w-12 bg-white/5 rounded-t-xl transition-all duration-700 group-hover:bg-blue-600 relative overflow-hidden"
                                                                    style={{ height: `${height}% ` }}
                                                                >
                                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
                                                                    <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[10px] font-black text-slate-400 group-hover:text-white transition-colors">
                                                                        {y.count}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <span className="text-xs font-black text-slate-500 group-hover:text-blue-400 transition-colors uppercase tracking-widest">{y.year}Y</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="pt-10 flex justify-between items-center border-t border-white/10">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        ComplianceFlow Precision Analytics Engine v4.0
                                    </p>
                                    <button className="text-blue-600 font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:underline">
                                        <Download size={14} /> Export to PDF Report
                                    </button>
                                </div>
                            </div>
                        </Card>
                    </div>
                )
            }
        </div >
    );
}