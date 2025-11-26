import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tldhlqvydsecajenoydt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsZGhscXZ5ZHNlY2FqZW5veWR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxMTUxMDQsImV4cCI6MjA3OTY5MTEwNH0.I4OtUYWrbhKEQ9RK4QwiO7WqCjvlhNknoFnN6gZHuoE';

export const supabase = createClient(supabaseUrl, supabaseKey);