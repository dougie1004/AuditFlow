import { Link, useLocation } from "react-router-dom";
import { safeInvoke } from "../lib/tauri-bridge";
import {
    LayoutDashboard,
    Upload,
    Activity,
    Box,
    CreditCard,
    FileText,
    Briefcase,
    ShieldAlert,
    Settings,
    LogOut,
    BookOpen, // Added BookOpen for Knowledge Base
    Bot // Added Bot for AI Assistant
} from "lucide-react";

const menuItems = [
    { path: "/", label: "대시보드", icon: LayoutDashboard },
    { path: "/upload", label: "증거 자료 업로드", icon: Upload },
    { path: "/tasks", label: "감사 워크플로우", icon: Briefcase },
    { path: "/issues", label: "감사 이슈 (Findings)", icon: ShieldAlert },
    { path: "/scenarios", label: "감사 시나리오", icon: Activity },
    { path: "/process", label: "프로세스 통제 진단", icon: Activity },
    { path: "/production", label: "운영 리스크 예측", icon: Box },
    { path: "/corp-card", label: "법인카드 상시 감사", icon: CreditCard },
    { path: "/ai-assistant", label: "AI 감사 어시스턴트", icon: Bot },
    { path: "/knowledge-base", label: "감사 지식 베이스", icon: BookOpen },
    { path: "/audit-report", label: "감사 결론 및 보고서", icon: FileText },
    { path: "/history", label: "감사 이력 (History)", icon: BookOpen }, // Added Audit History
];

const ActiveAuditWidget = () => {
    // This would typically come from a context or API
    // For now, we mock the concept of "Multiple Active Sessions" as requested
    const auditSessions = [
        { id: '2025-Legal', name: 'Legal Team Annual Review', status: 'Active', updated: '2m ago' },
        { id: '2025-Sales', name: 'Sales HQ (Domestic)', status: 'Escalated', updated: '1h ago' },
        { id: '2024-Closing', name: 'FY2024 Closing Audit', status: 'Reviewing', updated: '1d ago' }
    ];

    return (
        <div className="mb-6 px-4">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex justify-between items-center">
                <span>Active Context</span>
                <span className="text-blue-400 cursor-pointer hover:text-blue-300">+ New</span>
            </div>
            <div className="space-y-2">
                {auditSessions.map(session => (
                    <div key={session.id} className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3 hover:bg-slate-800 hover:border-blue-500/30 transition-all cursor-pointer group">
                        <div className="flex justify-between items-start mb-1">
                            <span className="text-xs font-bold text-slate-200 group-hover:text-white truncate max-w-[140px]">{session.name}</span>
                            <div className={`w-1.5 h-1.5 rounded-full ${session.status === 'Active' ? 'bg-amber-500 animate-pulse' :
                                session.status === 'Escalated' ? 'bg-rose-500' : 'bg-blue-400'
                                }`} />
                        </div>
                        <div className="flex justify-between items-center text-[9px]">
                            <span className={`${session.status === 'Escalated' ? 'text-rose-400' : 'text-slate-500'
                                }`}>{session.status}</span>
                            <span className="text-slate-600 font-mono">{session.updated}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default function Sidebar() {
    const location = useLocation();

    return (
        <div style={{ width: "260px", background: "#1e293b", color: "white", height: "100vh", display: "flex", flexDirection: "column", padding: "20px 0", flexShrink: 0 }}>
            <div style={{ padding: "0 24px 20px", textAlign: "center" }}>
                <h1 style={{ fontSize: "20px", fontWeight: "900", color: "#3b82f6", margin: 0, letterSpacing: "-0.5px" }}>AuditFlow <span className="text-slate-500 font-light">Intelligence</span></h1>
                <p className="text-[9px] text-slate-500 mt-1 uppercase tracking-widest">Enterprise Risk Operating System</p>
            </div>

            <ActiveAuditWidget />

            <div className="px-4 mb-2">
                <div className="h-px bg-slate-700/50 w-full" />
            </div>

            <nav style={{ flex: 1, padding: "0 12px", overflowY: "auto" }}>
                {menuItems.map((item) => (
                    <Link
                        key={item.path}
                        to={item.path}
                        style={{
                            display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", borderRadius: "8px",
                            color: location.pathname === item.path ? "white" : "#94a3b8",
                            background: location.pathname === item.path ? "#334155" : "transparent",
                            textDecoration: "none", marginBottom: "4px", transition: "0.2s"
                        }}
                    >
                        <item.icon size={20} />
                        <span style={{ fontSize: "14px", fontWeight: "500" }}>{item.label}</span>
                    </Link>
                ))}
            </nav>

            <div style={{ padding: "20px 24px", borderTop: "1px solid #334155" }}>
                <div
                    onClick={async () => {
                        if (confirm("DB 최적화 및 임시파일 삭제를 진행하시겠습니까? (약 10초 소요)")) {
                            try {
                                const res = await safeInvoke('optimize_database');
                                const count = await safeInvoke('clean_temp_files');
                                alert(`유지보수 완료:\n${res}\n삭제된 임시파일: ${count}개`);
                            } catch (e) {
                                alert("유지보수 실패: " + e);
                            }
                        }
                    }}
                    style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px", cursor: "pointer", color: "#f59e0b" }}
                >
                    <Activity size={18} /> <span style={{ fontSize: "14px" }}>시스템 최적화</span>
                </div>
                <div
                    onClick={async () => {
                        const status = await safeInvoke<string>('get_gemini_api_key').catch(() => "미설정");
                        const newKey = prompt(`Gemini API Key를 설정합니다.\n현재: ${status}\n\n새 Key를 입력하세요 (취소 시 기존 유지):`, "");
                        if (newKey !== null && newKey.trim() !== "") {
                            try {
                                await safeInvoke('set_gemini_api_key', { key: newKey.trim() });
                                alert("API Key가 성공적으로 저장되었습니다.");
                            } catch (e) {
                                alert("저장 중 오류 발생: " + e);
                            }
                        }
                    }}
                    style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px", cursor: "pointer", color: "#94a3b8" }}
                >
                    <Settings size={18} /> <span style={{ fontSize: "14px" }}>설정 (AI API Key)</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer", color: "#ef4444" }}>
                    <LogOut size={18} /> <span style={{ fontSize: "14px" }}>로그아웃</span>
                </div>
            </div>
        </div>
    );
}