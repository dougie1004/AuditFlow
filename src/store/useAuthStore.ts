import { create } from 'zustand';
import { safeInvoke } from '../lib/tauri-bridge';

interface User {
    name: string;
    email: string;
    tier: string;
}

interface AuthState {
    isRegistered: boolean;
    user: User | null;
    isLoading: boolean;
    checkRegistration: () => Promise<void>;
    register: (name: string, email: string, company: string, tier: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    isRegistered: true, // Default to true to prevent flickering before check
    user: null,
    isLoading: true,
    checkRegistration: async () => {
        set({ isLoading: true });
        try {
            const status: any = await safeInvoke('get_auth_status');
            set({ 
                isRegistered: status.is_registered, 
                user: status.user || null,
                isLoading: false 
            });
        } catch (error) {
            console.error('Failed to check auth status:', error);
            set({ isRegistered: false, isLoading: false });
        }
    },
    register: async (name, email, company, tier) => {
        set({ isLoading: true });
        try {
            await safeInvoke('register_user', { name, email, company, tier });
            set({ 
                isRegistered: true, 
                user: { name, email, tier },
                isLoading: false 
            });
        } catch (error) {
            console.error('Registration failed:', error);
            set({ isLoading: false });
            throw error;
        }
    }
}));
