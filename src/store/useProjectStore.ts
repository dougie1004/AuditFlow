import { create } from 'zustand';
import { safeInvoke } from '../lib/tauri-bridge';

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
    loadProjects: () => Promise<void>;
    createProject: (name: string) => Promise<void>;
    setCurrentProject: (projectId: number) => void;
    loadProjectData: (projectId: number) => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set: any, get: any) => ({
    projects: [],
    currentProject: null,
    projectData: [],
    loading: false,

    initDb: async () => {
        try {
            await safeInvoke('init_db');
            console.log('DB Init Success');
            get().loadProjects();
        } catch (error) {
            console.error('DB Init Failed:', error);
        }
    },

    loadProjects: async () => {
        set({ loading: true });
        try {
            const projects = await safeInvoke<Project[]>('get_projects');
            set({ projects, loading: false });
        } catch (error) {
            console.error('Failed to load projects:', error);
            set({ loading: false });
        }
    },

    createProject: async (name: string) => {
        try {
            const id = await safeInvoke<number>('create_project', { name });
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
            const data = await safeInvoke<AuditData[]>('get_project_data', { projectId });
            set({ projectData: data || [], loading: false });
        } catch (error) {
            console.error('Failed to load project data:', error);
            set({ projectData: [], loading: false });
        }
    },
}));
