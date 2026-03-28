import { corsResponse, json } from '../_shared/cors.ts';
import { userClient } from '../_shared/supabase.ts';
import { toReview } from '../_shared/review-mapper.ts';
import { moderateImage } from '../_shared/moderate-image.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse();

  const supabase = userClient(req);
  const url = new URL(req.url);

  if (req.method === 'GET') {
    let query = supabase
      .from('reviews')
      .select('*')
      .eq('status', 'published')
      .order('created_at', { ascending: false });

    const scene = url.searchParams.get('scene');
    const relationship = url.searchParams.get('relationship');
    const category = url.searchParams.get('category');
    const gender = url.searchParams.get('gender');
    const ageGroup = url.searchParams.get('ageGroup');
    const q = url.searchParams.get('q');
    const userId = url.searchParams.get('userId');

    if (userId) query = query.eq('user_id', userId);
    if (scene) query = query.contains('scene', [scene]);
    if (relationship) query = query.contains('relationship', [relationship]);
    if (category) query = query.contains('category', [category]);
    if (gender) query = query.eq('gender', gender);
    if (ageGroup) query = query.eq('age_group', ageGroup);
    if (q) query = query.or(`title.ilike.%${q}%,product_name.ilike.%${q}%,episode.ilike.%${q}%`);

    const { data, error } = await query;
    if (error) return json({ error: error.message }, 500);
    return json((data ?? []).map(toReview));
  }

  if (req.method === 'POST') {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: 'Unauthorized' }, 401);

    let body: Record<string, unknown>;
    try { body = await req.json(); }
    catch { return json({ error: 'Invalid JSON' }, 400); }

    const required = ['title', 'productName', 'price', 'imageUrl', 'episode', 'gender', 'ageGroup'];
    for (const key of required) {
      if (!body[key]) return json({ error: `Missing field: ${key}` }, 400);
    }

    if (body.imageUrl && typeof body.imageUrl === 'string') {
      const { safe, reason } = await moderateImage(body.imageUrl);
      if (!safe) {
        const path = body.imageUrl.split('/review-images/')[1];
        if (path) await supabase.storage.from('review-images').remove([path]);
        return json({ error: reason ?? '不適切な画像が含まれています' }, 422);
      }
    }

    const { data: profile } = await supabase
      .from('profiles').select('display_name, icon_url').eq('id', user.id).single();

    const { data, error } = await supabase.from('reviews').insert({
      user_id: user.id,
      title: body.title,
      brand_name: body.brandName ?? null,
      product_name: body.productName,
      price: body.price,
      image_url: body.imageUrl,
      images: body.images ?? [],
      episode: body.episode,
      gender: body.gender,
      age_group: body.ageGroup,
      relationship: body.relationship ?? [],
      scene: body.scene ?? [],
      category: body.category ?? [],
      author_name: profile?.display_name ?? user.email?.split('@')[0] ?? 'ゲスト',
      author_icon: profile?.icon_url ?? '/icons/cat.png',
      product_id: body.productId ?? null,
      product_url: body.productUrl ?? null,
      rakuten_url: body.rakutenUrl ?? null,
      rakuten_image_url: body.rakutenImageUrl ?? null,
      rakuten_item_name: body.rakutenItemName ?? null,
      rakuten_item_price: body.rakutenItemPrice ?? null,
      status: 'published',
    }).select().single();

    if (error) return json({ error: error.message }, 500);
    return json(toReview(data as Record<string, unknown>), 201);
  }

  return json({ error: 'Method not allowed' }, 405);
});
