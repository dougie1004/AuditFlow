import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';

export interface Project {
    id: number;
    name: string;
    created_at: string;
}

export interface AuditData {
    id: number;
    project_id: number;
    file_name: string;
    file_type: string;
    file_path: string;
    upload_date: string;
    raw_content?: string;
}

interface ProjectState {
    projects: Project[];
    currentProject: Project | null;
    projectData: AuditData[];
    loading: boolean;

    // Actions
    initDb: () => Promise<void>;
    loadProjects: () => Promise<void>; // [체크] 이 이름이어야 함
    createProject: (name: string) => Promise<void>;
    setCurrentProject: (projectId: number) => void; // [체크] 이 기능이 있어야 함
    loadProjectData: (projectId: number) => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set: any, get: any) => ({
    projects: [],
    currentProject: null,
    projectData: [],
    loading: false,

    initDb: async () => {
        try {
            await invoke('init_db');
            console.log('DB Init Success');
            get().loadProjects();
        } catch (error) {
            console.error('DB Init Failed:', error);
        }
    },

    // [중요] 함수 이름이 'loadProjects' 여야 DataImport와 연결됩니다.
    loadProjects: async () => {
        set({ loading: true });
        try {
            const projects = await invoke<Project[]>('get_projects');
            set({ projects, loading: false });
        } catch (error) {
            console.error('Failed to load projects:', error);
            set({ loading: false });
        }
    },

    createProject: async (name: string) => {
        try {
            const id = await invoke<number>('create_project', { name });
            console.log('Project created with ID:', id);
            await get().loadProjects();
        } catch (error) {
            console.error('Failed to create project:', error);
        }
    },

    setCurrentProject: (projectId: number) => {
        const project = get().projects.find((p: Project) => p.id === projectId);
        set({ currentProject: project || null });
    },

    loadProjectData: async (projectId: number) => {
        set({ loading: true });
        try {
            const data = await invoke<AuditData[]>('get_project_data', { projectId });
            set({ projectData: data || [], loading: false });
        } catch (error) {
            console.error('Failed to load project data:', error);
            set({ projectData: [], loading: false });
        }
    },
}));