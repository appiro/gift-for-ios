import { createClient } from '@/lib/supabase/server';

export async function requireAdmin(): Promise<{ userId: string } | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (data?.role !== 'admin') return null;
  return { userId: user.id };
}
