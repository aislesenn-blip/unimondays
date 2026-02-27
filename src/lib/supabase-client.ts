import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase environment variables for client!");
}

// Use placeholders if missing to satisfy createClient validation during build.
const url = supabaseUrl || 'https://missing-env.supabase.co';
const key = supabaseKey || 'missing-key';

export const supabaseClient = createClient(url, key);
