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
    { path: "/upload", label: "데이터 업로드", icon: Upload },
    { path: "/tasks", label: "진단 업무 관리", icon: Briefcase }, 
    { path: "/issues", label: "탐지 리스크 관리", icon: ShieldAlert }, 
    { path: "/scenarios", label: "진단 시나리오", icon: Activity }, 
    { path: "/process", label: "프로세스 진단", icon: Activity },
    { path: "/production", label: "공정 운영 예측", icon: Box },
    { path: "/corp-card", label: "법인카드 오남용", icon: CreditCard },
    { path: "/ai-assistant", label: "AI 어시스턴트", icon: Bot },
    { path: "/knowledge-base", label: "지식 베이스 (RAG)", icon: BookOpen },
    { path: "/audit-report", label: "최종 보고서", icon: FileText },
];

export default function Sidebar() {
    const location = useLocation();

    return (
        <div style={{ width: "260px", background: "#1e293b", color: "white", height: "100vh", display: "flex", flexDirection: "column", padding: "20px 0", flexShrink: 0 }}>
            <div style={{ padding: "0 24px 30px", textAlign: "center" }}>
                <h1 style={{ fontSize: "22px", fontWeight: "900", color: "#3b82f6", margin: 0 }}>ComplianceFlow AI</h1>
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
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px", cursor: "pointer", color: "#94a3b8" }}>
                    <Settings size={18} /> <span style={{ fontSize: "14px" }}>설정</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer", color: "#ef4444" }}>
                    <LogOut size={18} /> <span style={{ fontSize: "14px" }}>로그아웃</span>
                </div>
            </div>
        </div>
    );
}