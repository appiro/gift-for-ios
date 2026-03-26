import { createClient } from '@/lib/supabase/server';
import { moderateImage } from '@/lib/moderateImage';
import type { NextRequest } from 'next/server';

function toReview(row: Record<string, unknown>) {
  return {
    id: row.id,
    title: row.title,
    productName: row.product_name,
    price: row.price,
    imageUrl: row.image_url,
    images: row.images ?? [],
    episode: row.episode,
    likes: row.likes ?? 0,
    wantCount: row.want_count ?? 0,
    giftCount: row.gift_count ?? 0,
    gender: row.gender,
    ageGroup: row.age_group,
    relationship: row.relationship ?? [],
    scene: row.scene ?? [],
    category: row.category ?? [],
    authorId: row.user_id,
    authorName: row.author_name,
    authorIcon: row.author_icon,
    createdAt: row.created_at,
    productUrl: row.product_url,
    amazonUrl: row.amazon_url,
    rakutenUrl: row.rakuten_url,
    rakutenImageUrl: row.rakuten_image_url,
    rakutenItemName: row.rakuten_item_name,
    rakutenItemPrice: row.rakuten_item_price,
    referencePrice: row.reference_price,
  };
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = request.nextUrl;

  let query = supabase
    .from('reviews')
    .select('*')
    .eq('status', 'published')
    .order('created_at', { ascending: false });

  const scene = searchParams.get('scene');
  const relationship = searchParams.get('relationship');
  const category = searchParams.get('category');
  const gender = searchParams.get('gender');
  const ageGroup = searchParams.get('ageGroup');
  const q = searchParams.get('q');

  const userId = searchParams.get('userId');

  if (userId) query = query.eq('user_id', userId);
  if (scene) query = query.contains('scene', [scene]);
  if (relationship) query = query.contains('relationship', [relationship]);
  if (category) query = query.contains('category', [category]);
  if (gender) query = query.eq('gender', gender);
  if (ageGroup) query = query.eq('age_group', ageGroup);
  if (q) query = query.or(`title.ilike.%${q}%,product_name.ilike.%${q}%,episode.ilike.%${q}%`);

  const { data, error } = await query;

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json((data ?? []).map(toReview));
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const required = ['title', 'productName', 'price', 'imageUrl', 'episode', 'gender', 'ageGroup'];
  for (const key of required) {
    if (!body[key]) {
      return Response.json({ error: `Missing field: ${key}` }, { status: 400 });
    }
  }

  // Moderate image content
  if (body.imageUrl && typeof body.imageUrl === 'string') {
    const { safe, reason } = await moderateImage(body.imageUrl);
    if (!safe) {
      // Delete the uploaded file from storage
      const path = body.imageUrl.toString().split('/review-images/')[1];
      if (path) await supabase.storage.from('review-images').remove([path]);
      return Response.json({ error: reason ?? '不適切な画像が含まれています' }, { status: 422 });
    }
  }

  // Fetch author profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, icon_url')
    .eq('id', user.id)
    .single();

  const { data, error } = await supabase
    .from('reviews')
    .insert({
      user_id: user.id,
      title: body.title,
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
    })
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(toReview(data as Record<string, unknown>), { status: 201 });
}
