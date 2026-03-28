import { corsResponse, json } from '../_shared/cors.ts';
import { userClient } from '../_shared/supabase.ts';

function toReview(row: Record<string, unknown>) {
  return {
    id: row.id, title: row.title, productName: row.product_name,
    price: row.price, imageUrl: row.image_url, images: row.images ?? [],
    episode: row.episode, likes: row.likes ?? 0,
    wantCount: row.want_count ?? 0, giftCount: row.gift_count ?? 0,
    gender: row.gender, ageGroup: row.age_group,
    relationship: row.relationship ?? [], scene: row.scene ?? [], category: row.category ?? [],
    authorName: row.author_name, authorIcon: row.author_icon,
    createdAt: row.created_at, updatedAt: row.updated_at, status: row.status,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse();

  const supabase = userClient(req);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return json({ error: 'Unauthorized' }, 401);

  if (req.method === 'GET') {
    const { data, error } = await supabase.from('reviews').select('*')
      .eq('user_id', user.id).order('created_at', { ascending: false });
    if (error) return json({ error: error.message }, 500);
    return json((data ?? []).map(toReview));
  }

  if (req.method === 'PATCH') {
    const { id, status } = await req.json() as { id: string; status: string };
    if (!['published', 'private', 'draft', 'trash'].includes(status)) {
      return json({ error: 'Invalid status' }, 400);
    }
    const { error } = await supabase.from('reviews').update({ status }).eq('id', id).eq('user_id', user.id);
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true });
  }

  if (req.method === 'DELETE') {
    const { id } = await req.json() as { id: string };
    const { error } = await supabase.from('reviews').delete().eq('id', id).eq('user_id', user.id);
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true });
  }

  return json({ error: 'Method not allowed' }, 405);
});
