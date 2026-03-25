import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/adminAuth';

export async function GET() {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const supabase = createAdminClient();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: totalUsers },
    { count: totalReviews },
    { count: totalLists },
    { count: newUsers },
    { count: newReviews },
    { data: reactionData },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('status', 'published'),
    supabase.from('lists').select('*', { count: 'exact', head: true }).eq('status', 'published'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
    supabase.from('reviews').select('*', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
    supabase.from('reviews').select('want_count, gift_count').eq('status', 'published'),
  ]);

  const totalWant = reactionData?.reduce((s: number, r: { want_count: number }) => s + (r.want_count ?? 0), 0) ?? 0;
  const totalGift = reactionData?.reduce((s: number, r: { gift_count: number }) => s + (r.gift_count ?? 0), 0) ?? 0;

  return Response.json({
    totalUsers: totalUsers ?? 0,
    totalReviews: totalReviews ?? 0,
    totalLists: totalLists ?? 0,
    newUsers: newUsers ?? 0,
    newReviews: newReviews ?? 0,
    totalWant,
    totalGift,
  });
}
