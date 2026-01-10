import { useState, useEffect } from "react";
import { safeInvoke } from "../lib/tauri-bridge";
import { CheckCircle, Clock, Calendar, User, Plus } from "lucide-react";

interface AuditTask { id: number; phase: string; title: string; assignee: string; due_date: string; status: "Pending" | "InProgress" | "Completed"; }

export default function TaskManagement() {
    const [tasks, setTasks] = useState<AuditTask[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data: AuditTask[] = await safeInvoke("get_audit_tasks");
                setTasks(data);
            } catch (err) { console.error(err); }
        };
        fetchData();
    }, []);

    const getStatusColor = (status: string) => {
        switch (status) {
            case "Completed": return "#10b981";
            case "InProgress": return "#3b82f6";
            default: return "#94a3b8";
        }
    };

    const renderTaskGroup = (phase: string, title: string) => {
        const phaseTasks = tasks.filter(t => t.phase === phase);
        return (
            <div style={{ background: "white", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "20px", marginBottom: "24px" }}>
                <h3 style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <Clock size={18} color="#334155" /> {title} <span style={{ fontSize: "12px", color: "#94a3b8", fontWeight: "normal" }}>{phaseTasks.length} tasks</span>
                </h3>
                {phaseTasks.map(task => (
                    <div key={task.id} style={{ display: "flex", alignItems: "center", padding: "12px 0", borderTop: "1px solid #f1f5f9" }}>
                        <div style={{ marginRight: "16px" }}>
                            <CheckCircle size={20} color={getStatusColor(task.status)} style={{ cursor: "pointer" }} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: "14px", fontWeight: "600", color: "#1e293b" }}>{task.title}</div>
                            <div style={{ display: "flex", gap: "16px", marginTop: "4px", fontSize: "12px", color: "#64748b" }}>
                                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><User size={12} /> {task.assignee}</span>
                                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><Calendar size={12} /> {task.due_date}</span>
                            </div>
                        </div>
                        <div style={{ fontSize: "12px", padding: "4px 8px", borderRadius: "4px", background: task.status === "InProgress" ? "#eff6ff" : "#f1f5f9", color: task.status === "InProgress" ? "#3b82f6" : "#64748b" }}>
                            {task.status}
                        </div>
                    </div>
                ))}
                <button style={{ marginTop: "12px", background: "none", border: "1px dashed #cbd5e1", borderRadius: "8px", width: "100%", padding: "10px", color: "#64748b", fontSize: "13px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                    <Plus size={16} /> 업무 추가하기
                </button>
            </div>
        );
    };

    const progress = tasks.length > 0 ? Math.round((tasks.filter(t => t.status === "Completed").length / tasks.length) * 100) : 0;

    return (
        <div style={{ padding: "32px", background: "#f8fafc", minHeight: "100vh", fontFamily: "Pretendard" }}>
            <div style={{ marginBottom: "32px" }}>
                <h2 style={{ fontSize: "24px", fontWeight: "bold", color: "#1e293b", marginBottom: "8px" }}>감사 업무 관리 (Audit Task Management)</h2>
                <p style={{ color: "#64748b" }}>감사 계획 수립부터 실행, 보고서 작성까지 전체 프로세스를 추적합니다.</p>
            </div>

            <div style={{ background: "white", padding: "24px", borderRadius: "12px", border: "1px solid #e2e8f0", marginBottom: "32px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                    <span style={{ fontWeight: "bold", color: "#1e293b" }}>전체 감사 진척도</span>
                    <span style={{ fontWeight: "bold", color: "#2563eb" }}>{progress}%</span>
                </div>
                <div style={{ width: "100%", height: "10px", background: "#f1f5f9", borderRadius: "5px", overflow: "hidden" }}>
                    <div style={{ width: `${progress}%`, height: "100%", background: "linear-gradient(90deg, #3b82f6, #2563eb)", borderRadius: "5px", transition: "width 0.5s" }}></div>
                </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "24px" }}>
                {renderTaskGroup("Planning", "1. 감사 계획 (Planning)")}
                {renderTaskGroup("Fieldwork", "2. 현장 감사 (Fieldwork)")}
                {renderTaskGroup("Reporting", "3. 보고 및 종료 (Reporting)")}
            </div>
        </div>
    );
}