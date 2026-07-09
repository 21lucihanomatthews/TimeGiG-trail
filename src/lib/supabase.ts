/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://lkufcqsgxatlqkicnirj.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxrdWZjcXNneGF0bHFraWNuaXJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1NDYxOTksImV4cCI6MjA5OTEyMjE5OX0.Xf2Fy07b6_nN3Z7tvA_lRi9emIp7_bIwfvLmCc4_do4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
