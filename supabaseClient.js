import { createClient } from '@supabase/supabase-js';

// Replace with your actual Supabase URL and Anon Key
const supabaseUrl = process.env.SUPABASE_URL || 'https://bvidmranxxoueoruaayu.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2aWRtcmFueHhvdWVvcnVhYXl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyODA2MTgsImV4cCI6MjA2ODg1NjYxOH0.EukeZ-JJTmGPlBeunHD_-pUDE7De2Pdqscclg4FVIHY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
