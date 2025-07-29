// Replace with your actual Supabase URL and Anon Key
const supabaseUrl = 'YOUR_SUPABASE_URL'; // Replace with your Supabase Project URL
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY'; // Replace with your Supabase Public Anon Key

// Initialize Supabase client using the globally available 'supabase' object from the CDN
export const supabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
