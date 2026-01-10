import { open } from '@tauri-apps/plugin-dialog';
import { isTauri, safeInvoke } from '../lib/tauri-bridge';

export interface AuditFile {
    id: number;
    file_name: string;
    file_type: string;
    file_path: string;
    upload_date: string;
}

export const pickFiles = async (): Promise<string[] | FileList | null> => {
    if (isTauri()) {
        try {
            const selected = await open({
                multiple: true,
                filters: [{
                    name: 'Audit Files',
                    extensions: ['xlsx', 'csv', 'pdf', 'docx', 'txt', 'eml', 'msg', 'log']
                }]
            });
            return Array.isArray(selected) ? selected : selected ? [selected] : null;
        } catch (err) {
            console.error("Tauri file picker error:", err);
            return null;
        }
    } else {
        // Web Fallback: Create a hidden input
        return new Promise((resolve) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.multiple = true;
            input.accept = '.xlsx,.csv,.pdf,.docx,.txt,.eml,.msg,.log';
            input.onchange = (e: any) => {
                const files = e.target.files;
                resolve(files && files.length > 0 ? files : null);
            };
            input.click();
        });
    }
};

export const uploadFile = async (projectType: string, file: string | File): Promise<any> => {
    if (isTauri() && typeof file === 'string') {
        return await safeInvoke('upload_audit_file', { projectType, filePath: file });
    } else if (file instanceof File) {
        // Web Fallback: Mock upload or store in memory
        console.log("Web upload for file:", file.name);

        // In a real web app, you'd upload to a server or process locally with JS libraries (e.g., xlsx.js)
        // For this demo, we can return a mock success
        return {
            status: "Success",
            file_name: file.name,
            pii_count: Math.floor(Math.random() * 5),
            id: Date.now()
        };
    }
    throw new Error("Unsupported upload mode");
};
