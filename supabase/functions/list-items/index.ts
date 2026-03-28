import { corsResponse, json } from '../_shared/cors.ts';
import { userClient } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse();

  const supabase = userClient(req);
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return json({ error: 'id is required' }, 400);

  if (req.method === 'GET') {
    const { data, error } = await supabase.from('list_items')
      .select('id, review_id, position, snapshot_title, snapshot_product_name, snapshot_image_url, snapshot_author_name, comment')
      .eq('list_id', id).order('position', { ascending: true });
    if (error) return json({ error: error.message }, 500);
    return json(data ?? []);
  }

  if (req.method === 'POST') {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const { data: list } = await supabase.from('lists').select('user_id').eq('id', id).single();
    if (!list || list.user_id !== user.id) return json({ error: 'Forbidden' }, 403);

    let body: { review_id?: string };
    try { body = await req.json(); }
    catch { return json({ error: 'Invalid body' }, 400); }

    const { review_id } = body;
    if (!review_id) return json({ error: 'review_id is required' }, 400);

    const { data: review, error: reviewError } = await supabase.from('reviews')
      .select('title, product_name, image_url, author_name').eq('id', review_id).single();
    if (reviewError || !review) return json({ error: 'Review not found' }, 404);

    const { data: maxPositionRow } = await supabase.from('list_items').select('position')
      .eq('list_id', id).order('position', { ascending: false }).limit(1).single();
    const nextPosition = maxPositionRow ? maxPositionRow.position + 1 : 1;

    const { data: item, error: insertError } = await supabase.from('list_items').insert({
      list_id: id, review_id, position: nextPosition,
      snapshot_title: review.title, snapshot_product_name: review.product_name,
      snapshot_image_url: review.image_url, snapshot_author_name: review.author_name,
      comment: '',
    }).select().single();

    if (insertError) return json({ error: insertError.message }, 500);
    return json(item, 201);
  }

  return json({ error: 'Method not allowed' }, 405);
});
