// Replace with your actual Supabase URL and Anon Key
const supabaseUrl = 'https://bvidmranxxoueoruaayu.supabase.co'; // Replace with your Supabase Project URL
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2aWRtcmFueHhvdWVvcnVhYXl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyODA2MTgsImV4cCI6MjA2ODg1NjYxOH0.EukeZ-JJTmGPlBeunHD_-pUDE7De2Pdqscclg4FVIHY'; // Replace with your Supabase Public Anon Key

// Initialize Supabase client using the globally available 'supabase' object from the CDN
export const supabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
