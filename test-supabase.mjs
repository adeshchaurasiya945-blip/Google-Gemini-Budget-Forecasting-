import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('🔍 Supabase Config:');
console.log('URL:', supabaseUrl);
console.log('Key exists:', !!supabaseAnonKey);
console.log('Key length:', supabaseAnonKey?.length);

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false
  }
});

console.log('\n🧪 Testing Supabase connection with timeout...\n');

// Set a timeout for the entire operation
const timeoutPromise = new Promise((_, reject) => 
  setTimeout(() => reject(new Error('Request timeout after 5 seconds')), 5000)
);

try {
  const queryPromise = supabase
    .from('transactions')
    .select('*')
    .limit(5);

  const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

  if (error) {
    console.error('❌ Error:', error.message);
    console.error('Error code:', error.code);
    console.error('Error details:', error.details);
  } else {
    console.log('✅ Success! Data:', data);
    console.log('Records found:', data?.length || 0);
  }
} catch (err) {
  console.error('❌ Unexpected error:', err.message);
  console.error('Full error:', err);
}

process.exit(0);

