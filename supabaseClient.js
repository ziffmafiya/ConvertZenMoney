import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bvidmranxxoueoruaayu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2aWRtcmFueHhvdWVvcnVhYXl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyODA2MTgsImV4cCI6MjA2ODg1NjYxOH0.EukeZ-JJTmGPlBeunHD_-pUDE7De2Pdqscclg4FVIHY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
