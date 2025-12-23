import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type UserType = 'driver' | 'dispatcher' | 'admin';

export interface Company {
  id: string;
  name: string;
  created_at: string;
}

export interface UserProfile {
  id: string;
  phone: string;
  name: string;
  email: string;
  company_id: string | null;
  role: 'driver' | 'dispatcher' | 'admin';
  created_at: string;
  updated_at: string;
}
