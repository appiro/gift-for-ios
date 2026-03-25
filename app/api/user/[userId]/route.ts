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

  // Count published reviews + sum votes
  const { count, data: reviews } = await supabase
    .from('reviews')
    .select('want_count, gift_count')
    .eq('user_id', userId)
    .eq('status', 'published');

  const wantTotal = (reviews ?? []).reduce((s, r) => s + (r.want_count ?? 0), 0);
  const giftTotal = (reviews ?? []).reduce((s, r) => s + (r.gift_count ?? 0), 0);

  return Response.json({
    id: userId,
    displayName: profile?.display_name ?? null,
    iconUrl: profile?.icon_url ?? '/icons/cat.png',
    reviewCount: count ?? (reviews?.length ?? 0),
    wantTotal,
    giftTotal,
  });
}
