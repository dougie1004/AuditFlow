import { createClient } from '@supabase/supabase-js';

// 실제 운영 환경에서는 .env 또는 DB에서 로드해야 합니다.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Profile {
    id: string;
    email: string;
    full_name: string;
    company_name: string;
    tier: string;
}
