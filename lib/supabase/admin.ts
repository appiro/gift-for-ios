import { createClient } from '@supabase/supabase-js';

// Service role client — bypasses RLS. Use only in admin API routes after verifying the requester is admin.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
