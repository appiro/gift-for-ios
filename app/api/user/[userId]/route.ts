import { createClient } from '@/lib/supabase/server';
import type { NextRequest } from 'next/server';

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<'/api/user/[userId]'>
) {
  const { userId } = await ctx.params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, display_name, icon_url')
    .eq('id', userId)
    .single();

  // Count published reviews
  const { count } = await supabase
    .from('reviews')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'published');

  return Response.json({
    id: userId,
    displayName: profile?.display_name ?? null,
    iconUrl: profile?.icon_url ?? '/icons/cat.png',
    reviewCount: count ?? 0,
  });
}
