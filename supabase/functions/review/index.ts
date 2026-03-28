import { corsResponse, json } from '../_shared/cors.ts';
import { userClient } from '../_shared/supabase.ts';
import { toReview } from '../_shared/review-mapper.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse();

  const supabase = userClient(req);
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return json({ error: 'id is required' }, 400);

  if (req.method === 'GET') {
    const { data, error } = await supabase.from('reviews').select('*').eq('id', id).single();
    if (error || !data) return json({ error: 'Not found' }, 404);
    return json(toReview(data as Record<string, unknown>));
  }

  if (req.method === 'PATCH') {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const { data: existing } = await supabase.from('reviews').select('user_id').eq('id', id).single();
    if (!existing || existing.user_id !== user.id) return json({ error: 'Forbidden' }, 403);

    let body: Record<string, unknown>;
    try { body = await req.json(); }
    catch { return json({ error: 'Invalid JSON' }, 400); }

    const updates: Record<string, unknown> = {};
    if (body.brandName !== undefined) updates.brand_name = body.brandName;
    if (body.title !== undefined) updates.title = body.title;
    if (body.productName !== undefined) updates.product_name = body.productName;
    if (body.price !== undefined) updates.price = body.price;
    if (body.episode !== undefined) updates.episode = body.episode;
    if (body.relationship !== undefined) updates.relationship = body.relationship;
    if (body.scene !== undefined) updates.scene = body.scene;
    if (body.category !== undefined) updates.category = body.category;
    if (body.productUrl !== undefined) updates.product_url = body.productUrl;
    if (body.rakutenUrl !== undefined) updates.rakuten_url = body.rakutenUrl;
    if (body.rakutenImageUrl !== undefined) updates.rakuten_image_url = body.rakutenImageUrl;
    if (body.rakutenItemName !== undefined) updates.rakuten_item_name = body.rakutenItemName;
    if (body.rakutenItemPrice !== undefined) updates.rakuten_item_price = body.rakutenItemPrice;
    if (body.images !== undefined) updates.images = body.images;
    if (body.imageUrl !== undefined) updates.image_url = body.imageUrl;

    const { data, error } = await supabase.from('reviews').update(updates).eq('id', id).select().single();
    if (error) return json({ error: error.message }, 500);
    return json(toReview(data as Record<string, unknown>));
  }

  if (req.method === 'DELETE') {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const { data: existing } = await supabase.from('reviews').select('user_id').eq('id', id).single();
    if (!existing || existing.user_id !== user.id) return json({ error: 'Forbidden' }, 403);

    const { error } = await supabase.from('reviews').delete().eq('id', id);
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true });
  }

  return json({ error: 'Method not allowed' }, 405);
});
