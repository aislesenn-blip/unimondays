import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  // Log error but don't crash the process immediately to allow build to proceed
  console.error("Missing Supabase environment variables!");
}

// Use placeholders if missing to satisfy createClient validation during build.
// At runtime, these invalid credentials will cause operations to fail (Zero Trust),
// forcing the administrator to configure the environment correctly.
const url = supabaseUrl || 'https://missing-env.supabase.co';
const anonKey = supabaseAnonKey || 'missing-anon-key';
const serviceKey = supabaseServiceKey || 'missing-service-key';

// Ensure you are using the Service Role Key for Admin privileges to bypass RLS during server-side processing
export const supabaseAdmin = createClient(url, serviceKey);

// Public client for client-side operations
// The user provided replacement code strictly uses `supabase` for admin actions like .list() and .download()
// Therefore we must ensure `supabase` is initialized with the service key, not the anon key.
export const supabase = supabaseAdmin;
