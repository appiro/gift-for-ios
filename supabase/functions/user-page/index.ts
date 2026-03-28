import { corsResponse, json } from '../_shared/cors.ts';
import { userClient } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse();
  if (req.method !== 'GET') return json({ error: 'Method not allowed' }, 405);

  const supabase = userClient(req);
  const userId = new URL(req.url).searchParams.get('userId');
  if (!userId) return json({ error: 'userId is required' }, 400);

  const { data: profile } = await supabase.from('profiles')
    .select('id, display_name, icon_url').eq('id', userId).single();

  const { count, data: reviews } = await supabase.from('reviews')
    .select('want_count, gift_count').eq('user_id', userId).eq('status', 'published');

  const wantTotal = (reviews ?? []).reduce((s, r) => s + (r.want_count ?? 0), 0);
  const giftTotal = (reviews ?? []).reduce((s, r) => s + (r.gift_count ?? 0), 0);

  return json({
    id: userId,
    displayName: profile?.display_name ?? null,
    iconUrl: profile?.icon_url ?? '/icons/cat.png',
    reviewCount: count ?? (reviews?.length ?? 0),
    wantTotal,
    giftTotal,
  });
});
