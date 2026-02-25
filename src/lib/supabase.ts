import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  // Log error but don't crash the process immediately to allow build to proceed
  console.error("Missing Supabase environment variables!");
}

// Use placeholders if missing to satisfy createClient validation during build.
// At runtime, these invalid credentials will cause operations to fail (Zero Trust),
// forcing the administrator to configure the environment correctly.
const url = supabaseUrl || 'https://missing-env.supabase.co';
const key = supabaseKey || 'missing-key';

export const supabase = createClient(url, key);
