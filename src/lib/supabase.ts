import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('🔍 Debug Supabase Config:');
console.log('URL:', supabaseUrl);
console.log('Key exists:', !!supabaseAnonKey);
console.log('Key length:', supabaseAnonKey?.length);

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables!\n' +
    'Make sure .env.local has:\n' +
    'VITE_SUPABASE_URL=your-url\n' +
    'VITE_SUPABASE_ANON_KEY=your-key'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

