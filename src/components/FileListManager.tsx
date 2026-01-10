import { useState, useEffect } from "react";
import { safeInvoke } from "../lib/tauri-bridge";

// 데이터 타입 정의
interface AuditData {
    id: number;
    file_name: string;
    file_type: string;
    upload_date: string;
}

export default function FileListManager({ projectId }: { projectId: number }) {
    const [files, setFiles] = useState<AuditData[]>([]);

    // 1. 파일 목록 불러오기
    const loadFiles = async () => {
        try {
            const result: AuditData[] = await safeInvoke("get_project_data", { projectId });
            setFiles(result);
        } catch (error) {
            console.error("파일 목록 로드 실패:", error);
        }
    };

    // 2. 파일 삭제 함수
    const handleDelete = async (dataId: number) => {
        if (!confirm("이 데이터를 삭제하시겠습니까? 분석 범위에서 제외됩니다.")) return;

        try {
            await safeInvoke("delete_audit_data", { dataId });
            alert("삭제되었습니다.");
            loadFiles(); // 삭제 후 목록 갱신
        } catch (error) {
            alert("삭제 중 오류 발생: " + error);
        }
    };

    useEffect(() => {
        loadFiles();
    }, [projectId]);

    return (
        <div className="file-manager">
            <h3>업로드된 파일 관리 (분석 대상)</h3>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                    <tr style={{ background: "#f4f4f4" }}>
                        <th>파일명</th>
                        <th>유형</th>
                        <th>업로드 일시</th>
                        <th>관리</th>
                    </tr>
                </thead>
                <tbody>
                    {files.map((file) => (
                        <tr key={file.id} style={{ borderBottom: "1px solid #ddd" }}>
                            <td>{file.file_name}</td>
                            <td>{file.file_type === "data" ? "📊 장부" : "📄 증빙"}</td>
                            <td>{file.upload_date}</td>
                            <td>
                                <button
                                    onClick={() => handleDelete(file.id)}
                                    style={{ color: "white", background: "#ff4d4d", border: "none", padding: "5px 10px", borderRadius: "4px", cursor: "pointer" }}
                                >
                                    삭제
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {files.length === 0 && <p>업로드된 파일이 없습니다.</p>}
        </div>
    );
}